import type { PostEngagement } from '../../../data/providerAnalytics'

type Props = {
  posts: PostEngagement[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
}

export function ProviderAnalyticsPosts({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <section className="prov-analytics__card">
        <h2 className="prov-analytics__card-title">Posts & stories</h2>
        <p className="prov-analytics__insight">
          Share host stories or Delvers posts to see likes, saves, and comments here.
        </p>
      </section>
    )
  }

  return (
    <section className="prov-analytics__card">
      <h2 className="prov-analytics__card-title">Posts & stories</h2>
      <div className="prov-ui__list">
        {posts.map((post) => (
          <article key={post.id} className="prov-analytics__post-row">
            <div>
              <strong>{post.title}</strong>
              <span>
                {post.type} · {formatDate(post.createdAt)}
              </span>
            </div>
            <div className="prov-analytics__post-stats">
              <span>{post.likes} likes</span>
              <span>{post.saves} saves</span>
              <span>{post.comments} comments</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
