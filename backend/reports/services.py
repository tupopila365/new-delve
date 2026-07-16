"""Apply admin moderation actions for reports and content."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.utils import timezone

from reports.models import Report, ReportAction, ReportTargetType

User = get_user_model()

LISTING_QUESTION_TARGET_TYPES = (
    ReportTargetType.EVENT_QUESTION,
    ReportTargetType.VEHICLE_QUESTION,
    ReportTargetType.BUS_TRIP_QUESTION,
    ReportTargetType.JOURNEY_QUESTION,
)

LISTING_QUESTION_MODELS: dict[str, tuple[str, str]] = {
    ReportTargetType.EVENT_QUESTION: ("events_app.models", "EventQuestion"),
    ReportTargetType.VEHICLE_QUESTION: ("transport.models", "VehicleQuestion"),
    ReportTargetType.BUS_TRIP_QUESTION: ("transport.models", "BusTripQuestion"),
    ReportTargetType.JOURNEY_QUESTION: ("journeys.models", "JourneyQuestion"),
}


def _target_user(report: Report) -> User | None:
    if report.target_type == ReportTargetType.USER:
        return User.objects.filter(pk=report.target_id).first()
    if report.target_type == ReportTargetType.POST:
        from social.models import Post

        post = Post.objects.filter(pk=report.target_id).select_related("author").first()
        return post.author if post else None
    if report.target_type == ReportTargetType.COMMENT:
        from social.models import Comment

        comment = Comment.objects.filter(pk=report.target_id).select_related("author").first()
        return comment.author if comment else None
    if report.target_type == ReportTargetType.MESSAGE:
        from messaging.models import Message

        msg = Message.objects.filter(pk=report.target_id).select_related("sender").first()
        return msg.sender if msg else None
    if report.target_type == ReportTargetType.CONVERSATION:
        from messaging.models import Conversation

        conv = Conversation.objects.filter(pk=report.target_id).prefetch_related("participants").first()
        if not conv:
            return None
        reporter_id = report.reporter_id
        return conv.participants.exclude(pk=reporter_id).first()
    if report.target_type == ReportTargetType.JOURNEY:
        from journeys.models import Journey

        journey = Journey.objects.filter(pk=report.target_id).select_related("author").first()
        return journey.author if journey else None
    if report.target_type == ReportTargetType.JOURNEY_QUESTION:
        from journeys.models import JourneyQuestion

        question = JourneyQuestion.objects.filter(pk=report.target_id).select_related("author").first()
        return question.author if question else None
    return None


def apply_report_action(report: Report, action: str, *, actor: User) -> None:
    allowed = {c[0] for c in ReportAction.choices if c[0]}
    if action not in allowed:
        raise ValueError(f"action must be one of: {', '.join(sorted(allowed - {''}))}")

    if action == ReportAction.SUSPEND:
        user = _target_user(report)
        if not user:
            raise ValueError("Could not resolve user to suspend for this report.")
        if user.pk == actor.pk:
            raise ValueError("You cannot suspend your own account.")
        user.is_active = False
        user.save(update_fields=["is_active"])

    elif action == ReportAction.WARN:
        pass

    elif action == ReportAction.REMOVE_CONTENT:
        if report.target_type in (
            ReportTargetType.POST,
            ReportTargetType.COMMENT,
            ReportTargetType.JOURNEY,
            *LISTING_QUESTION_TARGET_TYPES,
        ):
            set_content_hidden(report.target_type, report.target_id, hidden=True, reason=report.admin_notes)
        else:
            raise ValueError("Content removal only applies to posts, comments, journeys, and listing questions.")

    elif action == ReportAction.RESTORE_CONTENT:
        set_content_hidden(report.target_type, report.target_id, hidden=False, reason=report.admin_notes)


def set_content_hidden(target_type: str, target_id: str, *, hidden: bool, reason: str = "") -> None:
    if target_type == ReportTargetType.POST:
        from social.models import Post

        post = Post.objects.filter(pk=target_id).first()
        if not post:
            raise ValueError("Post not found.")
        post.is_hidden = hidden
        post.moderation_reason = reason if hidden else ""
        post.save(update_fields=["is_hidden", "moderation_reason", "updated_at"])
        return

    if target_type == ReportTargetType.COMMENT:
        from social.models import Comment

        comment = Comment.objects.filter(pk=target_id).first()
        if not comment:
            raise ValueError("Comment not found.")
        comment.is_hidden = hidden
        comment.moderation_reason = reason if hidden else ""
        comment.save(update_fields=["is_hidden", "moderation_reason"])
        return

    if target_type in LISTING_QUESTION_MODELS:
        module_path, model_name = LISTING_QUESTION_MODELS[target_type]
        from importlib import import_module

        model = getattr(import_module(module_path), model_name)
        question = model.objects.filter(pk=target_id).first()
        if not question:
            raise ValueError("Question not found.")
        question.is_hidden = hidden
        if hasattr(question, "moderation_reason"):
            question.moderation_reason = reason if hidden else ""
        update_fields = ["is_hidden"]
        if hasattr(question, "moderation_reason"):
            update_fields.append("moderation_reason")
        if hasattr(question, "updated_at"):
            update_fields.append("updated_at")
        question.save(update_fields=update_fields)
        return

    if target_type == ReportTargetType.JOURNEY:
        from journeys.models import Journey

        journey = Journey.objects.filter(pk=target_id).first()
        if not journey:
            raise ValueError("Journey not found.")
        journey.is_hidden = hidden
        journey.moderation_reason = reason if hidden else ""
        journey.save(update_fields=["is_hidden", "moderation_reason", "updated_at"])
        return

    raise ValueError("Moderation only supported for posts, comments, journeys, and listing questions.")


def list_flagged_content() -> list[dict]:
    from social.models import Comment, Post

    items: list[dict] = []

    for post in Post.objects.filter(is_hidden=True).select_related("author")[:50]:
        items.append(
            {
                "id": f"post-{post.pk}",
                "target_type": "post",
                "target_id": str(post.pk),
                "title": (post.body or "Delvers post")[:80],
                "author": post.author.username,
                "author_id": post.author_id,
                "status": "hidden",
                "reason": post.moderation_reason,
                "date": post.updated_at.isoformat(),
            }
        )

    for comment in Comment.objects.filter(is_hidden=True).select_related("author", "post")[:50]:
        items.append(
            {
                "id": f"comment-{comment.pk}",
                "target_type": "comment",
                "target_id": str(comment.pk),
                "title": comment.body[:80],
                "author": comment.author.username,
                "author_id": comment.author_id,
                "status": "hidden",
                "reason": comment.moderation_reason,
                "date": comment.created_at.isoformat(),
            }
        )

    from importlib import import_module

    for target_type, (module_path, model_name) in LISTING_QUESTION_MODELS.items():
        model = getattr(import_module(module_path), model_name)
        label = dict(ReportTargetType.choices).get(target_type, "Question")
        for question in model.objects.filter(is_hidden=True).select_related("author")[:20]:
            reason = getattr(question, "moderation_reason", "") or ""
            items.append(
                {
                    "id": f"{target_type}-{question.pk}",
                    "target_type": target_type,
                    "target_id": str(question.pk),
                    "title": (question.body or label)[:80],
                    "author": question.author.username,
                    "author_id": question.author_id,
                    "status": "hidden",
                    "reason": reason,
                    "date": question.created_at.isoformat(),
                }
            )

    from journeys.models import Journey

    for journey in Journey.objects.filter(is_hidden=True).select_related("author")[:30]:
        items.append(
            {
                "id": f"journey-{journey.pk}",
                "target_type": ReportTargetType.JOURNEY,
                "target_id": str(journey.pk),
                "title": journey.title[:80],
                "author": journey.author.username,
                "author_id": journey.author_id,
                "status": "hidden",
                "reason": journey.moderation_reason,
                "date": journey.updated_at.isoformat(),
            }
        )

    reported = (
        Report.objects.filter(
            target_type__in=[
                ReportTargetType.POST,
                ReportTargetType.COMMENT,
                ReportTargetType.JOURNEY,
                *LISTING_QUESTION_TARGET_TYPES,
            ],
            status__in=["new", "under_review", "escalated"],
        )
        .select_related("reporter")
        .order_by("-created_at")[:50]
    )
    seen = {(i["target_type"], i["target_id"]) for i in items}
    for r in reported:
        key = (r.target_type, r.target_id)
        if key in seen:
            continue
        author_id = None
        if r.target_type == ReportTargetType.POST:
            author_id = Post.objects.filter(pk=r.target_id).values_list("author_id", flat=True).first()
        elif r.target_type == ReportTargetType.COMMENT:
            author_id = Comment.objects.filter(pk=r.target_id).values_list("author_id", flat=True).first()
        elif r.target_type == ReportTargetType.JOURNEY:
            from journeys.models import Journey

            author_id = Journey.objects.filter(pk=r.target_id).values_list("author_id", flat=True).first()
        items.append(
            {
                "id": f"report-{r.pk}",
                "target_type": r.target_type,
                "target_id": r.target_id,
                "title": r.target_label or f"{r.get_reason_display()}",
                "author": r.reporter.username,
                "author_id": author_id,
                "status": "reported",
                "reason": r.description or r.get_reason_display(),
                "date": r.created_at.isoformat(),
                "report_id": r.pk,
                "severity": r.severity,
            }
        )

    return items


class _ModerateContentNamespace:
    set_content_hidden = staticmethod(set_content_hidden)
    list_flagged_content = staticmethod(list_flagged_content)


moderate_content = _ModerateContentNamespace()
