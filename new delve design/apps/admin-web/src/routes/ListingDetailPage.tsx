import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AdminListingDetail } from '@delve/contracts'
import { adminGetListing } from '../api/listings'
import { AdvertisedPrice } from '../components/admin/AdvertisedPrice'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

export default function ListingDetailPage() {
  const { listingId = '' } = useParams()
  const [row, setRow] = useState<AdminListingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      setRow(await adminGetListing(listingId))
    } catch (err) {
      if ((err as Error & { status?: number }).status === 404) setNotFound(true)
      else setError(err instanceof Error ? err.message : 'Could not load this listing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [listingId])

  if (loading) return <LoadingSkeleton rows={5} />
  if (notFound) return <EmptyState title="Listing not found" detail="This listing id does not exist." />
  if (error) return <ErrorState title="Could not load listings." detail={error} onRetry={() => void load()} />
  if (!row) return null

  return (
    <div>
      <AdminPageHeader title={row.title} description="Operational listing inspection. Listing lifecycle remains provider-owned." />
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge>{row.status}</StatusBadge>
        <StatusBadge>{row.businessStatus}</StatusBadge>
      </div>
      {row.coverUrl ? <img src={row.coverUrl} alt="" className="rounded-xl mb-4 max-w-md w-full" /> : null}
      <p className="text-sm m-0 mb-3">{row.description || 'No description.'}</p>
      <p className="text-sm m-0">Business: <Link to={`/businesses/${row.businessId}`}>{row.businessName}</Link></p>
      <p className="text-sm m-0">Price: <AdvertisedPrice pricing={row.pricing} /></p>
      <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>Created {new Date(row.createdAt).toLocaleString()} · Updated {new Date(row.updatedAt).toLocaleString()}</p>
      <p className="text-xs m-0 mt-2"><Link to="/deals">Related deals: {row.dealCount}</Link> · <Link to="/bookings">Related bookings: {row.bookingCount}</Link></p>
      <h2 className="text-sm font-semibold m-0 mt-5 mb-2">Media</h2>
      <div className="flex flex-wrap gap-2">
        {row.media.map(asset => (
          <img key={asset.id} src={asset.delivery.url} alt={asset.altText || ''} width={120} height={80} className="rounded-lg object-cover" />
        ))}
        {row.media.length === 0 ? <EmptyState title="No listing media." /> : null}
      </div>
    </div>
  )
}
