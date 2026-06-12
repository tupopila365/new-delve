export function ProviderReviews() {
  const reviews = [
    { id: 1, guest: 'Anna K.', listing: 'Freesia Hotel', rating: 5, body: 'Spotless room and great breakfast.' },
    { id: 2, guest: 'Tobias L.', listing: 'Coastal Guesthouse', rating: 4.8, body: 'Loved the dune views from the terrace.' },
    { id: 3, guest: 'Mila K.', listing: 'Desert sunrise tour', rating: 5, body: 'Kaoko knew every photo stop on the route.' },
  ]

  return (
    <div className="prov-page">
      <h1 className="prov-page__title">Reviews</h1>
      <p className="prov-page__sub">Guest ratings and written feedback across all your listings.</p>

      <div className="prov-page__stats">
        <div className="prov-page__stat">
          <strong>4.7</strong>
          <span>Average rating</span>
        </div>
        <div className="prov-page__stat">
          <strong>{reviews.length}</strong>
          <span>Recent reviews</span>
        </div>
      </div>

      <div className="prov-reviews">
        {reviews.map((r) => (
          <article key={r.id} className="prov-reviews__card">
            <div className="prov-reviews__head">
              <strong>{r.guest}</strong>
              <span>★ {r.rating}</span>
            </div>
            <p className="prov-reviews__listing">{r.listing}</p>
            <p className="prov-reviews__body">{r.body}</p>
            <button type="button" className="prov-reviews__reply">
              Reply
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
