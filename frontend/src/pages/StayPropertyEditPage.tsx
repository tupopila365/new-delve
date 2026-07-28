import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  EMPTY_STAY_LISTING_FORM,
  StayListingForm,
  buildStayPropertyApiPayload,
  isStayFormStepId,
  nextIncompleteStayPropertyStep,
  nextStayPropertyStep,
  stayListingToForm,
  type ProviderStayListing,
  type StayFormStepId,
  type StayListingSaveMode,
  type StayPropertyFormStepId,
} from '../components/provider/stays'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { friendlyApiMessage } from '../utils/friendlyError'
import '../components/provider/stays/stay-listing.css'

export function StayPropertyEditPage() {
  const { listingId: listingIdParam } = useParams()
  const isNew = !listingIdParam || listingIdParam === 'new'
  const listingId = isNew ? null : Number(listingIdParam)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { activeBusiness, canManageListings, canAccessProvider } = useBusinessAccess()

  const [form, setForm] = useState(EMPTY_STAY_LISTING_FORM)
  const [step, setStep] = useState<StayFormStepId>('basics')
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(isNew)

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['provider-stay', listingId],
    queryFn: () => apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`),
    enabled: Boolean(profile && canAccessProvider && listingId),
  })

  useEffect(() => {
    if (!listing) return
    const values = stayListingToForm(listing)
    setForm(values)
    const stepParam = searchParams.get('step')
    const initial = isStayFormStepId(stepParam) && stepParam !== 'rooms'
      ? (stepParam as StayPropertyFormStepId)
      : nextIncompleteStayPropertyStep(values)
    setStep(initial)
    setHydrated(true)
  }, [listing, searchParams])

  const saveMut = useMutation({
    mutationFn: async (mode: StayListingSaveMode) => {
      const propertyBody = await buildStayPropertyApiPayload(form)
      const body =
        !listingId && activeBusiness?.id
          ? { ...propertyBody, business: activeBusiness.id }
          : propertyBody
      const saved = listingId
        ? await apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await apiFetch<ProviderStayListing>('/api/accommodation/provider-listings/', {
            method: 'POST',
            body: JSON.stringify(body),
          })
      return { saved, mode, fromStep: step as StayPropertyFormStepId }
    },
    onSuccess: ({ saved, mode, fromStep }) => {
      void qc.invalidateQueries({ queryKey: ['provider-stays'] })
      void qc.invalidateQueries({ queryKey: ['provider-stay', saved.id] })
      void qc.invalidateQueries({ queryKey: ['accommodation'] })
      void qc.invalidateQueries({ queryKey: ['acc'] })
      setForm(stayListingToForm(saved))
      setError('')
      if (mode === 'continue') {
        const next = nextStayPropertyStep(fromStep)
        if (isNew) {
          navigate(`/provider/stays/${saved.id}/edit${next ? `?step=${next}` : ''}`, { replace: true })
          return
        }
        setStep(next ?? fromStep)
        return
      }
      navigate('/provider/stays')
    },
    onError: (e: Error) => setError(friendlyApiMessage(e)),
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }
  if (!canManageListings) {
    return <Navigate to="/provider/stays" replace />
  }
  if (!isNew && (!listingId || Number.isNaN(listingId))) {
    return <Navigate to="/provider/stays" replace />
  }
  if (!isNew && isLoading) {
    return (
      <ProviderUiPage>
        <p className="stay-hint">Loading accommodation…</p>
      </ProviderUiPage>
    )
  }
  if (!isNew && (isError || !hydrated)) {
    return (
      <ProviderUiPage>
        <ProviderUiHeader title="Accommodation not found" subtitle="This stay may have been removed." />
        <Link to="/provider/stays" className="prov-ui__btn prov-ui__btn--ghost">
          Back to stays
        </Link>
      </ProviderUiPage>
    )
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title={isNew ? 'New accommodation' : 'Accommodation details'}
        subtitle="Edit the property itself here. Rooms each have their own page."
        actions={
          <>
            <Link to="/provider/stays" className="prov-ui__btn prov-ui__btn--ghost">
              Hub
            </Link>
            {listingId ? (
              <>
                <Link to={`/accommodation/${listingId}?preview=1`} className="prov-ui__btn prov-ui__btn--ghost">
                  Preview
                </Link>
                <Link to={`/provider/stays/${listingId}/rooms`} className="prov-ui__btn prov-ui__btn--primary">
                  Manage rooms
                </Link>
              </>
            ) : null}
          </>
        }
      />
      <StayListingForm
        values={form}
        onChange={setForm}
        error={error}
        saving={saveMut.isPending}
        onSave={(mode) => saveMut.mutate(mode)}
        onCancel={() => navigate('/provider/stays')}
        isEdit={!isNew}
        listingId={listingId}
        step={step}
        onStepChange={setStep}
        variant="property"
        presentation="page"
      />
    </ProviderUiPage>
  )
}
