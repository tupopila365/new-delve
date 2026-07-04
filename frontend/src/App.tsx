import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProfileMessageLinkInterceptor } from './components/ProfileMessageLinkInterceptor'
import { Account } from './pages/Account'
import { AccommodationBook } from './pages/AccommodationBook'
import { BookingDetail } from './pages/BookingDetail'
import { AccommodationDetail } from './pages/AccommodationDetail'
import { AccommodationRoomDetail } from './pages/AccommodationRoomDetail'
import { AccommodationList } from './pages/AccommodationList'
import { AccommodationStoryNew } from './pages/AccommodationStoryNew'
import { BusTripDetail } from './pages/BusTripDetail'
import { Community } from './pages/Community'
import { CreateHub } from './pages/CreateHub'
import { CreatePost } from './pages/CreatePost'
import { CreateAsk } from './pages/CreateAsk'
import { CreateStory } from './pages/CreateStory'
import { StoriesNewRedirect } from './pages/StoriesNewRedirect'
import { DelversSocial } from './pages/DelversSocial'
import { DelversPostDetail } from './pages/DelversPostDetail'
import { EventDetail } from './pages/EventDetail'
import { EventsList } from './pages/EventsList'
import { FoodDetail } from './pages/FoodDetail'
import { FoodList } from './pages/FoodList'
import { GuideDetail } from './pages/GuideDetail'
import { TourPackageDetail } from './pages/TourPackageDetail'
import { GuidePackageBook } from './pages/GuidePackageBook'
import { CreateEvent } from './pages/CreateEvent'
import { EventMomentNew } from './pages/EventMomentNew'
import { EditEvent } from './pages/EditEvent'
import { GuidesList } from './pages/GuidesList'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Messages } from './pages/Messages'
import { MessageThread } from './pages/MessageThread'
import { MessageUser } from './pages/MessageUser'
import { Register } from './pages/Register'
import { SearchPage } from './pages/SearchPage'
import { Settings } from './pages/Settings'
import { Transport } from './pages/Transport'
import { TripDetail } from './pages/TripDetail'
import { TripsList } from './pages/TripsList'
import { CreateJourney } from './pages/CreateJourney'
import { UserProfile } from './pages/UserProfile'
import { VehicleDetail } from './pages/VehicleDetail'
import { VerifyEmail } from './pages/VerifyEmail'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { ProviderOnboarding } from './pages/ProviderOnboarding'
import { BecomeProvider } from './pages/BecomeProvider'
import { ProviderLayout } from './components/ProviderLayout'
import { ProviderDashboard } from './pages/ProviderDashboard'
import { ProviderPromotions } from './pages/ProviderPromotions'
import { ProviderQuestions } from './pages/ProviderQuestions'
import { ProviderListings } from './pages/ProviderListings'
import { ProviderBookings } from './pages/ProviderBookings'
import { ProviderReviews } from './pages/ProviderReviews'
import { ProviderSettings } from './pages/ProviderSettings'
import { ProviderAnalytics } from './pages/ProviderAnalytics'
import { ProviderMessages } from './pages/ProviderMessages'
import { ProviderMessagingSettingsPage } from './pages/ProviderMessagingSettingsPage'
import { ProviderMessageThread } from './pages/ProviderMessageThread'
import { ProviderMessageUser } from './pages/ProviderMessageUser'
import { StaysAdmin } from './pages/StaysAdmin'
import { GuidesAdmin } from './pages/GuidesAdmin'
import { TransportAdmin } from './pages/TransportAdmin'
import { FoodAdmin } from './pages/FoodAdmin'
import { EventsAdmin } from './pages/EventsAdmin'
import { UserDashboard } from './pages/UserDashboard'
import { BusinessProfile } from './pages/BusinessProfile'
import { PlatformAdminHandoff } from './pages/PlatformAdminHandoff'
import { ListingGalleryPage } from './pages/ListingGalleryPage'
import { ListingReviewsPage } from './pages/ListingReviewsPage'
import { ListingMomentsPage } from './pages/ListingMomentsPage'

function LegacyPostRedirect() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to="/delvers" replace />
  return <Navigate to={`/delvers/posts/${encodeURIComponent(id)}`} replace />
}

function LegacyGuidePackageBookRedirect() {
  const { guideId, packageSlug } = useParams<{ guideId: string; packageSlug: string }>()
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()
  const target = `/guides/${guideId}/book/${encodeURIComponent(packageSlug ?? '')}${qs ? `?${qs}` : ''}`
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <>
      <ProfileMessageLinkInterceptor />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateHub />} />
          <Route path="/create/post" element={<CreatePost />} />
          <Route path="/create/ask" element={<CreateAsk />} />
          <Route path="/create/highlight" element={<CreateStory />} />
          <Route path="/stories/new" element={<StoriesNewRedirect />} />
          <Route path="/delvers/new" element={<Navigate to="/create/highlight" replace />} />
          <Route path="/posts/:id" element={<LegacyPostRedirect />} />
          <Route path="/u/:username" element={<UserProfile />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard/bookings/:service/:id" element={<BookingDetail />} />
          <Route path="/business/:id" element={<BusinessProfile />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/accommodation" element={<AccommodationList />} />
          <Route path="/accommodation/stories/new" element={<AccommodationStoryNew />} />
          <Route path="/accommodation/:id" element={<AccommodationDetail />} />
          <Route path="/accommodation/:id/room/:roomSlug" element={<AccommodationRoomDetail />} />
          <Route path="/accommodation/:id/book" element={<AccommodationBook />} />
          <Route path="/journeys" element={<TripsList />} />
          <Route path="/journeys/new" element={<CreateJourney />} />
          <Route path="/journeys/:id/edit" element={<CreateJourney />} />
          <Route path="/journeys/:id" element={<TripDetail />} />
          <Route path="/delvers" element={<DelversSocial />} />
          <Route path="/delvers/posts/:id" element={<DelversPostDetail />} />
          <Route path="/delvers/pin/new" element={<Navigate to="/create/post" replace />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/posts/:id" element={<DelversPostDetail fallbackPath="/community" />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/transport/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/transport/bus/:id" element={<BusTripDetail />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events/new" element={<CreateEvent />} />
          <Route path="/events/:id/moment/new" element={<EventMomentNew />} />
          <Route path="/events/:id/edit" element={<EditEvent />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/food" element={<FoodList />} />
          <Route path="/food/:id" element={<FoodDetail />} />
          <Route path="/listing/:type/:id/gallery" element={<ListingGalleryPage />} />
          <Route path="/listing/:type/:id/reviews" element={<ListingReviewsPage />} />
          <Route path="/listing/:type/:id/moments" element={<ListingMomentsPage />} />
          <Route path="/guides" element={<GuidesList />} />
          <Route path="/guides/:guideId/book/:packageSlug" element={<GuidePackageBook />} />
          <Route
            path="/guides/:guideId/packages/:packageSlug/book"
            element={<LegacyGuidePackageBookRedirect />}
          />
          <Route path="/guides/:guideId/packages/:packageSlug" element={<TourPackageDetail />} />
          <Route path="/guides/:id" element={<GuideDetail />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/u/:username" element={<MessageUser />} />
          <Route path="/messages/:id" element={<MessageThread />} />
          <Route path="/account" element={<Account />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/*" element={<PlatformAdminHandoff />} />
          <Route path="/provider" element={<ProviderLayout />}>
            <Route index element={<ProviderDashboard />} />
            <Route path="listings" element={<ProviderListings />} />
            <Route path="promotions" element={<ProviderPromotions />} />
            <Route path="questions" element={<ProviderQuestions />} />
            <Route path="bookings" element={<ProviderBookings />} />
            <Route path="reviews" element={<ProviderReviews />} />
            <Route path="analytics" element={<ProviderAnalytics />} />
            <Route path="settings" element={<ProviderSettings />} />
            <Route path="messages" element={<ProviderMessages />} />
            <Route path="messages/settings" element={<ProviderMessagingSettingsPage />} />
            <Route path="messages/u/:username" element={<ProviderMessageUser />} />
            <Route path="messages/:id" element={<ProviderMessageThread />} />
            <Route path="stays" element={<StaysAdmin />} />
            <Route path="guides" element={<GuidesAdmin />} />
            <Route path="transport" element={<TransportAdmin />} />
            <Route path="food" element={<FoodAdmin />} />
            <Route path="events" element={<EventsAdmin />} />
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
        <Route path="/provider/start" element={<BecomeProvider />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
