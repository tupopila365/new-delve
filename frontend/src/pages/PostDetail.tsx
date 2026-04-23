import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/client'
import { IgPostCard, type FeedPost } from '../components/IgPostCard'

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

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <div className="post-detail-page">
      <div className="post-detail-page__bar">
        <button type="button" className="post-detail-page__back" onClick={() => navigate(-1)} aria-label="Go back">
          ← Back
        </button>
        <Link to="/" className="post-detail-page__home">
          Home
        </Link>
      </div>

      {!validId && (
        <p className="page-sub" role="alert">
          Invalid post link.{' '}
          <Link to="/">Return home</Link>
        </p>
      )}

      {validId && isLoading && (
        <>
          <div className="skeleton ig-post" style={{ height: 56, marginBottom: 12, borderRadius: 0 }} />
          <div className="skeleton ig-post" style={{ height: 320, marginBottom: 16, borderRadius: 0 }} />
          <div className="skeleton ig-post" style={{ height: 120, borderRadius: 0 }} />
        </>
      )}

      {validId && notFound && (
        <div className="post-detail-page__missing">
          <h1 className="display" style={{ fontSize: '1.35rem', marginBottom: 8 }}>
            Post not found
          </h1>
          <p className="page-sub">It may have been removed, or the link is wrong.</p>
          <div className="post-detail-page__missing-actions">
            <Link to="/delvers" className="btn btn-primary">
              Browse Delvers
            </Link>
            <Link to="/" className="btn btn-ghost">
              Home
            </Link>
          </div>
        </div>
      )}

      {validId && error && !notFound && (
        <p className="page-sub" role="alert">
          Could not load this post. <Link to="/">Try home</Link>
        </p>
      )}

      {data && (
        <>
          {data.is_delvers && data.delvers_board ? (
            <p className="post-detail-page__board">
              <Link to="/delvers">Delvers</Link>
              <span aria-hidden> · </span>
              <span>{data.delvers_board}</span>
            </p>
          ) : null}
          <IgPostCard post={data} queryKey={['post', data.id]} linkMedia={false} />
        </>
      )}
    </div>
  )
}
