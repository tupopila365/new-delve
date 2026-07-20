import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clapperboard, Compass, MessageCircle, Plus } from 'lucide-react'
import { apiFetch } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  EMPTY_GUIDE_PACKAGE_FORM,
  EMPTY_GUIDE_PROFILE_FORM,
  GuideBookingCard,
  GuideMonetizationSection,
  GuidePackageCard,
  GuidePackageForm,
  GuideProfileForm,
  GuideProfileSummaryCard,
  MAX_GUIDE_PACKAGES,
  buildGuideProfileFormData,
  formToProfilePayload,
  normalizeProviderGuide,
  packageFormHasUploads,
  packageToApiPayload,
  packageToForm,
  profileCompleteness,
  profileFormHasUploads,
  profileToForm,
  resolveGuideProfileHighlights,
  type GuideProviderBooking,
  type ProviderGuideProfile,
} from '../components/provider/guides'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import '../components/provider/guides/guide-listing.css'
import { ListSkeleton } from '../components/ui'
import type { TourPackage } from '../components/guide/types'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'packages', label: 'Packages' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'reviews', label: 'Reviews' },
] as const

const BOOKING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_ACTIONS: Record<string, { label: string; action: string }[]> = {
  pending: [
    { label: 'Confirm', action: 'confirm' },
    { label: 'Cancel', action: 'cancel' },
  ],
  confirmed: [
    { label: 'Mark complete', action: 'complete' },
    { label: 'Cancel', action: 'cancel' },
    { label: 'Refund', action: 'refund' },
  ],
}

export function GuidesAdmin() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canManageListings, canManageBookings, isViewerOnly, canAccessProvider } = useBusinessAccess()

  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('profile')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [editPackageId, setEditPackageId] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState(EMPTY_GUIDE_PROFILE_FORM)
  const [profileFormSection, setProfileFormSection] = useState<
    'identity' | 'expertise' | 'credentials' | 'pricing' | 'photos' | 'stories'
  >('identity')
  const [packageForm, setPackageForm] = useState(EMPTY_GUIDE_PACKAGE_FORM)
  const [profileErr, setProfileErr] = useState('')
  const [packageErr, setPackageErr] = useState('')

  const { data: guide, isLoading: loadingProfile } = useQuery({
    queryKey: ['provider-guide-profile'],
    queryFn: async () => {
      const raw = await apiFetch<ProviderGuideProfile | null>('/api/guides/provider-profile/')
      return raw ? normalizeProviderGuide(raw) : null
    },
    enabled: Boolean(profile && canAccessProvider),
  })

  const bookingsUrl =
    statusFilter === 'all'
      ? '/api/guides/provider-bookings/'
      : `/api/guides/provider-bookings/?status=${statusFilter}`

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['provider-guide-bookings', statusFilter],
    queryFn: () => apiFetch<GuideProviderBooking[]>(bookingsUrl),
    enabled: Boolean(profile && canAccessProvider && guide),
  })

  const packages = guide?.tour_packages ?? []

  const { data: travelerReviewsPayload } = useQuery({
    queryKey: ['guide-reviews', guide?.id],
    enabled: Boolean(guide?.id),
    queryFn: () =>
      apiFetch<{ reviews: Array<{ name?: string; place?: string; rating?: number; body?: string; source?: string }> }>(
        `/api/guides/profiles/${guide!.id}/reviews/`,
        { auth: false },
      ),
  })

  const reviews = useMemo(() => {
    const traveler = (travelerReviewsPayload?.reviews ?? []).map((r, i) => ({
      id: `traveler-${i}-${r.name ?? 'guest'}`,
      source: r.source === 'traveler' || !r.source ? 'Traveller' : String(r.source),
      guest: r.name || 'Guest',
      place: r.place || '',
      rating: Number(r.rating ?? 0),
      body: r.body || '',
    }))
    const profileReviews = (guide?.guest_reviews ?? []).map((r, i) => ({
      id: `profile-${i}`,
      source: 'Profile',
      guest: r.name,
      place: r.place,
      rating: r.rating,
      body: r.body,
    }))
    const packageReviews = packages.flatMap((pkg) =>
      (pkg.reviews ?? []).map((r, i) => ({
        id: `${pkg.id}-${i}`,
        source: pkg.title,
        guest: r.name,
        place: r.place,
        rating: r.rating,
        body: r.body,
      })),
    )
    // Prefer traveler reviews first; dedupe profile/package seeds by body+name if needed later
    return [...traveler, ...profileReviews, ...packageReviews]
  }, [guide, packages, travelerReviewsPayload])

  const saveProfileMut = useMutation({
    mutationFn: async () => {
      const resolvedForm = await resolveGuideProfileHighlights(profileForm)
      const hasUploads = profileFormHasUploads(resolvedForm)
      const body = hasUploads
        ? buildGuideProfileFormData(resolvedForm, packages)
        : JSON.stringify(formToProfilePayload(resolvedForm, packages))
      if (guide) {
        return apiFetch<ProviderGuideProfile>('/api/guides/provider-profile/', {
          method: 'PATCH',
          body,
        })
      }
      return apiFetch<ProviderGuideProfile>('/api/guides/provider-profile/', {
        method: 'POST',
        body,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-guide-profile'] })
      void qc.invalidateQueries({ queryKey: ['guides'] })
      void qc.invalidateQueries({ queryKey: ['guide'] })
      void qc.invalidateQueries({ queryKey: ['guide-provider-analytics'] })
      setShowProfileForm(false)
      setProfileErr('')
    },
    onError: (e: Error) => setProfileErr(friendlyApiMessage(e)),
  })

  const savePackageMut = useMutation({
    mutationFn: async () => {
      if (!guide) throw new Error('Create your guide profile first.')
      const nextPkg = packageToApiPayload(packageForm)
      let nextPackages: TourPackage[]
      if (editPackageId) {
        nextPackages = packages.map((p) =>
          p.id === editPackageId ? { ...p, ...nextPkg, reviews: p.reviews } : p,
        )
      } else {
        if (packages.length >= MAX_GUIDE_PACKAGES) {
          throw new Error(`You can add at most ${MAX_GUIDE_PACKAGES} tour packages.`)
        }
        if (packages.some((p) => p.id === nextPkg.id)) {
          throw new Error('A package with this slug already exists.')
        }
        nextPackages = [...packages, { ...nextPkg, reviews: [] }]
      }
      const profileValues = profileToForm(guide)
      const hasUploads = packageFormHasUploads(packageForm)
      const body = hasUploads
        ? buildGuideProfileFormData(profileValues, nextPackages, {
            packageId: nextPkg.id,
            packagePhoto: packageForm.photo_file,
            packageGallery: packageForm.gallery_files,
          })
        : JSON.stringify(formToProfilePayload(profileValues, nextPackages))
      return apiFetch<ProviderGuideProfile>('/api/guides/provider-profile/', {
        method: 'PATCH',
        body,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-guide-profile'] })
      void qc.invalidateQueries({ queryKey: ['guides'] })
      void qc.invalidateQueries({ queryKey: ['guide'] })
      setShowPackageForm(false)
      setEditPackageId(null)
      setPackageForm(EMPTY_GUIDE_PACKAGE_FORM)
      setPackageErr('')
    },
    onError: (e: Error) => setPackageErr(friendlyApiMessage(e)),
  })

  const deletePackageMut = useMutation({
    mutationFn: async (packageId: string) => {
      if (!guide) throw new Error('Create your guide profile first.')
      const nextPackages = packages.filter((p) => p.id !== packageId)
      const profileValues = profileToForm(guide)
      return apiFetch<ProviderGuideProfile>('/api/guides/provider-profile/', {
        method: 'PATCH',
        body: JSON.stringify(formToProfilePayload(profileValues, nextPackages)),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-guide-profile'] })
      void qc.invalidateQueries({ queryKey: ['guides'] })
      void qc.invalidateQueries({ queryKey: ['guide'] })
      setPackageErr('')
    },
    onError: (e: Error) => setPackageErr(friendlyApiMessage(e)),
  })

  const bookingActionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      apiFetch<GuideProviderBooking>(`/api/guides/provider-bookings/${id}/${action}/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-guide-bookings'] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'guides'] })
      void qc.invalidateQueries({ queryKey: ['guide-provider-analytics'] })
    },
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }

  const completeness = guide ? profileCompleteness(guide) : { percent: 0, missing: [] }
  const revenue = bookings
    .filter((b) => ['confirmed', 'completed'].includes(b.status))
    .reduce((s, b) => s + parseFloat(b.total_price), 0)
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length

  const openCreateProfile = () => {
    setProfileForm(guide ? profileToForm(guide) : EMPTY_GUIDE_PROFILE_FORM)
    setProfileFormSection('identity')
    setShowProfileForm(true)
    setProfileErr('')
    setTab('profile')
  }

  const openEditProfile = () => {
    if (!guide) return
    setProfileForm(profileToForm(guide))
    setProfileFormSection('identity')
    setShowProfileForm(true)
    setProfileErr('')
  }

  const openEditHighlights = () => {
    if (!guide) return
    setProfileForm(profileToForm(guide))
    setProfileFormSection('stories')
    setShowProfileForm(true)
    setProfileErr('')
    setTab('profile')
  }

  useEffect(() => {
    if (searchParams.get('edit') !== 'highlights') return
    if (!guide || !canManageListings) return
    openEditHighlights()
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when guide + query ready
  }, [guide, canManageListings, searchParams])

  const openCreatePackage = () => {
    setEditPackageId(null)
    setPackageForm(EMPTY_GUIDE_PACKAGE_FORM)
    setShowPackageForm(true)
    setPackageErr('')
    setTab('packages')
  }

  const openEditPackage = (pkg: TourPackage) => {
    setEditPackageId(pkg.id)
    setPackageForm(packageToForm(pkg))
    setShowPackageForm(true)
    setPackageErr('')
  }

  const attention = [
    ...(completeness.percent < 100 && guide
      ? [{
          id: 'profile',
          label: `Profile ${completeness.percent}% complete`,
          action: 'Complete profile',
          onClick: openEditProfile,
        }]
      : []),
    ...(!guide
      ? [{ id: 'create', label: 'No guide profile yet', action: 'Create profile', onClick: openCreateProfile }]
      : []),
    ...(packages.length === 0 && guide
      ? [{ id: 'packages', label: 'Add your first tour package', action: 'Add package', onClick: openCreatePackage }]
      : []),
    ...(guide && !(guide.guide_stories?.length)
      ? [{
          id: 'highlights',
          label: 'No custom highlights yet',
          action: 'Add highlights',
          onClick: openEditHighlights,
        }]
      : []),
    ...(pendingBookings > 0
      ? [{
          id: 'pending',
          label: `${pendingBookings} booking request${pendingBookings === 1 ? '' : 's'} pending`,
          action: 'Review bookings',
          onClick: () => setTab('bookings'),
        }]
      : []),
  ]

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Guides"
        subtitle={
          isViewerOnly
            ? 'View your guide profile, packages, and traveller bookings.'
            : 'Manage your profile, highlights, packages, and what travellers see on your public guide page.'
        }
        actions={
          <>
            <Link to="/guides" className="prov-ui__btn prov-ui__btn--ghost">
              View public
            </Link>
            {canManageListings && guide ? (
              <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={openCreatePackage}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add package
              </button>
            ) : canManageListings ? (
              <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={openCreateProfile}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Create profile
              </button>
            ) : null}
          </>
        }
      />

      {attention.length > 0 ? (
        <section>
          <h2 className="prov-ui__section-title">Needs attention</h2>
          <ul className="prov-ui__attention">
            {attention.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <button
                  type="button"
                  className="prov-ui__link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={item.onClick}
                >
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="prov-ui__section-title">Quick links</h2>
        <div className="prov-ui__shortcuts">
          {canManageListings ? (
            <button type="button" className="prov-ui__shortcut" onClick={guide ? openEditProfile : openCreateProfile}>
              <Compass size={18} strokeWidth={2.25} aria-hidden />
              <span>{guide ? 'Edit profile' : 'Create profile'}</span>
            </button>
          ) : null}
          {canManageListings && guide ? (
            <button type="button" className="prov-ui__shortcut" onClick={openEditHighlights}>
              <Clapperboard size={18} strokeWidth={2.25} aria-hidden />
              <span>
                {(guide.guide_stories?.length ?? 0) > 0 ? 'Manage highlights' : 'Add highlights'}
              </span>
            </button>
          ) : null}
          {canManageListings && guide ? (
            <button type="button" className="prov-ui__shortcut" onClick={openCreatePackage}>
              <Plus size={18} strokeWidth={2.25} aria-hidden />
              <span>Add package</span>
            </button>
          ) : null}
          <button type="button" className="prov-ui__shortcut" onClick={() => setTab('bookings')}>
            <CalendarDays size={18} strokeWidth={2.25} aria-hidden />
            <span>Bookings</span>
          </button>
          <Link to="/provider/messages" className="prov-ui__shortcut">
            <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
            <span>Messages</span>
          </Link>
      </div>
      </section>

      <ProviderUiStats
        columns={4}
        stats={[
          { value: guide?.rating_avg ?? '—', label: 'Rating' },
          { value: packages.length, label: 'Packages' },
          { value: bookings.length || '—', label: 'Bookings', accent: pendingBookings > 0 },
          { value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },
        ]}
      />

      <GuideMonetizationSection enabled={canAccessProvider && Boolean(guide)} canManage={canManageListings} />

      <ProviderUiChips chips={[...TABS]} active={tab} onChange={(id) => setTab(id as typeof tab)} ariaLabel="Guides sections" />

      {tab === 'profile' && (
        <section id="profile">
          {loadingProfile ? (
            <ListSkeleton count={1} variant="row" />
          ) : !guide ? (
            <>
              <ProviderUiEmpty
                title="No guide profile yet"
                message="Set up your public guide page — headline, credentials, meeting point, and portfolio photos."
              />
              {canManageListings ? (
                <button type="button" className="guide-add-btn" onClick={openCreateProfile}>
                  Create guide profile
                </button>
              ) : null}
            </>
          ) : (
            <GuideProfileSummaryCard
              guide={guide}
              canEdit={canManageListings}
              onEdit={openEditProfile}
              onManageHighlights={openEditHighlights}
            />
          )}
        </section>
      )}

      {tab === 'packages' && (
        <section id="packages">
          {packageErr ? <p className="guide-hint" role="alert">{packageErr}</p> : null}
          {!guide ? (
            <ProviderUiEmpty
              title="Create your profile first"
              message="Add a guide profile before creating tour packages."
            />
          ) : loadingProfile ? (
            <ListSkeleton count={2} variant="row" />
          ) : packages.length === 0 ? (
            <>
              <ProviderUiEmpty
                title="No tour packages yet"
                message="Packages get their own detail pages with photos, duration, price, and reviews."
              />
              {canManageListings ? (
                <button type="button" className="guide-add-btn" onClick={openCreatePackage}>
                  Add tour package
                </button>
              ) : null}
            </>
          ) : (
            <div className="guide-list">
              {packages.map((pkg) => (
                <GuidePackageCard
                  key={pkg.id}
                  pkg={pkg}
                  guideId={guide.id}
                  canEdit={canManageListings}
                  onEdit={() => openEditPackage(pkg)}
                  onDelete={() => deletePackageMut.mutate(pkg.id)}
                  deletePending={deletePackageMut.isPending}
                />
              ))}
            </div>
          )}
          {canManageListings && guide && packages.length > 0 ? (
            <button type="button" className="guide-add-btn" onClick={openCreatePackage}>
              Add tour package
          </button>
          ) : null}
        </section>
      )}

      {tab === 'bookings' && (
        <section id="bookings">
          {!guide ? (
            <ProviderUiEmpty title="No bookings yet" message="Booking requests appear once your guide profile is live." />
          ) : (
            <>
              {!canManageBookings ? (
                <p className="guide-hint">Your role can view guides but not manage bookings.</p>
              ) : null}
              <ProviderUiChips
                chips={BOOKING_FILTERS}
                active={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter bookings"
              />
              {loadingBookings ? (
                <p className="guide-hint">Loading bookings…</p>
              ) : bookings.length === 0 ? (
                <ProviderUiEmpty title="No bookings found" message="Traveller booking requests will appear here." />
              ) : (
                <div className="prov-ui__list">
                  {bookings.map((b) => (
                    <GuideBookingCard
                      key={b.id}
                      booking={b}
                      canManage={canManageBookings}
                      statusActions={STATUS_ACTIONS[b.status] ?? []}
                      actionPending={bookingActionMut.isPending}
                      onAction={(action) => bookingActionMut.mutate({ id: b.id, action })}
                    />
                  ))}
        </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'reviews' && (
        <section id="reviews">
          {reviews.length === 0 ? (
            <ProviderUiEmpty title="No reviews yet" message="Traveller reviews from completed tours appear here, plus any profile or package highlights." />
          ) : (
            <div className="prov-ui__list">
              {reviews.map((r) => (
                <article key={r.id} className="prov-ui-review">
                  <div className="prov-ui-review__head">
                    <span className="prov-ui__booking-avatar" aria-hidden>
                      {r.guest.charAt(0)}
                    </span>
                    <div>
                      <strong>
                        {r.guest}
                        {r.place ? ` · ${r.place}` : ''}
                      </strong>
                      <span>{r.source}</span>
                    </div>
                    <span className="prov-ui-review__rating">{r.rating}</span>
                  </div>
                  <p className="prov-ui-review__body">{r.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showProfileForm && canManageListings ? (
        <GuideProfileForm
          key={`guide-profile-${profileFormSection}`}
          values={profileForm}
          onChange={setProfileForm}
          error={profileErr}
          saving={saveProfileMut.isPending}
          isEdit={Boolean(guide)}
          initialSection={profileFormSection}
          onSubmit={() => saveProfileMut.mutate()}
          onCancel={() => {
            setShowProfileForm(false)
            setProfileErr('')
            setProfileFormSection('identity')
          }}
        />
      ) : null}

      {showPackageForm && canManageListings ? (
        <GuidePackageForm
          values={packageForm}
          onChange={setPackageForm}
          error={packageErr}
          saving={savePackageMut.isPending}
          isEdit={Boolean(editPackageId)}
          onSubmit={() => savePackageMut.mutate()}
          onCancel={() => {
            setShowPackageForm(false)
            setEditPackageId(null)
            setPackageForm(EMPTY_GUIDE_PACKAGE_FORM)
            setPackageErr('')
          }}
        />
      ) : null}
    </ProviderUiPage>
  )
}
