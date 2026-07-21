import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import {
  BusinessBasicsForm,
  OnboardingCompletePanel,
  OnboardingStepper,
  ProviderOnboardingLayout,
  ServiceTypePicker,
  TransportModePicker,
  VerificationDocumentsForm,
  type UploadedDoc,
} from '../components/provider/onboarding'
import { writeActiveBusinessId } from '../utils/activeBusiness'
import {
  docsForServices,
  needsDocumentStep,
  onboardingStepsFor,
  type OnboardingServiceType,
  type OnboardingStep,
  type TransportMode,
} from '../data/providerOnboarding'

export function ProviderOnboarding({ embedded = false }: { embedded?: boolean }) {
  const { profile, loading } = useAuth()
  const { businesses, isLoading: bizLoading } = useBusinessAccess()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const forceSetup = searchParams.get('setup') === '1'
  const forceNew = searchParams.get('new') === '1'
  const paramBusinessId = Number(searchParams.get('business') || 0) || null

  const existing = forceNew
    ? undefined
    : paramBusinessId
      ? businesses.find((b) => b.id === paramBusinessId)
      : businesses.find((b) => b.onboarding_completed === false) ??
        (forceSetup ? businesses[0] : undefined)

  const needsResubmit = existing?.verification_status === 'rejected'
  const openSetupDocs = forceSetup && existing?.onboarding_completed === true
  const docsOnly = Boolean(existing && (needsResubmit || openSetupDocs))
  const alreadyDone = Boolean(existing?.onboarding_completed === true && !docsOnly && !forceNew)
  const initialServices =
    (existing?.business_types.filter((t) => t !== 'multi_provider') as OnboardingServiceType[]) ?? []

  const [selectedServices, setSelectedServices] = useState<OnboardingServiceType[]>(initialServices)
  const [transportModes, setTransportModes] = useState<TransportMode[]>(existing?.transport_modes ?? [])
  const [step, setStep] = useState<OnboardingStep>(() => {
    if (existing && docsOnly) return 'documents'
    if (existing && !existing.onboarding_completed) {
      const types = existing.business_types.filter((t) => t !== 'multi_provider') as OnboardingServiceType[]
      if (types.includes('transport') && !(existing.transport_modes?.length)) return 'transport_mode'
      return 'documents'
    }
    return 'services'
  })
  const [businessName, setBusinessName] = useState(existing?.business_name ?? '')
  const [tagline, setTagline] = useState(existing?.tagline ?? '')
  const [region, setRegion] = useState(existing?.region ?? profile?.region ?? '')
  const [city, setCity] = useState(existing?.city ?? profile?.city ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [businessId, setBusinessId] = useState<number | null>(existing?.id ?? null)
  const [verifyFood, setVerifyFood] = useState(false)
  const [uploads, setUploads] = useState<UploadedDoc[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [verificationPending, setVerificationPending] = useState(false)

  const steps = useMemo(() => {
    const activeServices = selectedServices.length ? selectedServices : initialServices
    return docsOnly ? (['documents'] as OnboardingStep[]) : onboardingStepsFor(activeServices)
  }, [selectedServices, initialServices, docsOnly])

  const activeServices = selectedServices.length ? selectedServices : initialServices

  const docFields = useMemo(
    () =>
      docsForServices(activeServices, {
        includeFoodVerification: verifyFood,
        transportModes: activeServices.includes('transport') ? transportModes : undefined,
      }),
    [activeServices, verifyFood, transportModes],
  )

  if (loading || bizLoading) {
    return (
      <ProviderOnboardingLayout embedded={embedded} title="Business setup" lead="Loading your progress…">
        <p className="prov-onboard__sub">Loading…</p>
      </ProviderOnboardingLayout>
    )
  }

  if (!profile) return <Navigate to="/login" replace />
  if (profile.user_type !== 'service_provider') return <Navigate to="/dashboard" replace />
  if (alreadyDone) {
    if (embedded) return null
    return <Navigate to="/provider" replace />
  }

  function handleUpload(docType: string, file: File) {
    setUploads((prev) => [...prev.filter((u) => u.docType !== docType), { docType, file, fileName: file.name }])
  }

  function handleRemove(docType: string) {
    setUploads((prev) => prev.filter((u) => u.docType !== docType))
  }

  function businessPayload() {
    const payload: Record<string, unknown> = {
      business_name: businessName.trim(),
      business_types: selectedServices,
      tagline: tagline.trim(),
      description: description.trim(),
      region: region.trim(),
      city: city.trim(),
    }
    if (selectedServices.includes('transport')) {
      payload.transport_modes = transportModes
    }
    return payload
  }

  async function createBusiness() {
    const biz = await apiFetch<MyBusiness>('/api/accounts/me/businesses/create/', {
      method: 'POST',
      body: JSON.stringify(businessPayload()),
    })
    setBusinessId(biz.id)
    writeActiveBusinessId(profile?.username, biz.id)
    await queryClient.invalidateQueries({ queryKey: ['my-businesses'] })
    await queryClient.invalidateQueries({ queryKey: ['my-businesses-menu'] })
    return biz
  }

  async function uploadDocuments(id: number) {
    for (const upload of uploads) {
      const fd = new FormData()
      fd.append('doc_type', upload.docType)
      fd.append('file', upload.file)
      await apiFetch(`/api/accounts/me/businesses/${id}/documents/`, { method: 'POST', body: fd })
    }
  }

  async function finishOnboarding(id: number, submitForReview: boolean) {
    if (uploads.length) await uploadDocuments(id)
    if (submitForReview) {
      await apiFetch(`/api/accounts/me/businesses/${id}/submit-verification/`, { method: 'POST' })
    } else {
      await apiFetch(`/api/accounts/me/businesses/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ onboarding_completed: true }),
      })
    }
    setVerificationPending(submitForReview)
    writeActiveBusinessId(profile?.username, id)
    await queryClient.invalidateQueries({ queryKey: ['my-businesses'] })
    await queryClient.invalidateQueries({ queryKey: ['my-businesses-menu'] })
    setStep('complete')
    if (forceSetup || forceNew || embedded) {
      navigate('/provider', { replace: true })
    }
  }

  async function onContinue() {
    setErr(null)

    if (step === 'services') {
      if (selectedServices.length === 0) {
        setErr('Pick at least one service.')
        return
      }
      setStep(selectedServices.includes('transport') ? 'transport_mode' : 'business')
      return
    }

    if (step === 'transport_mode') {
      if (transportModes.length === 0) {
        setErr('Choose rental cars, shared transport, or both.')
        return
      }
      setStep('business')
      return
    }

    if (step === 'business') {
      if (!businessName.trim()) {
        setErr('Enter your business name.')
        return
      }
      setBusy(true)
      try {
        if (!businessId) {
          await createBusiness()
        } else {
          await apiFetch(`/api/accounts/me/businesses/${businessId}/`, {
            method: 'PATCH',
            body: JSON.stringify(businessPayload()),
          })
          await queryClient.invalidateQueries({ queryKey: ['my-businesses'] })
        }
        setStep('documents')
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : 'Could not save business profile.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (step === 'documents') {
      const submitForReview = needsDocumentStep(selectedServices, verifyFood)

      if (submitForReview) {
        const required = docFields.filter((d) => d.required).map((d) => d.id)
        const uploaded = new Set(uploads.map((u) => u.docType))
        const missing = required.filter((id) => !uploaded.has(id))
        if (missing.length > 0) {
          setErr('Upload all required documents.')
          return
        }
      }

      setBusy(true)
      try {
        let id = businessId ?? existing?.id
        if (!id) {
          const biz = await createBusiness()
          id = biz.id
        }
        await finishOnboarding(id, submitForReview)
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : 'Could not finish setup.')
      } finally {
        setBusy(false)
      }
    }
  }

  function onBack() {
    setErr(null)
    if (step === 'business') {
      setStep(selectedServices.includes('transport') ? 'transport_mode' : 'services')
    } else if (step === 'transport_mode') {
      setStep('services')
    } else if (step === 'documents') {
      setStep('business')
    }
  }

  const submitForReview =
    step === 'documents' &&
    (docsOnly || needsDocumentStep(selectedServices, verifyFood))
  const continueLabel =
    step === 'services' || step === 'transport_mode'
      ? 'Continue'
      : step === 'business'
        ? busy
          ? 'Saving…'
          : 'Continue'
        : busy
          ? 'Finishing…'
          : submitForReview
            ? 'Submit'
            : 'Finish'

  return (
    <ProviderOnboardingLayout
      embedded={embedded}
      title="Business setup"
      lead="Pick your services, add business details, then finish verification if needed."
    >
      <OnboardingStepper current={step} steps={steps} />

      {step === 'services' ? (
        <ServiceTypePicker selected={selectedServices} onChange={setSelectedServices} error={err} />
      ) : null}

      {step === 'transport_mode' ? (
        <TransportModePicker selected={transportModes} onChange={setTransportModes} error={err} />
      ) : null}

      {step === 'business' ? (
        <BusinessBasicsForm
          businessName={businessName}
          tagline={tagline}
          region={region}
          city={city}
          description={description}
          onBusinessNameChange={setBusinessName}
          onTaglineChange={setTagline}
          onRegionChange={setRegion}
          onCityChange={setCity}
          onDescriptionChange={setDescription}
          error={err}
        />
      ) : null}

      {step === 'documents' ? (
        <VerificationDocumentsForm
          services={activeServices}
          docFields={docFields}
          uploads={uploads}
          verifyFood={verifyFood}
          onVerifyFoodChange={setVerifyFood}
          onUpload={handleUpload}
          onRemove={handleRemove}
          error={err}
          transportModes={transportModes}
        />
      ) : null}

      {step === 'complete' ? (
        <OnboardingCompletePanel services={selectedServices} verificationPending={verificationPending} />
      ) : (
        <div className="prov-onboard__actions">
          {step !== 'services' && !docsOnly ? (
            <button type="button" className="prov-onboard__btn prov-onboard__btn--ghost" onClick={onBack} disabled={busy}>
              Back
            </button>
          ) : null}
          <button
            type="button"
            className="prov-onboard__btn prov-onboard__btn--primary"
            onClick={() => void onContinue()}
            disabled={busy}
          >
            {continueLabel}
          </button>
        </div>
      )}
    </ProviderOnboardingLayout>
  )
}
