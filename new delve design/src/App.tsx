import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, Bell, MessageCircle, Heart, Bookmark, Share2,
  MoreHorizontal, CheckCircle, Home, Compass, Users, User, Plus,
  Sun, Moon, Monitor, ChevronRight, Star, Tag, Car, Plane, Bus,
  Navigation, Utensils, Zap, Map, ShoppingBag, Calendar, HelpCircle,
  TrendingUp, Send, X, Flame, Building2, Briefcase, Mail, Menu, Bed,
} from 'lucide-react'
import { businessPath, eventPath, navToPath, normalizePath, parseBusinessSlug, parseEventId, pathToNav } from './navigation'
import type { DealDto, PostDto } from '@delve/contracts'
import { formatUsername } from './lib/formatUsername'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import AccountSettingsPage from './pages/AccountSettingsPage'
import EmailChangeVerifyPage from './pages/EmailChangeVerifyPage'
import { ShimmerStyle } from './components/SectionStates'
import SafeImage from './components/mobile/SafeImage'
import MobileTabRail from './components/mobile/MobileTabRail'
import TransportPage, { TransportAside } from './pages/TransportPage'
import SearchPage from './pages/SearchPage'
import DealsPage from './pages/DealsPage'
import ServicesPage, { ServicesAside } from './pages/ServicesPage'
import JourneysPage from './pages/JourneysPage'
import JourneyDetailPage from './pages/JourneyDetailPage'
import CommunitiesPage from './pages/CommunitiesPage'
import CommunityDetailPage from './pages/CommunityDetailPage'
import DelversFeedPage from './pages/DelversFeedPage'
import AccountDashboardPage from './pages/AccountDashboardPage'
import type { AccountNavTarget } from './pages/AccountDashboardPage'
import ProfilePage from './pages/ProfilePage'
import EventsPage from './pages/EventsPage'
import EditEventSheet from './components/EditEventSheet'
import MessagesPage from './pages/MessagesPage'
import { useMessageUnreadCount } from './pages/messages/useLiveMessages'
import SavedPage from './pages/SavedPage'
import { fetchPublicDeals } from './api/dealClient'
import NotificationsPage from './pages/NotificationsPage'
import { useLiveNotifications } from './hooks/useLiveNotifications'
import InAppNotificationToast from './components/notifications/InAppNotificationToast'
import type { NotificationDto } from '@delve/contracts'
import MediaStudio, { CreatePostButton } from './pages/MediaStudio'
import CreateCommunitySheet from './components/communities/CreateCommunitySheet'
import { fetchThread } from './api/communityClient'
import CreateEventSheet from './components/CreateEventSheet'
import EventDetailSheet from './components/EventDetailSheet'
import CompanyPage, { COMPANY_ROUTES } from './pages/CompanyPage'
import type { CompanyRoute } from './pages/CompanyPage'
import ProviderDashboardPage from './business/ProviderDashboardPage'
import CreateBusinessPage from './pages/business/CreateBusinessPage'
import PublicBusinessPage from './pages/PublicBusinessPage'
import {
  AuthRequiredBottomSheet,
  AuthRequiredModal,
  DelveLogo,
  ProtectedRoute,
  PublicOnlyRoute,
  type GuestAction,
} from './components/auth'
import SignInScreen from './pages/auth/SignInScreen'
import SignUpScreen from './pages/auth/SignUpScreen'
import ForgotPasswordFlow from './pages/auth/ForgotPasswordFlow'
import EmailVerificationScreen from './pages/auth/EmailVerificationScreen'
import { useAuth } from './context'
import HomePage from './pages/HomePage'

// ─── Theme ────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system'

function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const resolve = () => setResolved(theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme)
    resolve()
    mq.addEventListener('change', resolve)
    return () => mq.removeEventListener('change', resolve)
  }, [theme])
  useEffect(() => { document.documentElement.setAttribute('data-theme', resolved) }, [resolved])
  return { theme, setTheme, resolved }
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const opts = [
    { v: 'light' as Theme, icon: <Sun size={13} /> },
    { v: 'system' as Theme, icon: <Monitor size={13} /> },
    { v: 'dark' as Theme, icon: <Moon size={13} /> },
  ]
  return (
    <div className="flex items-center rounded-lg p-0.5 gap-0.5"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => setTheme(o.v)} aria-label={o.v}
          className="p-1.5 rounded-md transition-all"
          style={{ background: theme === o.v ? 'var(--surface)' : 'transparent', color: theme === o.v ? 'var(--fg)' : 'var(--fg-muted)', boxShadow: theme === o.v ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
          {o.icon}
        </button>
      ))}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

export default function App() {
  const { theme, setTheme, resolved } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeNav, setActiveNavRaw] = useState(() => pathToNav(location.pathname))
  const { user, profile, isAuthenticated: signedIn, isLoading, logout } = useAuth()
  const authReady = !isLoading
  const messageUnreadCount = useMessageUnreadCount(signedIn && authReady)
  const {
    unreadCount: notificationUnreadCount,
    activeToast,
    dismissToast,
  } = useLiveNotifications(signedIn && authReady)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showOnboardingResume, setShowOnboardingResume] = useState(false)
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<
    'profile' | 'identity' | 'security' | 'notifications' | 'sessions' | 'status'
  >('profile')
  const [guestPrompt, setGuestPrompt] = useState<GuestAction | null>(null)
  const [postAuthNav, setPostAuthNav] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [pendingCreatePost, setPendingCreatePost] = useState(false)
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [eventDetailId, setEventDetailId] = useState<string | null>(null)
  const [eventsInitialTab, setEventsInitialTab] = useState<'discover' | 'hosting' | 'attending'>('discover')
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [journeyDetailId, setJourneyDetailId] = useState<string | null>(null)
  const [messagesJourneyId, setMessagesJourneyId] = useState<string | null>(null)
  const [messagesCommunityId, setMessagesCommunityId] = useState<string | null>(null)
  const [messagesConversationId, setMessagesConversationId] = useState<string | null>(null)
  const [messagesTargetUserId, setMessagesTargetUserId] = useState<string | null>(null)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [socialRefreshKey, setSocialRefreshKey] = useState(0)
  const [journeysCreateRequestKey, setJourneysCreateRequestKey] = useState(0)
  const [communityDetailId, setCommunityDetailId] = useState<string | null>(null)
  const [communityInitialThreadId, setCommunityInitialThreadId] = useState<string | null>(null)
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false)
  const [lastCreatedPost, setLastCreatedPost] = useState<PostDto | null>(null)
  const [businessAdminOpen, setBusinessAdminOpen] = useState(false)
  const [servicesCategory, setServicesCategory] = useState('All')
  const [servicesDestination, setServicesDestination] = useState<string | null>(null)
  const [servicesNeeds, setServicesNeeds] = useState<Set<string>>(new Set())
  const [servicesSelectedId, setServicesSelectedId] = useState<string | null>(null)
  const [dealsSelectedId, setDealsSelectedId] = useState<string | null>(null)
  const [homeDeals, setHomeDeals] = useState<DealDto[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false)

  useEffect(() => {
    const fromUrl = pathToNav(location.pathname)
    setActiveNavRaw(fromUrl)
    setEventDetailId(parseEventId(location.pathname))
    if (parseBusinessSlug(location.pathname)) setBusinessAdminOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    void fetchPublicDeals(3)
      .then(rows => {
        if (!cancelled) setHomeDeals(rows)
      })
      .catch(() => {
        if (!cancelled) setHomeDeals([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function openEventDetail(eventId: string) {
    setEventDetailId(eventId)
    const path = eventPath(eventId)
    if (normalizePath(location.pathname) !== path) {
      navigate(path)
    }
  }

  function closeEventDetail() {
    setEventDetailId(null)
    if (parseEventId(location.pathname)) {
      navigate(navToPath('Events'), { replace: true })
    }
  }

  async function openCommunityThread(threadId: string) {
    try {
      const thread = await fetchThread(threadId)
      setActiveNav('Communities')
      setCommunityDetailId(thread.community.id)
      setCommunityInitialThreadId(threadId)
    } catch {
      setActiveNav('Communities')
    }
  }

  function handleNotificationSelect(n: NotificationDto) {
    if (n.entityType === 'conversation' && n.entityId) {
      setMessagesConversationId(n.entityId)
      setActiveNav('Messages')
      return
    }
    if (n.entityType === 'journey' && n.entityId) {
      setActiveNav('Journeys')
      setJourneyDetailId(n.entityId)
      return
    }
    if (n.entityType === 'event' && n.entityId) {
      openEventDetail(n.entityId)
      return
    }
    if (n.entityType === 'community_thread' && n.entityId) {
      void openCommunityThread(n.entityId)
      return
    }
    setActiveNav('Notifications')
  }

  useEffect(() => {
    if (signedIn && profile) {
      if (profile.onboardingStatus === 'NOT_STARTED') setShowOnboarding(true)
      else if (profile.onboardingStatus === 'IN_PROGRESS') setShowOnboardingResume(true)
    }
  }, [signedIn, profile])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileMenuOpen])

  // Detect on-screen keyboard so bottom nav does not cover form fields
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      const keyboardOpen = window.innerHeight - vv.height > 120
      document.documentElement.setAttribute('data-keyboard-open', keyboardOpen ? 'true' : 'false')
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      document.documentElement.removeAttribute('data-keyboard-open')
    }
  }, [])

  const HUB_ROUTES = new Set([
    'Account',
    'Profile',
    'Messages',
    'Saved',
    'Notifications',
    'Provider',
    'Provider business',
  ])

  function goToNav(label: string) {
    const path = navToPath(label)
    if (pathToNav(location.pathname) === label) {
      setActiveNavRaw(label)
      return
    }
    navigate(path)
  }

  // Personal hub routes require a signed-in traveler.
  function setActiveNav(label: string) {
    if (HUB_ROUTES.has(label) && !signedIn) {
      setPostAuthNav(label)
      setPendingCreatePost(false)
      setGuestPrompt(null)
      navigate('/login', { state: { from: { pathname: navToPath(label) } } })
      return
    }
    if (label === 'Account') {
      setAccountSettingsOpen(false)
      setProfileUsername(null)
    }
    if (label !== 'Profile') setProfileUsername(null)
    if (label !== 'Journeys') setJourneyDetailId(null)
    if (label !== 'Account settings') setAccountSettingsOpen(false)
    goToNav(label)
  }

  function openAuth(route: 'signIn' | 'signUp' = 'signIn') {
    setGuestPrompt(null)
    setPostAuthNav(null)
    setPendingCreatePost(false)
    navigate(route === 'signUp' ? '/signup' : '/login', { state: { from: location } })
  }

  function openCreate() {
    if (!signedIn) {
      setPendingCreatePost(true)
      setPostAuthNav(null)
      setGuestPrompt(null)
      navigate('/login', { state: { from: location } })
      return
    }
    setCreatePostOpen(true)
  }

  function openProfile(username?: string | null) {
    setProfileUsername(username?.replace(/^@/, '') || null)
    setAccountSettingsOpen(false)
    goToNav('Profile')
  }

  function openAccountHub() {
    setAccountSettingsOpen(false)
    setProfileUsername(null)
    goToNav('Account')
  }

  function openAccountSettings(section: 'profile' | 'identity' | 'security' | 'notifications' | 'sessions' | 'status' = 'profile') {
    setSettingsInitialSection(section)
    setAccountSettingsOpen(true)
    goToNav('Account settings')
  }

  function openEditProfile() {
    openAccountSettings('profile')
  }

  function openBusiness(slug: string) {
    navigate(businessPath(slug))
  }

  function setServicesCategoryAndResetNeeds(category: string) {
    setServicesCategory(category === 'Stay' ? 'All' : category)
    setServicesNeeds(new Set())
  }

  function toggleServicesNeed(need: string) {
    setServicesNeeds(prev => {
      const next = new Set(prev)
      next.has(need) ? next.delete(need) : next.add(need)
      return next
    })
  }

  function clearServicesNeeds() {
    setServicesNeeds(new Set())
  }

  function clearServicesBrowse() {
    setServicesCategory('All')
    setServicesDestination(null)
    setServicesNeeds(new Set())
  }

  const servicesBrowseProps = {
    activeCategory: servicesCategory,
    setActiveCategory: setServicesCategoryAndResetNeeds,
    activeDestination: servicesDestination,
    setActiveDestination: setServicesDestination,
    activeNeeds: servicesNeeds,
    toggleNeed: toggleServicesNeed,
    clearNeeds: clearServicesNeeds,
    clearBrowse: clearServicesBrowse,
    selectedId: servicesSelectedId,
    setSelectedId: setServicesSelectedId,
    onOpenTransport: () => setActiveNav('Transport'),
    onOpenBusiness: openBusiness,
  }

  function handleSignedIn() {
    const from = (location.state as { from?: { pathname?: string; search?: string } })?.from
    const destination = from
      ? `${from.pathname ?? ''}${from.search ?? ''}`
      : postAuthNav
        ? navToPath(postAuthNav)
        : '/account'
    setPostAuthNav(null)
    if (pendingCreatePost) {
      setCreatePostOpen(true)
      setPendingCreatePost(false)
    }
    navigate(destination, { replace: true })
  }

  function handleSignOut() {
    void logout()
    setShowOnboarding(false)
    setShowOnboardingResume(false)
    setAccountSettingsOpen(false)
    goToNav('Home')
  }

  function handleAccountNavigate(target: AccountNavTarget) {
    setActiveNav(target)
  }

  const createLayers = (
    <>
      <MediaStudio
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        initialContext="delvers-post"
        onCreated={post => {
          setCreatePostOpen(false)
          setLastCreatedPost(post)
          setSocialRefreshKey(k => k + 1)
          goToNav('Delvers')
          window.setTimeout(() => setLastCreatedPost(null), 5000)
        }}
      />
      <CreateCommunitySheet
        open={createCommunityOpen}
        onClose={() => setCreateCommunityOpen(false)}
        onCreated={id => {
          setCreateCommunityOpen(false)
          setCommunityDetailId(id)
          setSocialRefreshKey(k => k + 1)
        }}
      />
      <CreateEventSheet
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        onCreated={id => {
          setCreateEventOpen(false)
          setEventsInitialTab('discover')
          openEventDetail(id)
          setSocialRefreshKey(k => k + 1)
        }}
      />
      <EventDetailSheet
        eventId={eventDetailId}
        onClose={closeEventDetail}
        signedIn={signedIn}
        onSignIn={() => openAuth('signIn')}
        onEdit={id => {
          setEditEventId(id)
        }}
        onOpenProfile={uname => openProfile(uname)}
        onUpdated={() => setSocialRefreshKey(k => k + 1)}
        onSharedToDelvers={() => {
          setSocialRefreshKey(k => k + 1)
          goToNav('Delvers')
        }}
      />
      <EditEventSheet
        eventId={editEventId}
        onClose={() => setEditEventId(null)}
        onUpdated={ev => {
          setEditEventId(null)
          openEventDetail(ev.id)
          setSocialRefreshKey(k => k + 1)
        }}
      />
    </>
  )



  const navItems = [
    { label: 'Home', icon: <Home size={22} aria-hidden /> },
    { label: 'Delvers', icon: <Flame size={22} aria-hidden /> },
    { label: 'Communities', icon: <Users size={22} aria-hidden /> },
    { label: 'Journeys', icon: <Navigation size={22} aria-hidden /> },
    { label: 'Events', icon: <Calendar size={22} aria-hidden /> },
  ]

  const EXPLORE_ROUTES = new Set(['Explore', 'Search', 'Services', 'Transport'])

  const currentPath = normalizePath(location.pathname)

  // ── Dedicated Full-Page Auth Routes ──────────────────────────────────
  if (currentPath === '/login') {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <PublicOnlyRoute redirectPath="/account">
          <SignInScreen
            headerTrailing={<ThemeToggle theme={theme} setTheme={setTheme} />}
            onSignedIn={handleSignedIn}
            onNavigateSignUp={() => navigate('/signup', { state: location.state })}
            onNavigateForgotPassword={() => navigate('/forgot-password', { state: location.state })}
            onNavigateVerifyEmail={email => navigate('/verify-email', { state: { email } })}
            onClose={() => navigate('/')}
          />
        </PublicOnlyRoute>
      </div>
    )
  }

  if (currentPath === '/signup') {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <PublicOnlyRoute redirectPath="/account">
          <SignUpScreen
            headerTrailing={<ThemeToggle theme={theme} setTheme={setTheme} />}
            onNavigateSignIn={() => navigate('/login', { state: location.state })}
            onComplete={() => navigate('/onboarding')}
            onClose={() => navigate('/')}
          />
        </PublicOnlyRoute>
      </div>
    )
  }

  if (currentPath === '/forgot-password') {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <PublicOnlyRoute redirectPath="/account">
          <ForgotPasswordFlow
            headerTrailing={<ThemeToggle theme={theme} setTheme={setTheme} />}
            onBackToSignIn={() => navigate('/login', { state: location.state })}
            onDone={() => navigate('/login')}
            onClose={() => navigate('/')}
          />
        </PublicOnlyRoute>
      </div>
    )
  }

  if (currentPath === '/verify-email') {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <EmailVerificationScreen
          headerTrailing={<ThemeToggle theme={theme} setTheme={setTheme} />}
          email={(location.state as { email?: string })?.email || user?.email || ''}
          onContinue={() => navigate('/account')}
          onChangeEmail={() => navigate('/signup')}
          onBackToSignIn={() => navigate('/login')}
          onClose={() => navigate('/')}
        />
      </div>
    )
  }

  if (showOnboarding && signedIn) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false)
            setShowOnboardingResume(false)
            goToNav('Home')
          }}
          onLeave={() => {
            setShowOnboarding(false)
            setShowOnboardingResume(true)
            goToNav('Home')
          }}
        />
      </div>
    )
  }

  if (location.pathname.startsWith('/account/email-change')) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <EmailChangeVerifyPage />
      </div>
    )
  }

  if (location.pathname.startsWith('/reset-password')) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <ResetPasswordPage />
      </div>
    )
  }

  if (location.pathname === '/business/create' || activeNav === 'Create business') {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        <CreateBusinessPage
          onBack={() => goToNav('Provider')}
          onSuccess={() => {
            goToNav('Provider business')
          }}
        />
      </div>
    )
  }



  // ── Provider dashboard (real business membership) ─────────────────────
  if (
    !parseBusinessSlug(location.pathname) &&
    (activeNav === 'Provider' || activeNav === 'Provider business' || businessAdminOpen)
  ) {
    return (
      <ProviderDashboardPage
        authReady={authReady}
        signedIn={signedIn}
        initialSection={activeNav === 'Provider business' ? 'profile' : 'overview'}
        onExit={() => {
          setBusinessAdminOpen(false)
          goToNav('Account')
        }}
      />
    )
  }

  const sidebarItems = [
    { label: 'Home', icon: <Home size={20} /> },
    { label: 'Explore', icon: <Compass size={20} /> },
    { label: 'Delvers', icon: <Flame size={20} /> },
    { label: 'Communities', icon: <Users size={20} /> },
    { label: 'Journeys', icon: <Navigation size={20} /> },
    { label: 'Events', icon: <Calendar size={20} /> },
    { label: 'Transport', icon: <Car size={20} /> },
    { label: 'Services', icon: <Map size={20} /> },
    { label: 'Deals', icon: <Tag size={20} /> },
    { label: 'Saved', icon: <Bookmark size={20} /> },
    { label: 'Messages', icon: <MessageCircle size={20} /> },
    { label: 'Account', icon: <User size={20} /> },
  ]

  const headerLinks = ['Deals', 'Transport', 'Journeys', 'Events', 'Delvers', 'Communities']
  const homeCompanyLinks = [
    { label: 'Become a service provider', route: 'Become a provider' },
    { label: 'About Delve', route: 'About' },
    { label: 'Investors', route: 'Investors' },
    { label: 'Contact', route: 'Contact' },
  ]
  const isHome = activeNav === 'Home'
  const isCompanyPage = COMPANY_ROUTES.has(activeNav)
  const showCompanyHeaderLinks = isHome || isCompanyPage
  const isFeedLayout = activeNav === 'Delvers' || activeNav === 'Transport' || activeNav === 'Services'
  const isServicesDetail = activeNav === 'Services' && !!servicesSelectedId
  const mainMaxClass =
    isHome ? 'max-w-[1280px] w-full' :
    isServicesDetail ? 'max-w-none w-full' :
    activeNav === 'Messages' ? 'max-w-[1100px] w-full' :
    isCompanyPage ? 'max-w-[1160px] w-full' :
    activeNav === 'Services' ? 'max-w-[680px]' :
    isFeedLayout ? 'max-w-[620px]' :
    'max-w-[720px]'

  function isSidebarActive(label: string) {
    if (label === 'Explore') return activeNav === 'Explore' || activeNav === 'Search'
    if (label === 'Account') return activeNav === 'Account' || activeNav === 'Profile' || activeNav === 'Notifications'
    return activeNav === label
  }

  function isMobileNavActive(label: string) {
    return activeNav === label
  }

  function renderMain() {
    const businessSlug = parseBusinessSlug(location.pathname)
    if (activeNav === 'Business' || businessSlug) {
      return (
        <PublicBusinessPage
          slug={businessSlug || ''}
          onBack={() => {
            if (window.history.length > 1) navigate(-1)
            else goToNav('Home')
          }}
          onOpenListing={id => {
            setServicesSelectedId(id)
            goToNav('Services')
          }}
          onOpenDeal={id => {
            setDealsSelectedId(id)
            goToNav('Deals')
          }}
        />
      )
    }
    if (activeNav === 'Verify email' || location.pathname.startsWith('/verify-email')) {
      return <VerifyEmailPage />
    }
    if (COMPANY_ROUTES.has(activeNav)) {
      return <CompanyPage
        route={activeNav as CompanyRoute}
        onNavigate={setActiveNav}
      />
    }
    if (activeNav === 'Delvers') {
      return (
        <DelversFeedPage
          onCreate={openCreate}
          onOpenMessages={() => setActiveNav('Messages')}
          onOpenNotifications={() => setActiveNav('Notifications')}
          onOpenProfile={uname => openProfile(uname)}
          onOpenEvent={openEventDetail}
          onOpenJourney={id => {
            setActiveNav('Journeys')
            setJourneyDetailId(id)
          }}
          refreshKey={socialRefreshKey}
          highlightPost={lastCreatedPost}
          authReady={authReady}
          signedIn={signedIn}
        />
      )
    }
    if (activeNav === 'Communities') {
      if (communityDetailId) {
        return (
          <CommunityDetailPage
            communityId={communityDetailId}
            initialThreadId={communityInitialThreadId}
            signedIn={signedIn}
            onBack={() => {
              setCommunityDetailId(null)
              setCommunityInitialThreadId(null)
            }}
            onSignIn={() => openAuth('signIn')}
            onOpenProfile={uname => openProfile(uname)}
            onOpenJourney={id => {
              setCommunityDetailId(null)
              setActiveNav('Journeys')
              setJourneyDetailId(id)
            }}
            onOpenEvent={openEventDetail}
            onOpenGroupChat={id => {
              setMessagesCommunityId(id)
              setActiveNav('Messages')
            }}
            onOpenDirectMessage={id => {
              setMessagesTargetUserId(id)
              setActiveNav('Messages')
            }}
          />
        )
      }
      return (
        <CommunitiesPage
          signedIn={signedIn}
          onSignIn={() => openAuth('signIn')}
          onOpenCommunity={id => setCommunityDetailId(id)}
          onCreateCommunity={() => {
            if (!signedIn) {
              openAuth('signIn')
              return
            }
            setCreateCommunityOpen(true)
          }}
        />
      )
    }
    if (activeNav === 'Journeys') {
      if (journeyDetailId) {
        return (
          <JourneyDetailPage
            journeyId={journeyDetailId}
            signedIn={signedIn}
            onBack={() => setJourneyDetailId(null)}
            onSignIn={() => openAuth('signIn')}
            onOpenProfile={uname => openProfile(uname)}
            onOpenEvent={openEventDetail}
            onOpenGroupChat={id => {
              setMessagesJourneyId(id)
              setActiveNav('Messages')
            }}
            onSharedToDelvers={() => setSocialRefreshKey(k => k + 1)}
          />
        )
      }
      return (
        <JourneysPage
          signedIn={signedIn}
          onSignIn={() => openAuth('signIn')}
          onOpenJourney={id => setJourneyDetailId(id)}
          onOpenProfile={uname => openProfile(uname)}
          refreshKey={socialRefreshKey}
          destinationHint={servicesDestination}
          createRequestKey={journeysCreateRequestKey}
        />
      )
    }
    if (activeNav === 'Events') {
      return (
        <EventsPage
          signedIn={signedIn}
          onSignIn={() => openAuth('signIn')}
          onOpenEvent={openEventDetail}
          onCreateEvent={() => setCreateEventOpen(true)}
          onOpenProfile={uname => openProfile(uname)}
          initialTab={eventsInitialTab}
          refreshKey={socialRefreshKey}
        />
      )
    }
    if (activeNav === 'Services') return <ServicesPage {...servicesBrowseProps} />
    if (activeNav === 'Search' || activeNav === 'Explore')
      return <SearchPage
        onNavigate={target => {
          if (target === 'Events') setEventsInitialTab('discover')
          setActiveNav(target)
        }}
        onOpenProfile={uname => openProfile(uname)}
        onOpenJourney={id => {
          setActiveNav('Journeys')
          setJourneyDetailId(id)
        }}
        onOpenEvent={openEventDetail}
        onOpenCommunity={id => {
          setActiveNav('Communities')
          setCommunityDetailId(id)
          setCommunityInitialThreadId(null)
        }}
        onOpenCommunityThread={id => void openCommunityThread(id)}
        onOpenDeal={id => {
          setDealsSelectedId(id)
          goToNav('Deals')
        }}
      />
    if (activeNav === 'Deals')
      return (
        <DealsPage
          key={dealsSelectedId || 'deals-browse'}
          onOpenBusiness={openBusiness}
          initialDealId={dealsSelectedId}
          onClearInitialDeal={() => setDealsSelectedId(null)}
          onOpenListing={id => {
            setDealsSelectedId(null)
            setServicesSelectedId(id)
            goToNav('Services')
          }}
        />
      )
    if (activeNav === 'Transport') return <TransportPage />
    if (HUB_ROUTES.has(activeNav) || activeNav === 'Account settings') {
      return (
        <ProtectedRoute redirectPath="/login">
          {activeNav === 'Profile' && (
            <ProfilePage
              username={profileUsername}
              viewerUserId={user?.id}
              authReady={authReady}
              signedIn={signedIn}
              onBack={openAccountHub}
              onCreatePost={openCreate}
              onCreateEvent={() => setCreateEventOpen(true)}
              onOpenEvent={openEventDetail}
              onOpenJourney={id => {
                setActiveNav('Journeys')
                setJourneyDetailId(id)
              }}
              onOpenUser={uname => openProfile(uname)}
              onOpenCommunities={() => setActiveNav('Communities')}
              contentRefreshKey={socialRefreshKey}
              onEditProfile={openEditProfile}
              onOpenAccountSettings={() => openAccountSettings('profile')}
              onMessageUser={id => {
                setMessagesTargetUserId(id)
                setActiveNav('Messages')
              }}
            />
          )}
          {activeNav === 'Messages' && (
            <MessagesPage
              signedIn={signedIn}
              authReady={authReady}
              onSignIn={() => openAuth('signIn')}
              openJourneyId={messagesJourneyId}
              onJourneyOpened={() => setMessagesJourneyId(null)}
              openCommunityId={messagesCommunityId}
              onCommunityOpened={() => setMessagesCommunityId(null)}
              openConversationId={messagesConversationId}
              onConversationOpened={() => setMessagesConversationId(null)}
              openUserId={messagesTargetUserId}
              onUserOpened={() => setMessagesTargetUserId(null)}
              onOpenJourney={id => {
                setActiveNav('Journeys')
                setJourneyDetailId(id)
              }}
              onOpenCommunity={id => {
                setActiveNav('Communities')
                setCommunityDetailId(id)
                setCommunityInitialThreadId(null)
              }}
            />
          )}
          {activeNav === 'Saved' && (
            <SavedPage
              onOpenEvent={openEventDetail}
              onOpenJourney={id => {
                setActiveNav('Journeys')
                setJourneyDetailId(id)
              }}
              onOpenCommunityThread={id => void openCommunityThread(id)}
              onOpenDeal={id => {
                setDealsSelectedId(id)
                goToNav('Deals')
              }}
              authReady={authReady}
              signedIn={signedIn}
            />
          )}
          {activeNav === 'Notifications' && (
            <NotificationsPage
              authReady={authReady}
              signedIn={signedIn}
              onOpenJourney={id => {
                setActiveNav('Journeys')
                setJourneyDetailId(id)
              }}
              onOpenEvent={openEventDetail}
              onOpenConversation={id => {
                setMessagesConversationId(id)
                setActiveNav('Messages')
              }}
              onOpenCommunityThread={id => void openCommunityThread(id)}
            />
          )}
          {(accountSettingsOpen || activeNav === 'Account settings') && (
            <AccountSettingsPage
              onSignOut={handleSignOut}
              onOpenOnboarding={() => setShowOnboarding(true)}
              onBack={openAccountHub}
              initialSection={settingsInitialSection}
            />
          )}
          {activeNav === 'Account' && !accountSettingsOpen && (
            <>
              {showOnboardingResume && (
                <div className="mb-3 rounded-2xl px-3 py-3 flex items-center justify-between gap-3" style={{ background: 'rgba(140,82,255,0.1)', border: '1px solid var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--fg)' }}>Finish setting up your Delve profile when you are ready.</p>
                  <button
                    type="button"
                    className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
                    onClick={() => setShowOnboarding(true)}
                  >
                    Resume
                  </button>
                </div>
              )}
              <AccountDashboardPage
                travelerName={user?.username ?? 'Traveler'}
                authReady={authReady}
                signedIn={signedIn}
                onOpenJourney={id => {
                  setActiveNav('Journeys')
                  setJourneyDetailId(id)
                }}
                onOpenEvent={openEventDetail}
                onNavigate={target => {
                  if (target === 'Profile') {
                    setAccountSettingsOpen(false)
                    setProfileUsername(null)
                  }
                  if (target === 'Events') {
                    setEventsInitialTab('attending')
                  }
                  handleAccountNavigate(target)
                }}
                onOpenBusinessAdmin={() => goToNav('Provider')}
                onSignOut={handleSignOut}
                onOpenSettings={() => openAccountSettings('profile')}
                onEditProfile={openEditProfile}
              />
            </>
          )}
        </ProtectedRoute>
      )
    }

    return (
      <HomePage
        onNavigate={setActiveNav}
        onOpenListing={id => {
          setServicesSelectedId(id)
          goToNav('Services')
        }}
        onOpenDeal={id => {
          setDealsSelectedId(id)
          goToNav('Deals')
        }}
        onOpenJourney={id => {
          setJourneyDetailId(id)
          goToNav('Journeys')
        }}
        onOpenTransport={() => goToNav('Transport')}
        onOpenExplore={() => goToNav('Explore')}
        onOpenServices={category => {
          if (category) setServicesCategory(category)
          goToNav('Services')
        }}
        signedIn={signedIn}
        onSignIn={() => openAuth('signIn')}
      />
    )
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
      <ShimmerStyle />

      <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {/* Primary header row — never wraps into unpredictable rows */}
        <div className="max-w-[1280px] mx-auto px-3 md:px-6 h-14 flex items-center gap-2 md:gap-4 min-w-0">
          <DelveLogo size="md" showWordmark={false} onClick={() => setActiveNav('Home')} ariaLabel="DELVE Home" />

          <button type="button" onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}>
            <Menu size={22} />
          </button>

          {/* Desktop / tablet search */}
          <div className="hidden sm:block flex-1 relative min-w-0" style={{ maxWidth: 360 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} aria-hidden />
            <input placeholder="Search places, people…"
              className="w-full pl-9 pr-3 rounded-xl text-base min-w-0"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 38 }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--primary)'
                if (activeNav !== 'Search' && activeNav !== 'Explore') setActiveNav('Explore')
              }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              aria-label="Search"
            />
          </div>

          {/* Narrow phones: icon search keeps logo readable */}
          <button type="button" onClick={() => setActiveNav('Explore')}
            className="sm:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            style={{ color: activeNav === 'Explore' || activeNav === 'Search' ? 'var(--primary)' : 'var(--fg-muted)' }}
            aria-label="Search and Explore">
            <Search size={20} />
          </button>

          <button type="button" className="hidden md:flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium flex-shrink-0"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', height: 38 }}>
            <MapPin size={13} style={{ color: 'var(--primary)' }} aria-hidden />
            Swakopmund
          </button>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {showCompanyHeaderLinks
              ? homeCompanyLinks.map(link => (
                <button key={link.route} type="button" onClick={() => setActiveNav(link.route)}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activeNav === link.route ? 'rgba(140,82,255,0.1)' : 'transparent',
                    color: activeNav === link.route ? 'var(--primary)' : 'var(--fg-muted)',
                    fontWeight: activeNav === link.route ? 600 : 400,
                  }}>
                  {link.label}
                </button>
              ))
              : headerLinks.map(l => (
                <button key={l} type="button" onClick={() => setActiveNav(l)}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: activeNav === l ? 'rgba(140,82,255,0.1)' : 'transparent',
                    color: activeNav === l ? 'var(--primary)' : 'var(--fg-muted)',
                    fontWeight: activeNav === l ? 600 : 400,
                  }}>{l}</button>
              ))}
          </nav>

          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 relative">
            <div className="hidden md:block">
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
            <div className="hidden sm:block">
              <CreatePostButton variant="header" onClick={openCreate} />
            </div>
            <button type="button" onClick={() => setActiveNav('Notifications')}
              className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: activeNav === 'Notifications' ? 'var(--primary)' : 'var(--fg-muted)' }}
              aria-label={notificationUnreadCount > 0 ? `Notifications, ${notificationUnreadCount} unread` : 'Notifications'}>
              <Bell size={20} />
              {notificationUnreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}
                  aria-hidden
                >
                  {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                </span>
              )}
            </button>
            <button type="button" onClick={() => setActiveNav('Messages')}
              className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: activeNav === 'Messages' ? 'var(--primary)' : 'var(--fg-muted)' }}
              aria-label={messageUnreadCount > 0 ? `Messages, ${messageUnreadCount} unread` : 'Messages'}>
              <MessageCircle size={20} />
              {messageUnreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}
                  aria-hidden
                >
                  {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                </span>
              )}
            </button>

            {/* Mobile More — theme, create, account */}
            <button type="button" onClick={() => setHeaderMoreOpen(o => !o)}
              className="md:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: headerMoreOpen ? 'var(--primary)' : 'var(--fg-muted)' }}
              aria-label="More actions"
              aria-expanded={headerMoreOpen}>
              <MoreHorizontal size={20} />
            </button>

            {signedIn ? (
              <button type="button" onClick={() => setActiveNav('Account')}
                className="px-3 py-2 rounded-xl text-sm font-semibold hidden lg:flex items-center gap-2"
                style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
                <CheckCircle size={14} /> {formatUsername(user?.username) || 'Account'}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => openAuth('signIn')}
                  className="px-3 py-2 rounded-xl text-sm font-medium hidden lg:block"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                  Sign in
                </button>
                <button type="button" onClick={() => openAuth('signUp')}
                  className="px-3 py-2 rounded-xl text-sm font-semibold hidden lg:block"
                  style={{ background: 'var(--primary)', color: '#fff' }}>Sign up</button>
              </>
            )}

            {headerMoreOpen && (
              <div
                className="md:hidden absolute right-0 top-full mt-2 w-[min(100vw-24px,260px)] rounded-2xl p-2 z-[60] shadow-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                role="menu"
                aria-label="More header actions">
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Appearance</p>
                  <ThemeToggle theme={theme} setTheme={setTheme} />
                </div>
                <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); openCreate() }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                  style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Plus size={18} style={{ color: 'var(--primary)' }} /> Create
                </button>
                <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); setActiveNav('Account') }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                  style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <User size={18} style={{ color: 'var(--primary)' }} /> Account
                </button>
                <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); setMobileMenuOpen(true) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                  style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Compass size={18} style={{ color: 'var(--primary)' }} /> Browse destinations
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Full-width search row on narrow phones */}
        <div className="sm:hidden px-3 pb-3">
          <div className="relative min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} aria-hidden />
            <input placeholder="Search places, people…"
              className="w-full pl-9 pr-3 rounded-xl text-sm min-w-0"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 44 }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--primary)'
                if (activeNav !== 'Search' && activeNav !== 'Explore') setActiveNav('Explore')
              }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              aria-label="Search"
            />
          </div>
        </div>
      </header>

      <div className={`${isServicesDetail ? 'max-w-[1600px]' : 'max-w-[1280px]'} mx-auto px-0 sm:px-4 md:px-6 py-0 sm:py-4 md:py-6 flex gap-6`}>
        <aside className={`${isServicesDetail ? 'hidden xl:flex' : 'hidden lg:flex'} flex-col gap-1 flex-shrink-0`} style={{ width: 220 }}>
          <div className="sticky top-20">
            <nav className="flex flex-col gap-0.5 mb-6">
              {sidebarItems.map(item => (
                <button key={item.label} type="button" onClick={() => setActiveNav(item.label)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
                  style={{
                    background: isSidebarActive(item.label) ? 'rgba(140,82,255,0.1)' : 'transparent',
                    color: isSidebarActive(item.label) ? 'var(--primary)' : 'var(--fg-muted)',
                    fontWeight: isSidebarActive(item.label) ? 600 : 400,
                  }}>
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            {isHome && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>Explore</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Stays', icon: '🏨' },
                    { label: 'Deals', icon: '🏷️' },
                    { label: 'Transport', icon: '🚗' },
                    { label: 'Food', icon: '🍽️' },
                  ].map(c => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setActiveNav('Explore')}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--fg)] cursor-pointer"
                    >
                      <span className="flex-shrink-0 inline-flex items-center text-[var(--primary)]">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs px-1" style={{ color: 'var(--fg-muted)' }}>
              © 2026 Delve Worldwide
            </p>
          </div>
        </aside>

        <main className={`flex-1 min-w-0 ${mainMaxClass}`}>
          {renderMain()}
        </main>



        {activeNav === 'Transport' && <TransportAside />}
        {activeNav === 'Services' && !servicesSelectedId && <ServicesAside {...servicesBrowseProps} />}
      </div>

      {/* Mobile full menu — pages that are desktop-sidebar / header only */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[80] flex flex-col justify-end">
          <button type="button" aria-label="Close menu"
            className="absolute inset-0 border-0 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileMenuOpen(false)} />
          <div
            className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-3xl px-4 pt-3 pb-8"
            style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                Menu
              </p>
              <button type="button" onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
                aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              Explore
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { label: 'Search', icon: <Search size={18} />, route: 'Explore' },
                { label: 'Services', icon: <Map size={18} />, route: 'Services' },
                { label: 'Transport', icon: <Car size={18} />, route: 'Transport' },
                { label: 'Delvers', icon: <Flame size={18} />, route: 'Delvers' },
                { label: 'Communities', icon: <Users size={18} />, route: 'Communities' },
                { label: 'Deals', icon: <Tag size={18} />, route: 'Deals' },
                { label: 'Journeys', icon: <Navigation size={18} />, route: 'Journeys' },
                { label: 'Events', icon: <Calendar size={18} />, route: 'Events' },
              ].map(item => (
                <button key={item.label} type="button"
                  onClick={() => { setActiveNav(item.route); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl text-sm font-semibold text-left min-w-0"
                  style={{
                    background: isSidebarActive(item.route === 'Explore' ? 'Explore' : item.label) || (item.route === 'Explore' && (activeNav === 'Search' || activeNav === 'Explore'))
                      ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                    color: isSidebarActive(item.route === 'Explore' ? 'Explore' : item.label) || (item.route === 'Explore' && (activeNav === 'Search' || activeNav === 'Explore'))
                      ? 'var(--primary)' : 'var(--fg)',
                    border: '1px solid var(--border)',
                    minHeight: 52,
                  }}>
                  <span className="flex-shrink-0" style={{ color: 'var(--primary)' }}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              Your hub
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { label: 'Saved', icon: <Bookmark size={18} />, route: 'Saved' },
                { label: 'Messages', icon: <MessageCircle size={18} />, route: 'Messages' },
                { label: 'Notifications', icon: <Bell size={18} />, route: 'Notifications' },
                { label: 'Account', icon: <User size={18} />, route: 'Account' },
              ].map(item => (
                <button key={item.route} type="button"
                  onClick={() => { setActiveNav(item.route); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl text-sm font-semibold text-left"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    minHeight: 52,
                  }}>
                  <span style={{ color: 'var(--primary)' }}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {item.route === 'Notifications' && notificationUnreadCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-indigo-600">
                      {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                    </span>
                  )}
                  {item.route === 'Messages' && messageUnreadCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-indigo-600">
                      {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              Delve Worldwide
            </p>
            <div className="flex flex-col gap-2 mb-2">
              {homeCompanyLinks.map(link => (
                <button key={link.route} type="button"
                  onClick={() => { setActiveNav(link.route); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl text-sm font-semibold text-left"
                  style={{
                    background: link.route === 'Become a provider' ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                    color: link.route === 'Become a provider' ? 'var(--primary)' : 'var(--fg)',
                    border: `1px solid ${link.route === 'Become a provider' ? 'transparent' : 'var(--border)'}`,
                    minHeight: 52,
                  }}>
                  {link.route === 'Become a provider' && <Building2 size={18} />}
                  {link.route === 'About' && <HelpCircle size={18} style={{ color: 'var(--primary)' }} />}
                  {link.route === 'Investors' && <Briefcase size={18} style={{ color: 'var(--primary)' }} />}
                  {link.route === 'Contact' && <Mail size={18} style={{ color: 'var(--primary)' }} />}
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-[env(safe-area-inset-bottom)]"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        aria-label="Mobile navigation">
        <div className="mobile-nav__row">
          {navItems.map(item => (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              aria-current={isMobileNavActive(item.label) ? 'page' : undefined}
              onClick={() => setActiveNav(item.label)}
              className="mobile-nav__item active:scale-95 transition-transform"
              style={{ color: isMobileNavActive(item.label) ? 'var(--primary)' : 'var(--fg-muted)' }}
            >
              {item.icon}
              <span className="mobile-nav__label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mobile-shell-spacer lg:hidden" aria-hidden />

      <div className="hidden sm:block">
        <AuthRequiredModal
          open={guestPrompt !== null}
          action={guestPrompt ?? 'generic'}
          destinationLabel="your feed"
          onSignIn={() => openAuth('signIn')}
          onCreateAccount={() => openAuth('signUp')}
          onClose={() => setGuestPrompt(null)}
        />
      </div>
      <div className="sm:hidden">
        <AuthRequiredBottomSheet
          open={guestPrompt !== null}
          action={guestPrompt ?? 'generic'}
          onSignIn={() => openAuth('signIn')}
          onCreateAccount={() => openAuth('signUp')}
          onClose={() => setGuestPrompt(null)}
          onContinueBrowsing={() => setGuestPrompt(null)}
        />
      </div>


      <InAppNotificationToast
        notification={activeToast}
        onDismiss={dismissToast}
        onOpen={handleNotificationSelect}
      />

      {createLayers}
    </div>
  )
}
