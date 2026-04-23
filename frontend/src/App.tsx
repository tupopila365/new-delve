import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { Account } from './pages/Account'
import { AccommodationBook } from './pages/AccommodationBook'
import { AccommodationDetail } from './pages/AccommodationDetail'
import { AccommodationList } from './pages/AccommodationList'
import { AccommodationStoryNew } from './pages/AccommodationStoryNew'
import { BusTripDetail } from './pages/BusTripDetail'
import { CreatePost } from './pages/CreatePost'
import { Delvers } from './pages/Delvers'
import { DelversNew } from './pages/DelversNew'
import { EventDetail } from './pages/EventDetail'
import { EventsList } from './pages/EventsList'
import { FoodDetail } from './pages/FoodDetail'
import { FoodList } from './pages/FoodList'
import { GuideDetail } from './pages/GuideDetail'
import { GuidesList } from './pages/GuidesList'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Messages } from './pages/Messages'
import { MessageThread } from './pages/MessageThread'
import { PostDetail } from './pages/PostDetail'
import { Register } from './pages/Register'
import { SearchPage } from './pages/SearchPage'
import { Settings } from './pages/Settings'
import { Transport } from './pages/Transport'
import { UserProfile } from './pages/UserProfile'
import { VehicleDetail } from './pages/VehicleDetail'
import { VerifyEmail } from './pages/VerifyEmail'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/u/:username" element={<UserProfile />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/accommodation" element={<AccommodationList />} />
        <Route path="/accommodation/stories/new" element={<AccommodationStoryNew />} />
        <Route path="/accommodation/:id" element={<AccommodationDetail />} />
        <Route path="/accommodation/:id/book" element={<AccommodationBook />} />
        <Route path="/delvers" element={<Delvers />} />
        <Route path="/delvers/new" element={<DelversNew />} />
        <Route path="/transport" element={<Transport />} />
        <Route path="/transport/vehicle/:id" element={<VehicleDetail />} />
        <Route path="/transport/bus/:id" element={<BusTripDetail />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/food" element={<FoodList />} />
        <Route path="/food/:id" element={<FoodDetail />} />
        <Route path="/guides" element={<GuidesList />} />
        <Route path="/guides/:id" element={<GuideDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<MessageThread />} />
        <Route path="/account" element={<Account />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
