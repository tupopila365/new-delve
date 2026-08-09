Design the complete Delve Traveler Personal Hub, covering:

1. Messages and Inbox
2. Traveler Account and Dashboard
3. Public Traveler Profile
4. Saved and Collections
5. Notifications and Activity Center

These areas must work together as one connected experience and reuse the existing Delve Traveler design system, navigation, components, authentication system, Media Studio, Deals, Journeys, Communities, Transport, Booking and Payment designs.

Delve helps travelers find deals, transport, places, journeys, communities and trusted experiences from different service providers.

## Design principles

The experience should feel:

- Personal
- Adventurous
- Social
- Safe
- Trustworthy
- Easy to understand
- Useful before, during and after a trip

Do not create generic social-media or dashboard templates. Every screen must feel unmistakably connected to travel and the Delve ecosystem.

## Brand and visual system

Use Delve Purple as the main brand color.

Light theme:
- Canvas: #F4F1EA
- Surface: #FFFFFF
- Subtle surface: #FAF8F4
- Primary accessible purple: #5F2FC9
- Brand and focus purple: #8C52FF
- Main text: #1A1814
- Muted text: #6F695F
- Border: #DDD6CA
- Success: #16845B
- Warning: #B76808
- Error: #C83B3B
- Information: #2769C7

Dark theme:
- Canvas: #0C0A09
- Navigation: #12100F
- Surface: #1B1816
- Elevated surface: #24201E
- Primary purple: #8C52FF
- Focus purple: #C7ACFF
- Main text: #FFFAF2
- Muted text: #B8ADA3
- Border: #39322E

Typography:
- Syne for display headings and expressive travel moments.
- DM Sans for navigation, forms and interface text.
- Lucide icons throughout.

Create responsive designs for:
- Desktop: 1440px
- Tablet: 1024px
- Mobile: 390px

Support complete light and dark themes.

Use:
- Auto Layout
- Semantic variables
- Component properties
- Variants
- Named layers
- Minimum 44px touch targets
- WCAG AA contrast
- Visible keyboard focus states

Build final screens using component instances. Do not detach components or create unnecessary one-off elements.

## Figma page structure

Create these new Figma pages:

1. `26 Personal Hub Foundations`
2. `27 Personal Hub Components`
3. `28 Messages & Inbox`
4. `29 Traveler Account`
5. `30 Public Traveler Profile`
6. `31 Saved & Collections`
7. `32 Notifications`
8. `33 Personal Hub States`
9. `34 Personal Hub Prototype`
10. `35 Personal Hub Backend Handoff`

Keep new reusable components on `27 Personal Hub Components`. Reuse existing components from `02 Components` whenever possible.

## Traveler application shell

Reuse the existing Traveler navigation.

Desktop navigation:
- Home
- Explore
- Deals
- Transport
- Journeys
- Communities
- Delvers
- Saved
- Messages
- Notifications
- Profile

Mobile bottom navigation:
- Home
- Explore
- Journeys
- Messages
- Profile

Allow Notifications, Saved and Communities to be accessed from the Profile or More menu when they are not visible in the bottom navigation.

Include:
- Unread message badge
- Unread notification badge
- Traveler avatar
- Theme switcher
- Global search entry
- Authentication-required states

## 1. Messages and Inbox

Design a complete Traveler messaging system supporting:

- Personal conversations
- Group conversations
- Community chats
- Journey group chats
- Business conversations
- Transport-provider conversations
- Delve Support conversations
- Message requests
- Archived conversations

### Inbox layout

Desktop:
- Conversation navigation or filters
- Conversation list
- Active conversation panel
- Optional conversation-details panel
- Resizable or responsive layout

Tablet:
- Conversation list and active conversation
- Details shown in a drawer

Mobile:
- Inbox list as the first screen
- Conversation opens as a full-screen page
- Details open as a separate screen or bottom sheet

Inbox categories:
- All
- Unread
- Personal
- Journeys
- Communities
- Businesses
- Transport
- Support
- Requests
- Archived

Conversation-list items should show:
- Avatar or business logo
- Conversation name
- Verification indicator when applicable
- Conversation type
- Latest-message preview
- Timestamp
- Unread count
- Muted state
- Pinned state
- Delivery or failure indicator
- Typing indicator
- Booking, Journey or Community context when applicable

Include:
- Search conversations
- Filter conversations
- New-message action
- Create group
- Mark as unread
- Pin
- Mute
- Archive
- Delete from inbox
- Block
- Report
- Empty state
- Loading state
- Offline state
- Search with no results

### Personal conversation

Include:
- Traveler identity
- Online or recent activity only when privacy settings permit
- Follow relationship
- Shared Journey, Community or booking context
- Text messages
- Replies
- Reactions
- Images
- Videos
- Audio when enabled
- Locations
- Journey cards
- Deal cards
- Transport cards
- Place or listing cards
- Booking cards
- Date separators
- Unread-message divider
- Message timestamps
- Sent, delivered, read and failed states
- Typing state
- Message edit indicator when editing is supported
- Reply-to-message
- Copy
- Save media
- Delete for self
- Report message

Use the reusable Delve Media Studio for attaching images and videos. Music editing should only be available where appropriate and must not be added automatically to private messages.

### Group and Journey conversations

Include:
- Group name and image
- Participant count
- Participant list
- Administrators
- Invite participant
- Remove or leave group
- Shared Journey header
- Journey itinerary card
- Polls
- Pinned message
- Shared files and media
- Group description
- Mention another participant
- Reply threads where supported
- Mute settings
- Group privacy
- Report group

### Community chats

Include:
- Community identity
- Community rules
- Moderator indicators
- Join requirement
- Announcements
- General discussion
- Topic channels when enabled
- Pinned Community information
- Removed-message state
- Moderator notice
- Slow-mode state
- Restricted posting state
- Leave Community
- Report Community

### Business and transport conversations

Make business conversations visually distinct from personal chats.

Show:
- Business or provider name
- Verified-business badge
- Service category
- Response-time expectation when provided
- Linked booking
- Linked deal, transport service or listing
- Booking reference
- Support hours when available
- Automated-message label
- Employee or agent name where appropriate

Quick actions:
- View booking
- View ticket
- View transport details
- View deal
- Send location
- Request support
- Cancel or modify booking when permitted
- Report safety issue

Clearly label automated and promotional messages. Businesses must not appear as personal users.

### Message requests and safety

Create:
- Message-request inbox
- Accept request
- Decline request
- Block sender
- Report sender
- Restricted media preview
- Suspicious-link warning
- Possible spam warning
- Harassment-report flow
- Emergency or immediate-danger guidance
- Muted conversation
- Blocked-user state
- Unblocked confirmation
- Removed-content state
- Account-unavailable state

Do not expose read receipts, online status or private profile information when privacy settings disable them.

### Message composer

Create reusable composer states:
- Empty
- Typing
- Replying
- Editing
- Uploading
- Attachment processing
- Recording audio when supported
- Sending
- Send failed
- Offline
- Permission restricted
- Blocked
- Slow mode

Composer actions:
- Add photo
- Add video
- Add location
- Share Journey
- Share Deal
- Share transport
- Share listing
- Add document when permitted
- Add emoji
- Send message

## 2. Traveler Account and Dashboard

Design the signed-in Traveler Account as a personal travel dashboard.

The first screen must quickly answer:
- What is happening next?
- What do I need to act on?
- What have I saved?
- Where are my bookings and payments?
- How can I manage my account?

### Account dashboard

Include:
- Traveler greeting
- Profile-completion indicator
- Upcoming trip or booking
- Active Journey
- Pending booking request
- Booking change alert
- Saved deal ending soon
- Price-drop alert
- Unread messages
- Journey invitation
- Community activity
- Recent payment
- Quick actions
- Recently viewed items
- Recommended next actions

Quick actions:
- View bookings
- Open active Journey
- View saved items
- Create Journey
- Find transport
- Find deals
- Contact support

Create:
- New-account state
- Traveler with no bookings
- Active-traveler populated state
- Traveler currently on a Journey
- Account requiring verification
- Offline state
- Partial-data state
- Loading state

### My bookings

Create tabs:
- Upcoming
- Active
- Past
- Cancelled

Booking cards should support:
- Stay
- Activity
- Event
- Road transport
- Air transport
- Water transport
- Rental vehicle
- Community ride
- Airport transfer

Show:
- Booking reference
- Provider
- Date and time
- Location or route
- Participant count
- Booking status
- Payment status
- Ticket or QR-code access
- View details
- Contact provider
- Modify or cancel when permitted
- Add to Journey
- Download receipt
- Leave review after completion

### Active Journeys

Show:
- Journey cover
- Destination
- Dates
- Progress
- Travelers
- Upcoming itinerary item
- Shared budget
- Unread Journey-chat count
- Open Journey
- Add booking
- Invite traveler

### Payments and wallet area

Create:
- Saved payment methods
- Add payment method
- Default payment method
- Billing details
- Payment history
- Receipts
- Refunds
- Pending payments
- Failed payments
- Disputes
- Travel credits, vouchers or wallet balance only when enabled by the backend

Never show complete card or bank details.

Payment-method states:
- Active
- Default
- Expiring soon
- Expired
- Verification required
- Removed
- Unsupported

### Receipts and refunds

Include:
- Transaction date
- Booking reference
- Provider
- Payment method
- Currency
- Price breakdown
- Taxes
- Fees
- Discount
- Refund amount
- Payment status
- Refund status
- Download receipt
- Contact support

Refund states:
- Not requested
- Request submitted
- Under review
- Approved
- Partially approved
- Processing
- Refunded
- Declined
- Disputed

The backend and payment provider remain authoritative for money and refund status.

### Personal information

Design editable sections for:
- Profile photo
- First and last name
- Display name
- Date of birth when required
- Email
- Phone
- Home country
- Languages
- Emergency contact
- Travel interests
- Accessibility needs
- Dietary preferences
- Biography

Clearly separate:
- Private account information
- Information visible to followers
- Public profile information
- Booking-specific information shared with providers

### Security

Create:
- Change password
- Email verification
- Phone verification
- Sign-in methods
- Active sessions
- Sign out of other devices
- Two-factor authentication when enabled
- Passkeys when enabled
- Login alerts
- Recent security activity
- Download account data
- Deactivate account
- Delete account

Use confirmation and re-authentication patterns for sensitive actions.

### Privacy

Create controls for:
- Profile visibility
- Who can follow
- Who can message
- Message requests
- Online status
- Read receipts
- Journey visibility
- Community visibility
- Saved-items privacy
- Location sharing
- Activity visibility
- Search-engine discoverability when applicable
- Blocked accounts
- Muted accounts
- Advertising or personalization choices

Use plain explanations showing what each setting changes.

### Notification settings

Allow separate controls for:
- Messages
- Booking updates
- Transport changes
- Deals and price alerts
- Journey activity
- Community activity
- Delvers engagement
- New followers
- Reviews
- Security
- Product updates
- Marketing

Channels:
- In-app
- Push
- Email
- SMS where supported

Critical booking, security and safety notifications must be clearly distinguished from optional marketing notifications.

### Accessibility settings

Include:
- Text size
- Increased contrast
- Reduced motion
- Captions
- Screen-reader improvements
- Color-independent status indicators
- Reduce video autoplay
- Disable animated media previews
- Haptic feedback when supported

### Appearance

Include:
- Light theme
- Dark theme
- Use device setting
- Media autoplay preference
- Compact or comfortable content density where supported

## 3. Public Traveler Profile

Design the Traveler profile as both:
- The owner’s profile view
- Another traveler’s public profile view

### Profile header

Include:
- Profile photo
- Display name
- Username when supported
- Verified identity badge
- Location shared by the traveler
- Short biography
- Languages
- Travel interests
- Followers
- Following
- Mutual connections
- Follow button
- Message button
- More-actions menu

Owner actions:
- Edit profile
- Share profile
- View profile as another user

Visitor actions:
- Follow
- Unfollow
- Message
- Mute
- Block
- Report
- Share profile

Do not use identity verification to imply that Delve guarantees the traveler’s behavior or safety.

### Profile sections

Create tabs for:
- Delvers
- Journeys
- Communities
- Reviews
- About

Delvers:
- Image posts
- Video posts
- Carousels
- Journey posts
- Deal-linked posts
- Grid and feed options
- Pinned posts
- Processing-media state
- Removed-content state

Journeys:
- Public Journeys
- Followers-only Journeys
- Completed Journey highlights
- Upcoming public Journey
- Collaborative Journey indicators

Communities:
- Public Communities
- Communities the user helps manage
- Hidden private memberships
- Mutual Communities

Reviews:
- Reviews written by the traveler
- Verified-booking labels
- Media attached to reviews
- Rating
- Provider response
- Removed or disputed-review state

About:
- Biography
- Interests
- Languages
- Places visited
- Accessibility information only if deliberately made public
- Member-since date
- Travel style
- Social links when supported

### Profile privacy variants

Design complete variants for:
- Public profile
- Followers-only profile
- Private profile
- Profile viewed by follower
- Profile viewed by non-follower
- Blocked profile
- Deactivated profile
- Suspended profile
- Deleted profile
- Owner preview of public profile

Private-profile view should show limited information and a follow-request action.

## 4. Saved and Collections

Design a unified saved-items system.

Saved content types:
- Deals
- Transport
- Stays
- Restaurants
- Activities
- Events
- Places
- Delvers posts
- Journeys
- Communities
- Businesses

### Saved overview

Include:
- All saved items
- Recent saves
- Deal ending soon
- Price changed
- Availability changed
- Unavailable items
- Collections
- Collaborative collections
- Map view
- List view
- Grid view

Filters:
- Content type
- Destination
- Date
- Price
- Availability
- Deal status
- Transport mode
- Collection
- Recently saved

Sorting:
- Recently saved
- Price
- Rating
- Deal ending soon
- Distance
- Availability

### Collections

Allow travelers to:
- Create collection
- Name collection
- Add description
- Add cover image
- Choose icon or color
- Make private
- Share through a link
- Invite collaborators
- Move or copy saved items
- Remove item
- Rename collection
- Archive collection
- Delete collection

Create collection types:
- Private collection
- Shared collection
- Collaborative collection
- Journey-linked collection
- Automatically generated recent-saves collection

Collaborative collection features:
- Member avatars
- Owner and editor roles
- Add collaborator
- Remove collaborator
- Activity history
- Comments on saved items when enabled
- Suggested items
- Leave collection
- Transfer ownership when supported

### Saved-item card

Show:
- Image
- Content type
- Title
- Location or route
- Provider
- Verification status when applicable
- Current price
- Previous price when appropriate
- Price basis
- Deal status
- Availability
- Rating
- Saved date
- Collection membership
- Quick remove
- Move to collection
- Share
- Add to Journey
- Book or view details

States:
- Available
- Limited availability
- Price dropped
- Price increased
- Deal ending soon
- Deal expired
- Sold out
- Temporarily unavailable
- Permanently removed
- Provider suspended
- Content private
- Offline saved preview

Do not silently remove expired or unavailable items. Explain what changed and let users remove or retain the saved reference.

### Map view

Include:
- Map pins grouped by content type
- Selected-item preview card
- Search this area
- Map/list toggle
- Current location when permission is granted
- Location-permission denied state
- Items without precise location
- Clustered markers
- Accessible list alternative

### Price and availability alerts

Let travelers configure alerts for:
- Price drops
- Deal ending soon
- Availability restored
- Limited availability
- Transport schedule changes
- New dates
- Provider update

Allow channel and frequency controls. The backend determines when an alert is triggered.

## 5. Notifications and Activity Center

Create a centralized Notification and Activity Center.

Notification categories:
- All
- Bookings
- Transport
- Deals
- Journeys
- Communities
- Messages
- Delvers
- Followers
- Reviews
- Payments
- Security
- System

### Notification screen

Include:
- Notification groups by date
- Today
- Yesterday
- Earlier
- Unread indicator
- Notification icon
- Sender or service identity
- Short description
- Related content preview
- Timestamp
- Primary action
- More-actions menu

Actions:
- Open related content
- Mark as read
- Mark as unread
- Mute similar notifications
- Change notification settings
- Remove notification
- Report suspicious activity

Bulk actions:
- Mark all as read
- Clear selected
- Filter unread
- Open settings

### Notification types

Design examples for:

Bookings:
- Booking confirmed
- Booking declined
- Booking modified
- Booking cancelled
- Check-in reminder
- Review reminder

Transport:
- Departure reminder
- Gate, dock or pickup-location change
- Delay
- Cancellation
- Driver or operator assigned
- Transport arriving
- Schedule updated

Deals:
- Saved deal ending soon
- Price dropped
- Deal expired
- Deal available again
- New deal from a followed business

Journeys:
- Journey invitation
- Invitation accepted
- Itinerary changed
- New booking added
- Traveler joined
- Journey comment or chat activity

Communities:
- Join request approved
- New Community announcement
- Event reminder
- Moderator action
- Mention
- Reply

Messages and social activity:
- New message
- Message request
- New follower
- Follow request
- Delvers post liked
- Comment
- Reply
- Mention
- Shared post
- Tagged in media

Payments:
- Payment successful
- Payment failed
- Refund submitted
- Refund approved
- Refund completed
- Dispute update

Security:
- New sign-in
- Password changed
- Email or phone changed
- New authentication method added
- Suspicious activity
- Account restriction

Security notifications must be visually distinct and should not be removable before being opened when the backend requires acknowledgement.

### Grouped notifications

Create grouped states such as:
- Multiple people liked a post
- Several comments on one post
- Multiple Journey updates
- Repeated price changes for one saved item
- Multiple Community activities
- Multiple booking reminders

Avoid flooding users with many nearly identical notifications.

### Notification empty and error states

Create:
- No notifications
- No unread notifications
- No results for filter
- Notifications unavailable
- Offline cached state
- Loading skeleton
- Permission disabled
- Push permission denied
- Notification removed
- Related content unavailable

## Cross-feature connections

Demonstrate how the five systems connect:

- A saved Deal receives a price-drop notification.
- Opening the notification takes the traveler to the saved Deal.
- A traveler shares that Deal in a personal conversation.
- The recipient adds the Deal to a collaborative collection.
- The Deal is then added to a shared Journey.
- Journey participants discuss it in the Journey group chat.
- The traveler’s public profile shows the Journey only according to its privacy setting.
- A booking change appears in the dashboard, notifications and provider conversation.
- A refund update appears in Payments and Notifications.
- Blocking a traveler updates Messages, Profile and Privacy settings.
- Muting a Community affects both messages and notifications.

Avoid duplicating independent versions of the same content card. Use shared components with contextual variants.

## Reusable components

Create these components on `27 Personal Hub Components`.

### Navigation and shell

- `TravelerShell`
- `TravelerSidebar`
- `TravelerBottomNavigation`
- `PersonalHubHeader`
- `ProfileMenu`
- `UnreadBadge`
- `ThemeToggle`

### Messages

- `InboxLayout`
- `ConversationList`
- `ConversationListItem`
- `ConversationHeader`
- `MessageBubble`
- `MessageGroup`
- `MessageComposer`
- `TypingIndicator`
- `ReadReceipt`
- `DateSeparator`
- `UnreadDivider`
- `AttachmentMenu`
- `MediaMessage`
- `LocationMessage`
- `DealMessageCard`
- `JourneyMessageCard`
- `TransportMessageCard`
- `BookingMessageCard`
- `BusinessIdentity`
- `MessageRequestCard`
- `SafetyWarning`
- `ConversationDetails`
- `GroupMemberRow`

### Account

- `AccountDashboard`
- `AccountNavigation`
- `DashboardActionCard`
- `UpcomingBookingCard`
- `ActiveJourneyCard`
- `SavedAlertCard`
- `AccountAttentionCard`
- `ProfileCompletion`
- `SettingsSection`
- `SettingsRow`
- `PrivacyControl`
- `NotificationChannelControl`
- `SessionCard`
- `PaymentMethodCard`
- `ReceiptRow`
- `RefundTimeline`

### Profile

- `TravelerProfileHeader`
- `TravelerIdentity`
- `VerificationBadge`
- `ProfileStats`
- `FollowButton`
- `ProfileTabs`
- `ProfilePrivacyNotice`
- `DelversPostGrid`
- `JourneyProfileCard`
- `CommunityProfileCard`
- `ReviewCard`
- `ProfileActionMenu`

### Saved

- `SavedNavigation`
- `SavedItemCard`
- `CollectionCard`
- `CollectionHeader`
- `CollectionMemberStack`
- `CollectionActivity`
- `SavedFilterBar`
- `SavedMap`
- `SavedMapPin`
- `PriceChangeBadge`
- `AvailabilityBadge`
- `AlertPreference`

### Notifications

- `NotificationCenter`
- `NotificationGroup`
- `NotificationItem`
- `NotificationIcon`
- `NotificationPreview`
- `NotificationFilter`
- `NotificationSettings`
- `NotificationPermissionBanner`
- `SecurityNotification`

### Shared feedback and states

- `EmptyState`
- `LoadingSkeleton`
- `InlineAlert`
- `ErrorState`
- `OfflineBanner`
- `ConfirmationDialog`
- `BottomSheet`
- `Drawer`
- `Toast`
- `ReportFlow`
- `BlockConfirmation`
- `PermissionRequired`
- `AuthenticationRequired`

Create variants for:
- Default
- Hover
- Focus
- Selected
- Unread
- Read
- Muted
- Disabled
- Loading
- Error
- Warning
- Success
- Offline
- Restricted
- Unavailable

## Backend-ready data contract

Create a section named `Personal Hub Data & Backend Contract`.

### Conversation

- id
- type
- title
- avatar
- participants
- linkedJourneyId
- linkedCommunityId
- linkedBookingId
- linkedBusinessId
- latestMessage
- unreadCount
- isMuted
- isPinned
- isArchived
- permissions
- createdAt
- updatedAt

### Message

- id
- conversationId
- sender
- messageType
- text
- media
- sharedEntity
- replyTo
- deliveryStatus
- moderationStatus
- createdAt
- editedAt

### Traveler profile

- id
- displayName
- username
- avatar
- biography
- verificationStatus
- languages
- interests
- visibility
- followerCount
- followingCount
- relationshipStatus
- messagingPermission
- visibleSections

### Saved item

- id
- entityType
- entityId
- collectionIds
- savedAt
- currentStatus
- currentPrice
- previousPrice
- currency
- priceBasis
- availability
- alertPreferences

### Collection

- id
- ownerId
- name
- description
- cover
- privacy
- members
- permissions
- linkedJourneyId
- itemCount
- createdAt
- updatedAt

### Notification

- id
- category
- actor
- title
- description
- relatedEntity
- priority
- isRead
- requiresAcknowledgement
- action
- createdAt

### Account summary

- traveler
- upcomingBookings
- activeJourneys
- savedAlerts
- paymentSummary
- refundSummary
- unreadMessages
- unreadNotifications
- requiredActions

The backend must remain authoritative for:
- Identity
- Verification
- Authentication
- Profile visibility
- Follow relationships
- Messaging permissions
- Conversation membership
- Read receipts
- Online status
- Blocks and mutes
- Moderation results
- Saved-item status
- Price and availability
- Collection permissions
- Booking status
- Payment and refund status
- Notification delivery
- Security events
- Data retention

Do not invent API endpoints, payment providers, moderation outcomes, private user data or live availability.

## Figma and Cursor responsibilities

Figma defines:
- Layout and visual hierarchy
- Responsive behavior
- Light and dark themes
- Component variants
- Navigation
- Interaction flows
- Loading, empty, error and success states
- Privacy and permission states
- Safety experiences
- Accessibility annotations
- Backend-data annotations

Cursor implements:
- Routes
- Authentication
- APIs
- Real-time messaging
- Message delivery
- Media processing
- Push notifications
- Read receipts
- Typing indicators
- Privacy enforcement
- Blocks and reports
- Collection collaboration
- Saved-item synchronization
- Price and availability alerts
- Booking data
- Payments and refunds
- Security controls
- Audit history
- Analytics
- Automated tests

Figma must not invent backend behavior. Cursor must use the components, flows and states defined by the approved Figma designs.

## Prototype requirements

Create a clickable prototype demonstrating:

1. Opening the Account Dashboard
2. Viewing an upcoming booking
3. Opening a provider conversation
4. Sending a Journey card in a message
5. Receiving and accepting a message request
6. Blocking and reporting an unsafe account
7. Opening a saved Deal price-drop notification
8. Moving the Deal into a collaborative collection
9. Inviting another traveler to that collection
10. Adding the Deal to a Journey
11. Opening a Traveler public profile
12. Following the Traveler
13. Viewing a followers-only profile
14. Changing profile privacy
15. Managing notification channels
16. Changing to dark theme
17. Viewing a receipt and refund status
18. Handling offline and unavailable-content states

The final result must feel like one connected Delve experience—not five unrelated products.