import { useEffect, useMemo, useState } from 'react'

import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import { Compass } from 'lucide-react'

import { apiFetch } from '../api/client'

import { useAuth } from '../auth/AuthContext'

import { useToggleGuideSave } from '../hooks/useGuideSave'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { PromotionOpenTracker } from '../components/promotion/PromotionOpenTracker'

import { normalizeReviews } from '../components/GuestReviewCard'

import { GuideDetailView } from '../components/guide'

import type { TourPackage } from '../components/guide/types'

import { DetailPage, DetailSkeleton } from '../components/detail'

import { EmptyState } from '../components/ui'

import type { ListingQuestionItem } from '../components/listing/ListingQuestionThread'

import { messageProviderPath } from '../components/messages/messageProviderUtils'

import { normalizeTourPackages } from '../utils/tourPackages'

import {

  buildSimilarGuides,

  normalizeCertifications,

  normalizeLanguagesDetail,

  normalizePortfolio,

  type GuideProfile,

} from '../utils/guideListing'



export function GuideDetail() {

  const { id } = useParams()

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const { profile } = useAuth()
  const { canManageListings, activeBusiness } = useBusinessAccess()

  const saveMut = useToggleGuideSave()

  const [shareMsg, setShareMsg] = useState('')

  const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(null)



  const { data: g, isLoading, isError, refetch } = useQuery({

    queryKey: ['guide', id, profile?.username ?? 'anon'],

    enabled: !!id,

    queryFn: () => apiFetch<GuideProfile>(`/api/guides/profiles/${id}/`, { auth: Boolean(profile) }),

  })



  const { data: allGuides } = useQuery({

    queryKey: ['guides', 'all-for-similar'],

    queryFn: () => apiFetch<GuideProfile[]>('/api/guides/profiles/', { auth: false }),

    staleTime: 60_000,

  })

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['guide-questions', id],
    enabled: !!id,
    queryFn: () => apiFetch<ListingQuestionItem[]>(`/api/guides/profiles/${id}/questions/`, { auth: false }),
  })

  const { data: reviewsPayload } = useQuery({
    queryKey: ['guide-reviews', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{ reviews: unknown[]; rating_avg: number; rating_count: number }>(
        `/api/guides/profiles/${id}/reviews/`,
        { auth: false },
      ),
  })



  const packages = useMemo(() => normalizeTourPackages(g?.tour_packages), [g?.tour_packages])

  const reviews = useMemo(
    () => normalizeReviews(reviewsPayload?.reviews ?? g?.guest_reviews),
    [reviewsPayload?.reviews, g?.guest_reviews],
  )

  const langsDetail = useMemo(() => normalizeLanguagesDetail(g?.languages_detail), [g?.languages_detail])

  const portfolio = useMemo(() => normalizePortfolio(g?.portfolio_gallery), [g?.portfolio_gallery])

  const certifications = useMemo(() => normalizeCertifications(g?.certifications), [g?.certifications])

  const similarGuides = useMemo(() => (g ? buildSimilarGuides(allGuides, g) : []), [allGuides, g])



  const packageParam = searchParams.get('package') ?? ''

  useEffect(() => {

    if (!packageParam || packages.length === 0) return

    const match = packages.find((p) => p.id === packageParam) ?? null

    if (match) setSelectedPackage(match)

  }, [packageParam, packages])



  const onShare = async () => {

    const title = g?.display_name?.trim() || g?.username || 'Guide'

    try {

      await navigator.clipboard.writeText(window.location.href)

      setShareMsg(`Link to ${title} copied`)

      window.setTimeout(() => setShareMsg(''), 1600)

    } catch {

      setShareMsg('Copy failed')

      window.setTimeout(() => setShareMsg(''), 1600)

    }

  }



  const scrollToExperiences = () => {

    if (!g) return

    if (packages.length === 0) {

      window.location.href = messageProviderPath(g.username)

      return

    }

    document.getElementById('guide-experiences')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  }



  if (isLoading) {

    return (

      <DetailPage prefix="gd-detail" className="gd-detail--premium acc-detail-page">

        <DetailSkeleton className="gd-detail__skeleton" />

      </DetailPage>

    )

  }



  if (isError) {

    return (

      <DetailPage prefix="gd-detail" className="gd-detail--premium acc-detail-page">

        <EmptyState

          iconElement={<Compass size={28} strokeWidth={1.75} />}

          title="We couldn't load this guide"

          sub="Please check your connection and try again."

          cta={{ label: 'Try again', onClick: () => void refetch() }}

        />

      </DetailPage>

    )

  }



  if (!g || !('headline' in g) || !id) {

    return (

      <DetailPage prefix="gd-detail" className="gd-detail--premium acc-detail-page">

        <EmptyState

          iconElement={<Compass size={28} strokeWidth={1.75} />}

          title="Guide not found"

          sub="This guide profile may have been removed or the link is incorrect."

          cta={{ label: 'Browse guides', to: '/guides' }}

        />

      </DetailPage>

    )

  }



  return (

    <DetailPage prefix="gd-detail" className="gd-detail--premium acc-detail-page" toast={shareMsg || null}>

      <PromotionOpenTracker />

      <GuideDetailView

        guide={g}

        guideId={id}

        saved={Boolean(g.saved_by_me)}

        onSave={() => {
          if (!profile) {
            navigate('/login')
            return
          }
          saveMut.mutate(Number(id))
        }}

        onShare={() => void onShare()}

        packages={packages}

        reviews={reviews}

        portfolio={portfolio}

        certifications={certifications}

        langsDetail={langsDetail}

        similarGuides={similarGuides}

        selectedPackage={selectedPackage}

        onSelectPackage={setSelectedPackage}

        profile={profile}

        questions={questions}

        questionsLoading={questionsLoading}

        canAnswerQuestions={
          Boolean(profile) &&
          (profile?.username === g.username ||
            (canManageListings && activeBusiness?.owner_username === g.username))
        }

        canReview={Boolean(g.can_review)}

        onScrollToExperiences={scrollToExperiences}

      />

    </DetailPage>

  )

}


