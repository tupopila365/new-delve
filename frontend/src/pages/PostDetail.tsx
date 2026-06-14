import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { IgPostCard, type FeedPost } from '../components/IgPostCard'
import { DetailSkeleton } from '../components/detail'
import { EmptyState } from '../components/ui'
import '../post-detail-social-connect.css'

export function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const postId = Number(id)
  const validId = Number.isFinite(postId) && postId > 0

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiFetch<FeedPost>(`/api/social/posts/${postId}/`, { auth: false }),
    enabled: validId,
    retry: false,
  })

  const {
    data: similarRaw,
    isLoading: similarLoading,
    isError: similarError,
  } = useQuery({
    queryKey: ['post-similar', postId],
    queryFn: () => apiFetch<FeedPost[]>(`/api/social/posts/${postId}/similar/`),
    enabled: validId && Boolean(data),
    retry: false,
  })

  const similarPosts = useMemo(() => {
    const rows = similarRaw ?? []
    return rows.filter((p) => p.id !== postId)
  }, [similarRaw, postId])

  const notFound = error instanceof ApiError && error.status === 404
  const hasBackdrop = Boolean(data?.video || data?.image)
  const backdropSrc = data?.video
    ? mediaUrl(data.video)
    : data?.image
      ? mediaUrl(data.image)
      : undefined

  const showSimilarRail =
    validId &&
    Boolean(data) &&
    !notFound &&
    !similarError &&
    (similarLoading || similarPosts.length > 0)

  return (
    <div
      className={
        hasBackdrop ? 'post-detail-page post-detail-page--immersive' : 'post-detail-page'
      }
    >
      {hasBackdrop && backdropSrc ? (
        <div className="post-detail-page__backdrop" aria-hidden>
          {data?.video ? (
            <video
              className="post-detail-page__backdrop-media"
              src={backdropSrc}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
            />
          ) : (
            <img className="post-detail-page__backdrop-media" src={backdropSrc} alt="" />
          )}
          <div className="post-detail-page__backdrop-scrim" />
        </div>
      ) : null}

      <div className="post-detail-page__inner">
        <div className="post-detail-page__bar">
          <button type="button" className="post-detail-page__back" onClick={() => navigate(-1)} aria-label="Go back">
            ← Back
          </button>
          <Link to="/delvers" className="post-detail-page__home">
            Delvers
          </Link>
        </div>

        {!validId && (
          <p className="page-sub" role="alert">
            Invalid post link.{' '}
            <Link to="/delvers">Return to Delvers</Link>
          </p>
        )}

        {validId && isLoading && <DetailSkeleton className="post-detail-page__skeleton" />}

        {validId && notFound && (
          <EmptyState
            icon="📸"
            title="Post not found"
            sub="It may have been removed, or the link is wrong."
            cta={{ label: 'Browse Delvers', to: '/delvers' }}
            action={
              <Link to="/" className="btn btn-ghost">
                Home
              </Link>
            }
          />
        )}

        {validId && error && !notFound && (
          <EmptyState
            icon="📸"
            title="We couldn't load this post"
            sub="Please check your connection and try again."
            cta={{ label: 'Browse Delvers', to: '/delvers' }}
          />
        )}

        {data && (
          <>
            <div className="post-detail-page__hero">
              {data.is_delvers && data.delvers_board ? (
                <p className="post-detail-page__board">
                  <Link to="/delvers">Delvers</Link>
                  <span aria-hidden> · </span>
                  <span>{data.delvers_board}</span>
                </p>
              ) : null}
              <IgPostCard post={data} queryKey={['post', data.id]} linkMedia={false} mediaVariant="detail" />
            </div>

            {showSimilarRail ? (
              <section className="post-detail-similar" aria-labelledby="post-similar-heading">
                <h2 id="post-similar-heading" className="post-detail-similar__title">
                  More posts you may like
                </h2>
                <div className="post-detail-similar__list">
                  {similarLoading &&
                    similarPosts.length === 0 &&
                    [0, 1].map((k) => (
                      <div key={`sk-${k}`} className="post-detail-similar__snap">
                        <div className="skeleton post-detail-similar__skeleton" aria-hidden />
                      </div>
                    ))}
                  {!similarLoading &&
                    similarPosts.map((p) => (
                      <div key={p.id} className="post-detail-similar__snap">
                        <IgPostCard post={p} queryKey={['post', p.id]} linkMedia />
                      </div>
                    ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
