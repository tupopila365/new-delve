import { useEffect, useMemo, useState } from 'react'

import { useParams, useSearchParams } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import { Compass } from 'lucide-react'

import { apiFetch } from '../api/client'

import { useAuth } from '../auth/AuthContext'

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



const SEED_QUESTIONS: ListingQuestionItem[] = [

  { id: 'q1', author: 'Mila K.', body: 'Can you pick us up at the hotel?', ago: '3h ago' },

  { id: 'q2', author: 'Jonas T.', body: 'Is this suitable for families with kids?', ago: '1d ago' },

]



export function GuideDetail() {

  const { id } = useParams()

  const [searchParams] = useSearchParams()

  const { profile } = useAuth()



  const [saved, setSaved] = useState(false)

  const [shareMsg, setShareMsg] = useState('')

  const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(null)



  const { data: g, isLoading, isError, refetch } = useQuery({

    queryKey: ['guide', id],

    enabled: !!id,

    queryFn: () => apiFetch<GuideProfile>(`/api/guides/profiles/${id}/`, { auth: false }),

  })



  const { data: allGuides } = useQuery({

    queryKey: ['guides', 'all-for-similar'],

    queryFn: () => apiFetch<GuideProfile[]>('/api/guides/profiles/', { auth: false }),

    staleTime: 60_000,

  })



  const packages = useMemo(() => normalizeTourPackages(g?.tour_packages), [g?.tour_packages])

  const reviews = useMemo(() => normalizeReviews(g?.guest_reviews), [g?.guest_reviews])

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

      <GuideDetailView

        guide={g}

        guideId={id}

        saved={saved}

        onSave={() => setSaved((v) => !v)}

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

        initialQuestions={SEED_QUESTIONS}

        onScrollToExperiences={scrollToExperiences}

      />

    </DetailPage>

  )

}


