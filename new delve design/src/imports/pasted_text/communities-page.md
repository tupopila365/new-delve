Design the main Communities page for the Delve Traveler app.

PAGE ROUTE

Use `/community` as the current route concept.

PAGE PURPOSE

Communities helps travelers ask locals, join destination groups, plan trips, and exchange practical travel advice.

Use this first-screen message:

“Ask, share, and explore together.”

Supporting copy:

“Join destination communities, ask locals, and learn from people who know the journey.”

Primary actions:

- Explore communities
- Ask a question

The purpose of the page must be understandable within five seconds.

COMPONENT REQUIREMENT

Before creating the final page:

1. Review the existing Delve components.
2. Reuse the Traveler header, search, tabs, buttons, cards, avatars, theme control, destination selector, feedback states, and mobile navigation.
3. Create missing Community components in the shared `02 Components` page.
4. Use Auto Layout and semantic variables.
5. Give every component Light, Dark, Desktop, Mobile, Loading, Empty, and Error variants where relevant.
6. Build the final page entirely from component instances.
7. Do not detach components or create one-off visual groups.

SURFACE MODES

Create:

- Desktop 1440px — Traveler Light
- Desktop 1440px — Traveler Dark
- Tablet 1024px
- Mobile 390px — Traveler Light
- Mobile 390px — Traveler Dark

Changing themes must not reset the selected tab, search, join state, saved discussions, or draft question.

PAGE STRUCTURE

1. TRAVELER HEADER

Reuse the global Traveler header.

Include:

- Delve logo
- Destination
- Search
- Deals
- Transport
- Communities
- Delvers
- Journeys
- Saved
- Theme control
- Account

Show Communities as the selected navigation destination.

On mobile, reuse:

- Compact header
- Destination control
- Search action
- Theme control
- Account
- Bottom navigation

2. COMMUNITIES HERO

Include:

- “Ask, share, and explore together.”
- Supporting copy
- Community search
- Explore communities action
- Ask a question action
- Active destination

Use a warm, people-focused travel image or a restrained editorial visual.

Keep the hero compact enough to show useful Community content in the first viewport.

3. DISCOVERY TABS

Create:

- Discover
- Your communities
- Nearby
- Questions
- Discussions
- Saved

On mobile, allow horizontal scrolling with visible continuation.

4. ASK LOCALS

Create a prominent Ask Locals section.

Use this heading:

“Ask people who know the place.”

Supporting copy:

“Get practical answers about transport, stays, food, activities, safety, and local travel.”

Include:

- Ask a question action
- Active destination
- Recent useful questions
- Answer count
- Accepted-answer state
- Unanswered state
- View all questions

Example questions:

- “What is the easiest way to get from Windhoek airport to the city?”
- “Are there buses from Swakopmund to Walvis Bay on Sundays?”
- “Where can I find affordable local food near the waterfront?”
- “Is a rental car necessary for this Journey?”
- “What should I know before taking the ferry?”

5. COMMUNITIES NEAR YOU

Show destination-based Communities related to the active place.

Examples:

- Windhoek Travelers
- Swakopmund Locals
- Walvis Bay & Coast
- Etosha Trip Planning
- Lüderitz Explorers
- Namibia Road Trips

Every Community card shows:

- Cover
- Community name
- Destination
- Short description
- Community type
- Member count
- Recent activity
- Public or Private
- Join state
- Open Community action

6. EXPLORE BY INTEREST

Create reusable interest shortcuts:

- Budget travel
- Solo travel
- Family travel
- Accessible travel
- Food
- Nature
- Photography
- Road trips
- Air travel
- Water travel
- Events
- Safety

Use Lucide icons with text labels.

7. TRANSPORT COMMUNITIES

Create a dedicated section for:

- Car rentals
- Community rides
- Bus and minibus routes
- Airport transfers
- Regional air transport
- Ferries and water transport

Transport Community cards must state that Community information is traveler discussion, not canonical availability, price, schedule, or safety information.

Include links to verified Transport results where available.

8. POPULAR DISCUSSIONS

Create discussion cards showing:

- Discussion title
- Author
- Community
- Destination
- Body preview
- Topic
- Reply count
- Time
- Save
- Share
- Pinned state
- Official or Business label
- Linked Journey, service, transport result, or place

Example discussions:

- “Planning a five-day coast road trip”
- “Best stops between Windhoek and Swakopmund”
- “Flying or taking the bus to Cape Town?”
- “What to expect from the Walvis Bay waterfront”
- “Budget breakdown for a weekend in Lüderitz”

9. RECENTLY ANSWERED QUESTIONS

Create question cards showing:

- Question
- Author
- Place
- Community
- Time
- Answer count
- Accepted-answer preview
- Helpful count
- Linked object
- Save
- View answer

Clearly distinguish:

- Traveler answer
- Local-context answer where supported
- Business answer
- Official Delve answer

Do not label someone as a local unless supported by backend data.

10. RECOMMENDED COMMUNITIES

Show recommendation explanations such as:

- Near Swakopmund
- Because you saved a coast Journey
- Related to your Transport search
- Popular with weekend travelers
- Connected to a saved place

Do not expose private user information.

11. YOUR COMMUNITY ACTIVITY

For signed-in users, show:

- Joined Communities
- Questions you asked
- New answers
- Saved discussions
- Join requests
- Mentions or replies

For signed-out users, show a concise invitation to sign in without blocking Community discovery.

12. COMMUNITY GUIDANCE

Create a compact guidance section:

- Be respectful
- Protect personal information
- Verify critical travel details
- Do not share payment or booking references
- Report unsafe or misleading advice
- Use official emergency services for immediate danger

Include a Community guidelines link.

13. FOOTER

Reuse the existing Traveler footer.

NEW REUSABLE COMPONENTS

Create these components in `02 Components`:

- `Community/Card`
- `Community/Compact card`
- `Community/Featured card`
- `Community/Type label`
- `Community/Privacy label`
- `Community/Member count`
- `Community/Join button`
- `Community/Activity summary`
- `Community/Question card`
- `Community/Answer preview`
- `Community/Accepted answer`
- `Community/Discussion card`
- `Community/Topic`
- `Community/Pinned label`
- `Community/Official label`
- `Community/Business label`
- `Community/Linked object`
- `Community/Guidelines`
- `Community/Empty state`

COMMUNITY CARD VARIANTS

Create:

- Not joined
- Joining
- Joined
- Join requested
- Public
- Private
- Destination
- Interest
- Transport
- Official Delve
- Business-managed
- Loading
- Error
- Light
- Dark
- Desktop
- Mobile
- Long title
- Missing cover

BUSINESS CONTENT

Businesses may participate transparently.

Always show:

- Business identity
- “Business” label
- Verification context
- Linked service where relevant

Do not present business content as an independent traveler recommendation.

OFFICIAL CONTENT

Official Delve posts and Communities must show:

- “Official Delve” label
- Delve identity
- Purpose
- Published date

Do not use the official label for ordinary moderator content.

PRIVACY

Private Communities must not expose:

- Private posts
- Questions
- Answers
- Member list
- Media
- Linked private Journeys
- Profile information

A private Community preview may only show:

- Community name
- Cover
- Description
- Privacy
- Rules summary
- Request to join

BACKEND-READY STRUCTURE

Use typed mock data passed through component properties.

Do not hardcode Community data inside visual components.

Do not invent endpoint URLs.

Create a `CommunitySummary` containing:

- id
- name
- description
- communityType
- destination
- topics
- cover
- privacy
- memberCount
- recentActivity
- official
- businessManaged
- membershipStatus
- permissions
- detailPath

Create `CommunityQuestionSummary` containing:

- id
- title
- author
- community
- destination
- answerCount
- acceptedAnswer
- linkedObject
- saved
- createdAt

Create `CommunityDiscussionSummary` containing:

- id
- title
- bodyPreview
- author
- community
- destination
- topic
- replyCount
- pinned
- official
- businessContent
- linkedObjects
- saved
- createdAt

The backend remains authoritative for:

- Community identity
- Privacy
- Membership
- Roles
- Permissions
- Questions
- Answers
- Accepted answers
- Discussions
- Pinned status
- Official status
- Business identity
- Content visibility
- Moderation
- Join requests
- Saves

PAGE STATES

Create full-page or section variants for:

- Loading
- Ready
- New visitor
- Signed-in traveler
- Your Communities empty
- No nearby Communities
- No search results
- No answered questions
- Join request pending
- Private Community
- Partial section failure
- Offline cached content
- Permission restricted
- Full error

PROTOTYPE

Prototype:

- Change discovery tab
- Search Communities
- Change destination
- Open a Community
- Join a public Community
- Request to join a private Community
- Ask a question
- Open an answer
- Save a discussion
- Open linked Transport
- Open linked Journey
- Open linked place or service
- Sign in and return
- Retry a failed section
- Switch Light and Dark themes

ACCESSIBILITY

Annotate:

- Heading order
- Keyboard order
- Tab behavior
- Join-state announcements
- Accepted-answer label
- Official and Business labels
- Search result count
- Save-state announcements
- Light and Dark contrast
- Touch targets
- Reduced motion
- Status not dependent on color
- Alternative text for covers and media

FINAL ACCEPTANCE

The Communities page must:

- Explain its purpose immediately
- Be built entirely from reusable components
- Reuse the existing Delve library
- Add Community components to `02 Components`
- Clearly separate Communities, Journeys, and Delvers
- Support destination, interest, and Transport Communities
- Protect private Community content
- Clearly label Business and Official content
- Support Traveler Light and Traveler Dark
- Work at 1440px, 1024px, and 390px
- Include loading, empty, offline, restricted, and error states
- Be ready for backend integration
- Avoid invented routes, permissions, membership, or moderation behavior
- Keep Delve Purple as the primary interaction color