import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProfileMessageLinkInterceptor } from './components/ProfileMessageLinkInterceptor'
import { Account } from './pages/Account'
import { AccommodationBook } from './pages/AccommodationBook'
import { AccommodationDetail } from './pages/AccommodationDetail'
import { AccommodationRoomDetail } from './pages/AccommodationRoomDetail'
import { AccommodationList } from './pages/AccommodationList'
import { AccommodationStoryNew } from './pages/AccommodationStoryNew'
import { BusTripDetail } from './pages/BusTripDetail'
import { Community } from './pages/Community'
import { CreateHub } from './pages/CreateHub'
import { CreatePost } from './pages/CreatePost'
import { CreateStory } from './pages/CreateStory'
import { DelversSocial } from './pages/DelversSocial'
import { DelversNew } from './pages/DelversNew'
import { EventDetail } from './pages/EventDetail'
import { EventsList } from './pages/EventsList'
import { FoodDetail } from './pages/FoodDetail'
import { FoodList } from './pages/FoodList'
import { GuideDetail } from './pages/GuideDetail'
import { TourPackageDetail } from './pages/TourPackageDetail'
import { GuidePackageBook } from './pages/GuidePackageBook'
import { CreateEvent } from './pages/CreateEvent'
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
import { ProviderLayout } from './components/ProviderLayout'
import { ProviderDashboard } from './pages/ProviderDashboard'
import { ProviderListings } from './pages/ProviderListings'
import { ProviderBookings } from './pages/ProviderBookings'
import { ProviderReviews } from './pages/ProviderReviews'
import { StaysAdmin } from './pages/StaysAdmin'
import { GuidesAdmin } from './pages/GuidesAdmin'
import { TransportAdmin } from './pages/TransportAdmin'
import { FoodAdmin } from './pages/FoodAdmin'
import { UserDashboard } from './pages/UserDashboard'
import { BusinessProfile } from './pages/BusinessProfile'
import { AdminLayout } from './components/AdminLayout'
import { PlatformAdmin } from './pages/PlatformAdmin'
import { PlatformAdminUsers } from './pages/PlatformAdminUsers'
import { PlatformAdminBusinesses } from './pages/PlatformAdminBusinesses'
import { PlatformAdminBookings } from './pages/PlatformAdminBookings'
import { ListingGalleryPage } from './pages/ListingGalleryPage'
import { ListingReviewsPage } from './pages/ListingReviewsPage'
import { ListingMomentsPage } from './pages/ListingMomentsPage'

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
          <Route path="/stories/new" element={<CreateStory />} />
          <Route path="/posts/:id" element={<Navigate to="/delvers" replace />} />
          <Route path="/u/:username" element={<UserProfile />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/business/:id" element={<BusinessProfile />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/accommodation" element={<AccommodationList />} />
          <Route path="/accommodation/stories/new" element={<AccommodationStoryNew />} />
          <Route path="/accommodation/:id" element={<AccommodationDetail />} />
          <Route path="/accommodation/:id/room/:roomSlug" element={<AccommodationRoomDetail />} />
          <Route path="/accommodation/:id/book" element={<AccommodationBook />} />
          <Route path="/journeys" element={<TripsList />} />
          <Route path="/journeys/new" element={<CreateJourney />} />
          <Route path="/journeys/:id" element={<TripDetail />} />
          <Route path="/delvers" element={<DelversSocial />} />
          <Route path="/delvers/new" element={<CreateStory />} />
          <Route path="/delvers/pin/new" element={<DelversNew />} />
          <Route path="/community" element={<Community />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/transport/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/transport/bus/:id" element={<BusTripDetail />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events/new" element={<CreateEvent />} />
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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<PlatformAdmin />} />
            <Route path="users" element={<PlatformAdminUsers />} />
            <Route path="businesses" element={<PlatformAdminBusinesses />} />
            <Route path="bookings" element={<PlatformAdminBookings />} />
          </Route>
          <Route path="/provider" element={<ProviderLayout />}>
            <Route index element={<ProviderDashboard />} />
            <Route path="listings" element={<ProviderListings />} />
            <Route path="bookings" element={<ProviderBookings />} />
            <Route path="reviews" element={<ProviderReviews />} />
            <Route path="stays" element={<StaysAdmin />} />
            <Route path="guides" element={<GuidesAdmin />} />
            <Route path="transport" element={<TransportAdmin />} />
            <Route path="food" element={<FoodAdmin />} />
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
