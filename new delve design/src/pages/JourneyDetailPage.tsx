import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  MapPin,
  Clock,
  Users,
  Eye,
  AlertCircle,
  Car,
  Pencil,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  MoreHorizontal,
  GripVertical,
  Upload,
  GitFork,
  DollarSign,
  Tag,
  Sparkles,
  Loader2,
  Calendar,
  UserPlus,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { JourneyDetail, MediaAssetDto, UpdateJourneyBody } from '@delve/contracts'
import {
  addJourneyComment,
  fetchJourney,
  fetchJourneyComments,
  forkJourney,
  likeJourney,
  unlikeJourney,
  updateJourney,
  reorderJourneyStops,
} from '../api/journeyClient'
import { saveItem, unsaveItem } from '../api/socialClient'
import { getStoredUser, AuthApiError } from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'
import JourneyEditorSheet from '../components/journeys/JourneyEditorSheet'
import JourneyCoverMedia from '../components/journeys/JourneyCoverMedia'
import { DoubleTapLike } from '../components/delvers/DoubleTapLike'
import JourneyStopMediaGallery from '../components/journeys/JourneyStopMediaGallery'
import JourneyDetailSkeleton from '../components/journeys/JourneyDetailSkeleton'
import CommentsSheet from '../components/comments/CommentsSheet'
import { deriveJourneyLifecycle, lifecycleLabel } from '../components/journeys/journeyLifecycle'
import { mapJourneyComment } from '../components/comments/mappers'
import ContentReportSheet from '../components/safety/ContentReportSheet'
import CollaboratorInviteModal from '../components/journeys/CollaboratorInviteModal'
import MediaStudio from './MediaStudio'

interface Props {
  journeyId: string
  signedIn?: boolean
  onBack: () => void
  onSignIn?: () => void
  onOpenProfile?: (username: string) => void
  onOpenGroupChat?: (journeyId: string) => void
  onOpenEvent?: (eventId: string) => void
  onSharedToDelvers?: () => void
  onForked?: (clonedJourneyId: string) => void
}

function partyLabel(p: JourneyDetail['partyType']) {
  return p.charAt(0) + p.slice(1).toLowerCase()
}

export default function JourneyDetailPage({
  journeyId,
  signedIn = false,
  onBack,
  onSignIn,
  onOpenProfile,
  onOpenGroupChat,
  onOpenEvent,
  onSharedToDelvers,
  onForked,
}: Props) {
  const [journey, setJourney] = useState<JourneyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [forking, setForking] = useState(false)
  const [uploadStopId, setUploadStopId] = useState<string | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const viewerId = getStoredUser()?.id
  const isOwner = Boolean(journey && viewerId && journey.author.id === viewerId)

  // Configure PointerSensor with distance constraint to prevent accidental mobile scroll drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const j = await fetchJourney(journeyId)
      setJourney(j)
      setSaved(j.savedByMe)
      setLiked(j.likedByMe)
    } catch (err) {
      setJourney(null)
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not load journey')
    } finally {
      setLoading(false)
    }
  }, [journeyId])

  useEffect(() => {
    void load()
  }, [load])

  // Structured data — schema.org/TravelAction
  useEffect(() => {
    if (!journey) return
    const script = document.createElement('script')
    script.id = `journey-ld-${journey.id}`
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TravelAction',
      name: journey.title,
      description: journey.summary || `${journey.startPlace} → ${journey.endPlace}`,
      image: journey.coverUrl || undefined,
      agent: {
        '@type': 'Person',
        name: journey.author.displayName || journey.author.username,
        identifier: journey.author.username,
      },
      ...(journey.startDate ? { startTime: journey.startDate } : {}),
      ...(journey.endDate ? { endTime: journey.endDate } : {}),
      location: journey.startPlace
        ? { '@type': 'Place', name: journey.startPlace }
        : undefined,
    })
    document.head.appendChild(script)
    return () => {
      document.getElementById(`journey-ld-${journey.id}`)?.remove()
    }
  }, [journey])

  const loadJourneyComments = useCallback(async () => {
    const rows = await fetchJourneyComments(journeyId)
    return rows.map(mapJourneyComment)
  }, [journeyId])

  const submitJourneyComment = useCallback(
    async (body: string) => {
      const created = await addJourneyComment(journeyId, body)
      return mapJourneyComment(created)
    },
    [journeyId],
  )

  async function toggleSave() {
    if (!journey) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setSaveBusy(true)
    try {
      if (saved) {
        await unsaveItem({ targetType: 'JOURNEY', targetId: journey.id })
        setSaved(false)
        setJourney(j => (j ? { ...j, saveCount: Math.max(0, j.saveCount - 1), savedByMe: false } : j))
      } else {
        await saveItem({ targetType: 'JOURNEY', targetId: journey.id })
        setSaved(true)
        setJourney(j => (j ? { ...j, saveCount: j.saveCount + 1, savedByMe: true } : j))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update save')
    } finally {
      setSaveBusy(false)
    }
  }

  async function toggleLike() {
    if (!journey) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setLikeBusy(true)
    try {
      if (liked) {
        await unlikeJourney(journey.id)
        setLiked(false)
        setJourney(j => (j ? { ...j, likeCount: Math.max(0, j.likeCount - 1), likedByMe: false } : j))
      } else {
        await likeJourney(journey.id)
        setLiked(true)
        setJourney(j => (j ? { ...j, likeCount: j.likeCount + 1, likedByMe: true } : j))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update reaction')
    } finally {
      setLikeBusy(false)
    }
  }

  async function likeFromDoubleTap() {
    if (!liked && !likeBusy) {
      await toggleLike()
    }
  }

  async function handleFork() {
    if (!journey) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setForking(true)
    try {
      const cloned = await forkJourney(journey.id)
      if (onForked) {
        onForked(cloned.id)
      } else {
        setJourney(cloned)
        setShareNote('Journey duplicated successfully!')
        setTimeout(() => setShareNote(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate journey')
    } finally {
      setForking(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !journey) return

    const oldIndex = journey.stops.findIndex(s => s.id === active.id)
    const newIndex = journey.stops.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    // Optimistic UI state update using arrayMove
    const reorderedStops = arrayMove(journey.stops, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      sortOrder: idx + 1,
    }))

    setJourney(j => (j ? { ...j, stops: reorderedStops } : j))

    // Prepare payload for backend transaction
    const payload = reorderedStops.map((s, idx) => ({
      stopId: s.id,
      orderIndex: idx + 1,
    }))

    try {
      await reorderJourneyStops(journey.id, payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save reordered stops')
      void load()
    }
  }

  async function handleStopMediaUpload(assets: MediaAssetDto[]) {
    if (!journey || !uploadStopId || assets.length === 0) {
      setUploadStopId(null)
      return
    }
    try {
      const newUrls = assets.map(a => a.delivery?.url || '').filter(Boolean)
      const newTypes = assets.map(a => (a.resourceType === 'video' ? 'video' : 'image'))
      
      const updatedStops = journey.stops.map(s => {
        if (s.id === uploadStopId) {
          return {
            place: s.place,
            region: s.region,
            arrivalDay: s.arrivalDay,
            durationDays: s.durationDays,
            notes: s.notes,
            highlights: s.highlights,
            mediaUrls: [...s.mediaUrls, ...newUrls],
            mediaResourceTypes: [...(s.mediaResourceTypes || []), ...newTypes],
            transportModeToNext: s.transportModeToNext,
            transportDurationToNext: s.transportDurationToNext,
            transportNotes: s.transportNotes,
            historicalCostHint: s.historicalCostHint,
          }
        }
        return {
          place: s.place,
          region: s.region,
          arrivalDay: s.arrivalDay,
          durationDays: s.durationDays,
          notes: s.notes,
          highlights: s.highlights,
          mediaUrls: s.mediaUrls,
          mediaResourceTypes: s.mediaResourceTypes,
          transportModeToNext: s.transportModeToNext,
          transportDurationToNext: s.transportDurationToNext,
          transportNotes: s.transportNotes,
          historicalCostHint: s.historicalCostHint,
        }
      })

      const body: UpdateJourneyBody = {
        title: journey.title,
        summary: journey.summary,
        coverUrl: journey.coverUrl,
        coverResourceType: journey.coverResourceType,
        startDate: journey.startDate ?? null,
        endDate: journey.endDate ?? null,
        status: journey.status,
        isOngoing: journey.isOngoing,
        startPlace: journey.startPlace,
        endPlace: journey.endPlace,
        durationDays: journey.durationDays,
        countries: journey.countries,
        transportModes: journey.transportModes,
        historicalCost: journey.historicalCost,
        currency: journey.currency,
        partyType: journey.partyType,
        tags: journey.tags,
        visibility: journey.visibility,
        takeaway: journey.takeaway,
        stops: updatedStops,
      }

      const updated = await updateJourney(journey.id, body)
      setJourney(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload stop media')
    } finally {
      setUploadStopId(null)
    }
  }

  // Calculate estimated total for planning state
  const estimatedPlanningTotal = useMemo(() => {
    if (!journey) return 0
    let total = 0
    let hasHints = false
    for (const stop of journey.stops) {
      if (stop.historicalCostHint) {
        const num = parseFloat(stop.historicalCostHint.replace(/[^0-9.]/g, ''))
        if (!isNaN(num) && num > 0) {
          total += num
          hasHints = true
        }
      }
    }
    if (!hasHints && journey.historicalCost) {
      const overall = parseFloat(journey.historicalCost.replace(/[^0-9.]/g, ''))
      if (!isNaN(overall)) return overall
    }
    return total
  }, [journey])

  if (loading) {
    return <JourneyDetailSkeleton />
  }

  if (error || !journey) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-sm text-neutral-400 mb-4">{error || 'Journey not found'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-semibold mr-4 text-indigo-400 hover:underline"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-neutral-400 hover:text-white"
        >
          Back to Journeys
        </button>
      </div>
    )
  }

  const effectiveStatus = journey.status || deriveJourneyLifecycle(journey)
  const isPlanning = effectiveStatus === 'PLANNING'
  const isActive = effectiveStatus === 'ACTIVE'
  const isCompleted = effectiveStatus === 'COMPLETED'
  const isOngoing = Boolean(journey.isOngoing)

  // Reverse stops order in ongoing active state so newest stop is on top
  const renderedStops = isOngoing && isActive ? [...journey.stops].reverse() : journey.stops

  return (
    <div className="pb-16 max-w-4xl mx-auto">
      {/* Top Navigation Bar */}
      <div className="px-4 sm:px-0 pt-3 pb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          aria-label="Back to Journeys list"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2">
          {/* Duplicate / Fork Journey Button */}
          <button
            type="button"
            disabled={forking}
            onClick={handleFork}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-white transition-all border border-white/10 shadow-sm"
            title="Fork this itinerary into your private workspace"
          >
            {forking ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <GitFork size={15} className="text-indigo-400" />
            )}
            <span>Duplicate Journey</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all"
              aria-label="Edit journey details"
            >
              <Pencil size={15} /> Edit
            </button>
          )}

          {/* More actions menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen(v => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all"
              aria-label="More options"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={20} />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div
                  className="absolute right-0 top-12 z-50 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl min-w-[200px]"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false)
                      navigator.clipboard.writeText(window.location.href)
                      setShareNote('Link copied to clipboard!')
                      setTimeout(() => setShareNote(null), 2500)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left text-neutral-300 hover:bg-white/5 border-b border-white/10"
                    role="menuitem"
                  >
                    <Share2 size={15} className="text-neutral-400" /> Share link
                  </button>
                  {onOpenGroupChat && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!signedIn) {
                          onSignIn?.()
                          setMoreOpen(false)
                          return
                        }
                        onOpenGroupChat(journey.id)
                        setMoreOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left text-neutral-300 hover:bg-white/5 border-b border-white/10"
                      role="menuitem"
                    >
                      <MessageCircle size={15} className="text-neutral-400" /> Group chat
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!signedIn) {
                        onSignIn?.()
                        setMoreOpen(false)
                        return
                      }
                      setReportOpen(true)
                      setMoreOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left text-red-400 hover:bg-red-500/10"
                    role="menuitem"
                  >
                    <Flag size={15} /> Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero Cover */}
      <div className="relative h-60 sm:h-80 sm:rounded-3xl overflow-hidden bg-black/40 border border-white/10">
        <DoubleTapLike onDoubleLike={() => void likeFromDoubleTap()} className="h-full w-full">
          {journey.coverUrl || journey.media[0] ? (
            <JourneyCoverMedia
              url={journey.coverUrl || journey.media[0]!}
              resourceType={journey.coverResourceType}
              className="w-full h-full object-cover"
              alt={journey.title}
              variant="hero"
              priority="high"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin size={36} className="text-neutral-500" />
            </div>
          )}
        </DoubleTapLike>
      </div>

      {/* Social Action Bar */}
      <div className="px-4 sm:px-0 py-3 flex items-center gap-5 border-b border-white/10">
        <button
          type="button"
          disabled={likeBusy}
          onClick={() => void toggleLike()}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
            liked ? 'text-red-500' : 'text-neutral-300 hover:text-white'
          }`}
          aria-label={liked ? 'Unlike journey' : 'Like journey'}
        >
          <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
          <span>{journey.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-300 hover:text-white transition-colors"
          aria-label="Comments"
        >
          <MessageCircle size={20} />
          <span>{journey.commentCount}</span>
        </button>
        {shareNote && <p className="text-xs text-indigo-400 m-0 animate-pulse">{shareNote}</p>}
        <button
          type="button"
          disabled={saveBusy}
          onClick={() => void toggleSave()}
          className={`ml-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
            saved ? 'text-indigo-400' : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Task 1: The Logistics Snapshot Card */}
      <div className="px-4 sm:px-0 mt-4">
        <div className="bg-neutral-900 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Total Cost */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign size={16} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">Total Cost</span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {journey.historicalCost ? `${journey.currency} ${journey.historicalCost}` : 'Flexible / TBD'}
                </span>
              </div>
            </div>

            {/* Duration / Ongoing Badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                {isOngoing ? <Calendar size={16} /> : <Clock size={16} />}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">Timeline</span>
                {isOngoing ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Ongoing • Since {new Date(journey.startDate || journey.createdAt).getFullYear()}
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {journey.durationDays || journey.stops.length} Days · {journey.stopCount} Stops
                  </span>
                )}
              </div>
            </div>

            {/* Party Size */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users size={16} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">Party Size</span>
                <span className="text-xs sm:text-sm font-bold text-white">{partyLabel(journey.partyType)}</span>
              </div>
            </div>
          </div>

          {/* Standardized Tags */}
          {journey.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {journey.tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-neutral-300"
                >
                  <Tag size={10} className="text-indigo-400" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Details */}
      <div className="px-4 sm:px-0 pt-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            {effectiveStatus}
          </span>
          {isOngoing && (
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              Live Ongoing
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white m-0 mb-2 tracking-tight">
          {journey.title}
        </h1>

        <p className="text-sm text-neutral-400 m-0 mb-4 leading-relaxed">
          {journey.summary || `${journey.startPlace} → ${journey.endPlace}`}
        </p>

        {/* Task 1: Author & Co-Authors Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-2 rounded-2xl bg-white/[0.03] border border-white/5">
          <button
            type="button"
            onClick={() => onOpenProfile?.(journey.author.username)}
            className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
          >
            {journey.author.avatarUrl ? (
              <img
                src={journey.author.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-sm font-bold text-indigo-300 border border-indigo-500/30">
                {journey.author.username[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white m-0">
                {journey.author.displayName || formatUsername(journey.author.username)}
              </p>
              <p className="text-xs text-neutral-400 m-0">@{journey.author.username} · Creator</p>
            </div>
          </button>

          {/* Co-Authors Cluster & Invite Trigger */}
          <div className="flex items-center gap-2">
            {journey.collaborators && journey.collaborators.length > 0 && (
              <div className="flex items-center -space-x-2.5">
                {journey.collaborators.map(c => (
                  <div
                    key={c.id || c.userId}
                    title={`${c.displayName || c.username} (${c.role})`}
                    className="relative shrink-0"
                  >
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.displayName}
                        className="w-8 h-8 rounded-full object-cover border-2 border-neutral-900 ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-600/40 border-2 border-neutral-900 flex items-center justify-center text-xs font-bold text-purple-200">
                        {(c.displayName || c.username)[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Invite Button (Active in PLANNING state) */}
            {isPlanning && (
              <button
                type="button"
                onClick={() => {
                  if (!signedIn) {
                    onSignIn?.()
                    return
                  }
                  setInviteModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
                title="Invite Co-Authors to plan together"
              >
                <UserPlus size={14} />
                <span>Invite</span>
              </button>
            )}
          </div>
        </div>

        {/* Takeaway Advice */}
        {journey.takeaway && (
          <div className="rounded-2xl p-4 mb-6 bg-indigo-950/40 border border-indigo-500/30 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 m-0 mb-1 flex items-center gap-1.5">
              <Sparkles size={13} /> Creator Takeaway & Advice
            </p>
            <p className="text-sm text-neutral-200 m-0 leading-relaxed">{journey.takeaway}</p>
          </div>
        )}

        {/* Timeline Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white m-0 tracking-tight">
            Itinerary Timeline {isOngoing && isActive ? '(Newest on top)' : ''}
          </h2>
          <span className="text-xs text-neutral-400">
            {renderedStops.length} stop{renderedStops.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Timeline Layout with DndContext & SortableContext */}
        <div className="relative space-y-4" role="list">
          {/* Vertical timeline line */}
          <div
            className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-indigo-500 via-indigo-500/40 to-transparent rounded-full pointer-events-none"
            aria-hidden="true"
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={renderedStops.map(s => s.id)}
              strategy={verticalListSortingStrategy}
              disabled={!isPlanning}
            >
              {renderedStops.map((stop, i) => {
                const stopIndex = journey.stops.findIndex(s => s.id === stop.id)
                const displayIndex = stopIndex >= 0 ? stopIndex + 1 : i + 1

                return (
                  <SortableStopItem
                    key={stop.id}
                    stop={stop}
                    displayIndex={displayIndex}
                    isPlanning={isPlanning}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    signedIn={signedIn}
                    onSignIn={onSignIn}
                    onUploadClick={stopId => setUploadStopId(stopId)}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Task 2: PLANNING State Sticky Footer */}
      {isPlanning && (
        <div className="sticky bottom-4 z-30 mx-4 sm:mx-0 mt-6 p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-indigo-500/30 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Workspace Estimate
              </span>
              <span className="text-sm font-extrabold text-white">
                Estimated Total: {journey.currency} {estimatedPlanningTotal.toLocaleString()}
              </span>
            </div>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
            >
              Edit Itinerary
            </button>
          )}
        </div>
      )}

      {/* Comments Drawer */}
      <CommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        title="Comments"
        subtitle={journey.title}
        emptyMessage="No comments yet. Be the first to ask a question or share a tip."
        signedIn={signedIn}
        onSignIn={onSignIn}
        onOpenProfile={onOpenProfile}
        fetchComments={loadJourneyComments}
        submitComment={submitJourneyComment}
        onCommentAdded={() => {
          setJourney(j => (j ? { ...j, commentCount: j.commentCount + 1 } : j))
        }}
      />

      {/* Edit Journey Sheet */}
      <JourneyEditorSheet
        open={editOpen}
        mode="edit"
        initial={journey}
        signedIn={signedIn}
        onClose={() => setEditOpen(false)}
        onSignIn={onSignIn}
        onSaved={j => {
          setJourney(j)
          setSaved(j.savedByMe)
          setLiked(j.likedByMe)
          setEditOpen(false)
        }}
      />

      {/* Content Safety Report Sheet */}
      <ContentReportSheet
        open={reportOpen}
        targetType="JOURNEY"
        targetId={journey.id}
        onClose={() => setReportOpen(false)}
      />

      {/* Stop Media Upload Modal */}
      {uploadStopId !== null && (
        <MediaStudio
          open={uploadStopId !== null}
          onClose={() => setUploadStopId(null)}
          onMediaReady={handleStopMediaUpload}
        />
      )}

      {/* Task 2 & 3: Collaborator Invite Modal */}
      <CollaboratorInviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        journeyId={journey.id}
        existingCollaborators={journey.collaborators}
        onCollaboratorAdded={collab => {
          setJourney(j =>
            j
              ? {
                  ...j,
                  collaborators: [...(j.collaborators || []), collab],
                }
              : j,
          )
          setShareNote(`Invited @${collab.username} as ${collab.role}`)
          setTimeout(() => setShareNote(null), 3000)
        }}
      />
    </div>
  )
}

/** Task 2: Sub-component `<SortableStopItem>` with strict handle listeners */
function SortableStopItem({
  stop,
  displayIndex,
  isPlanning,
  isActive,
  isCompleted,
  signedIn,
  onSignIn,
  onUploadClick,
}: {
  stop: JourneyDetail['stops'][number]
  displayIndex: number
  isPlanning: boolean
  isActive: boolean
  isCompleted: boolean
  signedIn: boolean
  onSignIn?: () => void
  onUploadClick: (stopId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !isPlanning,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.75 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex gap-4 items-start"
      role="listitem"
    >
      {/* Numbered timeline dot with Planning Grip */}
      <div className="flex-shrink-0 relative z-10 flex items-center gap-1">
        {isPlanning && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="text-neutral-500 cursor-grab active:cursor-grabbing hover:text-white p-1 rounded-lg touch-none bg-transparent border-0"
            title="Drag to reorder stop"
            aria-label={`Drag stop ${displayIndex} to reorder`}
          >
            <GripVertical size={16} />
          </button>
        )}
        <div className="w-10 h-10 rounded-2xl bg-neutral-900 border-2 border-indigo-500 flex items-center justify-center text-sm font-bold text-indigo-400 shadow-md">
          {displayIndex}
        </div>
      </div>

      {/* Stop Card */}
      <article className="flex-1 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg min-w-0">
        {/* Media Gallery (Hidden in Planning state; Strict aspect-video in Completed state) */}
        {!isPlanning && (
          <JourneyStopMediaGallery
            mediaUrls={stop.mediaUrls}
            mediaResourceTypes={stop.mediaResourceTypes}
            aspectVideo={isCompleted}
          />
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-400">Day {stop.arrivalDay}</span>
            {stop.historicalCostHint && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-white/5 text-neutral-300 border border-white/5">
                {stop.historicalCostHint}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-white m-0">
              {stop.place}
              {stop.region ? <span className="text-neutral-400 font-normal"> · {stop.region}</span> : ''}
            </h3>
            {stop.notes && (
              <p className="text-sm text-neutral-300 m-0 mt-1.5 leading-relaxed">{stop.notes}</p>
            )}
          </div>

          {stop.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {stop.highlights.map(h => (
                <span
                  key={h}
                  className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-neutral-300 border border-white/5"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          )}

          {/* Transport connector hint */}
          {stop.transportModeToNext && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 pt-1">
              <Car size={13} className="text-indigo-400" />
              <span>
                To next: {stop.transportModeToNext}
                {stop.transportDurationToNext ? ` · ${stop.transportDurationToNext}` : ''}
              </span>
            </div>
          )}

          {/* Task 3: ACTIVE Massive Full-Width Upload Button */}
          {isActive && (
            <button
              type="button"
              onClick={() => {
                if (!signedIn) {
                  onSignIn?.()
                  return
                }
                onUploadClick(stop.id)
              }}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <Upload size={16} /> Upload Media to Stop {displayIndex}
            </button>
          )}
        </div>
      </article>
    </div>
  )
}
