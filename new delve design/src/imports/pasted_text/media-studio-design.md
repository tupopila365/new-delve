Create a reusable Media Upload and Editing system for the entire Delve product.

This system must support image upload, video upload, lightweight editing, captions, cover selection, and licensed music for every appropriate Delve experience.

MANDATORY COMPONENT WORKFLOW

Before designing final screens:

1. Review the existing Delve foundations and shared components.
2. Reuse buttons, inputs, dialogs, drawers, bottom sheets, progress indicators, tabs, messages, and media viewers.
3. Create all missing Media components on the shared `02 Components` page.
4. Use Auto Layout, semantic variables, named layers, properties, and variants.
5. Extend existing components instead of duplicating them.
6. Do not detach components in final screens.
7. Build every Media flow from reusable component instances.
8. Support Traveler Light, Traveler Dark, Business Light, and Platform Dark where relevant.
9. Support desktop, tablet, and mobile.
10. Keep file rules, processing, storage, music availability, and moderation controlled by backend configuration.

PURPOSE

The Media Studio provides one consistent experience for:

- Uploading images
- Uploading videos
- Taking a photo
- Recording a video
- Cropping images
- Trimming videos
- Selecting a video cover
- Reordering media
- Writing alternative text
- Adding captions
- Adding supported music
- Adjusting original and music volume
- Previewing the final result
- Uploading and processing media
- Recovering from upload or processing failures

The Media Studio must feel lightweight and easy to use. Do not design a complex professional video-editing application.

SUPPORTED DELVE CONTEXTS

Create configuration variants for:

- Delvers post
- Delvers Reel
- Delvers Highlight
- Journey cover
- Journey stop
- Journey diary entry
- Journey highlight
- Community question
- Community discussion
- Community reply
- User profile avatar
- User profile cover
- Review media
- Service listing
- Stay listing
- Food listing
- Activity listing
- Event listing
- Guide profile
- Shop product
- Vehicle rental
- Bus or minibus
- Air transport
- Water transport
- Business profile
- Deal
- Admin content review

Not every context supports every editing feature.

Music should normally be available for:

- Delvers posts
- Reels
- Highlights
- Journey highlights
- Journey video entries
- Supported Community video posts

Music should not automatically be available for:

- Profile avatars
- Product images
- Service listing images
- Transport-document uploads
- Identity documents
- Verification documents
- Receipts
- Evidence uploads
- Review evidence
- Admin documents

Use configuration properties to determine which features are available.

MEDIA STUDIO PRESENTATION

Create three responsive presentation modes:

Desktop:

- Large dialog or full editing workspace
- Media preview
- Editing tools
- Metadata panel
- Upload and publishing actions

Mobile:

- Full-screen editor
- Safe-area spacing
- Bottom editing toolbar
- Bottom sheets for detailed tools
- Large touch targets

Compact embedded upload:

- Small upload area
- Thumbnail preview
- Replace and Remove actions
- Processing status

MEDIA FLOW

Create this reusable flow:

1. Choose media
2. Validate
3. Edit
4. Add details
5. Preview
6. Upload
7. Process
8. Ready or Publish

The flow may skip steps depending on the upload context.

Example:

A profile avatar may use:

1. Choose image
2. Crop
3. Upload
4. Ready

A Reel may use:

1. Choose video
2. Trim and crop
3. Choose cover
4. Add music and captions
5. Preview
6. Upload and process
7. Publish

MEDIA SOURCE

Create reusable source options:

- Upload from device
- Take photo
- Record video
- Choose existing Delve media where supported
- Reuse Journey media where permitted
- Use approved media library where supported

Do not show camera or recording options on devices or browsers that do not support them.

REUSABLE MEDIA COMPONENTS

Create:

- `Media/Upload trigger`
- `Media/Drop zone`
- `Media/Source picker`
- `Media/File input`
- `Media/Upload requirements`
- `Media/File thumbnail`
- `Media/Thumbnail grid`
- `Media/Selected media`
- `Media/Media count`
- `Media/Reorder control`
- `Media/Replace action`
- `Media/Remove action`
- `Media/Retry action`
- `Media/Upload progress`
- `Media/Processing state`
- `Media/Failed state`
- `Media/Unsupported state`
- `Media/Moderation state`
- `Media/Preview`
- `Media/Full-screen preview`
- `Media/Editor shell`
- `Media/Editor toolbar`
- `Media/Editor action`
- `Media/Publish summary`

IMAGE EDITOR COMPONENTS

Create:

- `Media Image/Cropper`
- `Media Image/Aspect ratio`
- `Media Image/Zoom`
- `Media Image/Rotate`
- `Media Image/Flip`
- `Media Image/Position`
- `Media Image/Adjustment controls`
- `Media Image/Filter selector`
- `Media Image/Reset edits`
- `Media Image/Before and after`
- `Media Image/Alternative text`
- `Media Image/Focal point`

IMAGE EDITING

Support lightweight image editing:

- Crop
- Zoom
- Reposition
- Rotate
- Flip
- Aspect ratio
- Brightness
- Contrast
- Saturation
- Warmth
- Simple approved filters
- Reset
- Preview original
- Select focal point

Aspect-ratio options depend on context:

- Original
- Square 1:1
- Portrait 4:5
- Story or Reel 9:16
- Landscape 16:9
- Journey cover
- Listing cover
- Profile avatar

Do not distort the image to force an aspect ratio.

Keep the original media available so edits can be changed before publishing where the backend supports non-destructive editing.

VIDEO EDITOR COMPONENTS

Create:

- `Media Video/Player`
- `Media Video/Timeline`
- `Media Video/Trim handles`
- `Media Video/Playhead`
- `Media Video/Clip duration`
- `Media Video/Crop`
- `Media Video/Aspect ratio`
- `Media Video/Rotate`
- `Media Video/Playback speed`
- `Media Video/Original volume`
- `Media Video/Mute`
- `Media Video/Cover selector`
- `Media Video/Frame selector`
- `Media Video/Caption editor`
- `Media Video/Caption timeline`
- `Media Video/Processing preview`

VIDEO EDITING

Support:

- Trim start
- Trim end
- Preview
- Scrub timeline
- Crop
- Reposition
- Rotate
- Select aspect ratio
- Choose cover frame
- Upload custom cover where supported
- Adjust original audio volume
- Mute original audio
- Add captions
- Edit captions
- Select caption timing
- Change playback speed only when supported
- Reset edits

Do not add advanced transitions, effects, multi-track editing, or automatic generation unless specifically supported.

MUSIC COMPONENTS

Create:

- `Music/Library`
- `Music/Search`
- `Music/Category tabs`
- `Music/Track row`
- `Music/Track cover`
- `Music/Artist and source`
- `Music/Track duration`
- `Music/Preview action`
- `Music/Selected track`
- `Music/Waveform`
- `Music/Start position`
- `Music/End position`
- `Music/Volume`
- `Music/Original audio volume`
- `Music/Fade in`
- `Music/Fade out`
- `Music/Remove music`
- `Music/Rights summary`
- `Music/Attribution`
- `Music/Unavailable state`
- `Music/Region restriction`

MUSIC SOURCES

Support these source concepts:

1. Delve licensed music library
2. Royalty-free approved music
3. Original sound from the uploaded video
4. User-uploaded original audio where legally and technically supported
5. No music

Do not create access to commercial music without a licensing agreement.

Do not imply that Delve owns or licenses a track unless backend data confirms it.

MUSIC SELECTION

Allow the user to:

- Search music
- Browse categories
- Preview a track
- Pause preview
- Select a track
- Choose the part of the track to use
- Match track duration to video
- Adjust music volume
- Adjust original video volume
- Mute original sound
- Add fade in
- Add fade out
- Remove music
- Preview final sound mix

Create music categories such as:

- Travel
- Calm
- Adventure
- Road trip
- Coast
- Nature
- Upbeat
- Cinematic
- Local sounds
- Instrumental

Only show categories supplied by the music library.

MUSIC RIGHTS

Before using uploaded or external audio, explain:

“You must have permission to use this audio.”

Create rights states:

- Licensed by Delve
- Royalty-free
- Original audio
- User confirms ownership or permission
- Attribution required
- Restricted in some regions
- Unavailable
- Removed for rights reasons

Do not use one generic “copyright safe” label.

Show attribution when required.

Keep a link to full music-use terms.

ORIGINAL SOUND

Create clear controls for:

- Original sound on
- Original sound muted
- Original sound reduced
- Music only
- Mixed sound

When both original sound and music are active, show separate volume controls.

CAPTIONS AND ACCESSIBILITY

Create:

- Add captions manually
- Edit caption text
- Set caption timing
- Caption preview
- Caption language
- Caption background and contrast preview
- Remove caption
- Captions processing where supported
- Captions failed

Automatic captions must be labeled as requiring backend or external transcription capability.

Allow users to review and correct automatically generated captions before publishing.

Do not publish inaccurate automatic captions without a review opportunity.

ALTERNATIVE TEXT

Images require alternative-text support where appropriate.

Create:

- Alternative text input
- Decorative image option only when appropriate
- Character guidance
- Example guidance
- Missing-alt-text reminder

Alternative text should describe useful visual information without repeating the caption.

MEDIA ORDER

For multi-image or carousel uploads, create:

- Drag to reorder
- Move left
- Move right
- Move to first
- Move to last
- Position announcement
- Cover selection

Do not make drag-and-drop the only reordering method.

MEDIA DETAILS

Create reusable fields for:

- Caption
- Alternative text
- Place
- Destination
- Journey
- Community
- Linked service
- Linked Transport
- Linked Deal
- People tags where supported
- Hashtags
- Visibility
- Comments allowed
- Sponsored or Business disclosure

Only show fields appropriate to the upload context.

VISIBILITY

Support:

- Public
- Followers or Community members where supported
- Private
- Draft

The backend remains authoritative for allowed visibility options.

Private and draft media must not appear in:

- Public feeds
- Search
- Profiles
- Community previews
- Journey recommendations
- Related content
- Highlight rings
- Service pages

BUSINESS AND SPONSORED MEDIA

Business-uploaded media must show:

- Business identity
- Business label
- Linked service
- Verification context

Sponsored media must show:

- Sponsored label
- Advertiser
- Placement context

Businesses must not present uploaded content as an independent traveler experience.

UPLOAD REQUIREMENTS

Display backend-supplied requirements for:

- Supported file types
- Maximum file size
- Maximum number of files
- Maximum video duration
- Minimum dimensions
- Recommended aspect ratio
- Audio rules
- Music availability
- Processing behavior

Do not hardcode these values into components.

Use a configuration object for every upload context.

BACKEND-READY CONFIGURATION

Create a `MediaUploadContext` containing:

- contextType
- targetType
- targetId
- allowedMediaTypes
- allowedFileTypes
- maximumFileSize
- maximumItems
- maximumVideoDuration
- minimumDimensions
- allowedAspectRatios
- musicAllowed
- uploadedAudioAllowed
- captionsAllowed
- alternativeTextRequired
- locationAllowed
- linkedObjectsAllowed
- visibilityOptions
- moderationRequired
- publishMethod

Create `MediaAssetDraft` containing:

- id
- localPreview
- mediaType
- fileName
- fileSize
- width
- height
- duration
- aspectRatio
- crop
- rotation
- adjustments
- trimStart
- trimEnd
- playbackSpeed
- coverFrame
- originalVolume
- selectedMusic
- musicVolume
- captions
- alternativeText
- caption
- place
- linkedObjects
- visibility
- uploadStatus
- processingStatus
- moderationStatus

Create `MusicTrackSummary` containing:

- id
- title
- artist
- cover
- previewSource
- duration
- licenseType
- attribution
- regionAvailability
- allowedUses
- status

BACKEND RESPONSIBILITIES

The backend remains authoritative for:

- File rules
- Signed upload access
- Storage
- Media ownership
- Processing
- Transcoding
- Thumbnail generation
- Video cover generation
- Media URLs
- Music availability
- Music licensing
- Regional music restrictions
- Caption processing
- Metadata removal
- Malware scanning
- Moderation
- Visibility
- Publishing
- Removal
- Appeals

Do not invent upload endpoints, storage providers, processing services, or music providers.

UPLOAD STATES

Create:

- No media
- Selecting
- Validating
- Invalid file
- Unsupported type
- File too large
- Image too small
- Video too long
- Too many files
- Upload queued
- Uploading
- Upload paused where supported
- Processing
- Transcoding
- Generating preview
- Generating captions
- Ready
- Publish ready
- Upload failed
- Processing failed
- Retry
- Offline
- Moderation review
- Approved
- Restricted
- Removed
- Music unavailable
- Rights restriction

Do not show media as ready before processing completes.

PROCESSING EXPERIENCE

Show:

- Stable preview
- Current processing stage
- Progress when measurable
- Plain-language status
- Safe navigation guidance
- Background-processing behavior
- Retry when appropriate

Example:

“Your video is processing. You can leave this page and return later.”

Only show this behavior if the backend supports background processing.

ERROR RECOVERY

Create recovery for:

- Network failure
- Expired upload permission
- Processing failure
- Unsupported codec
- Corrupt file
- Music unavailable
- Caption generation failed
- Moderation restriction
- Storage failure
- Publishing failure

Preserve completed edits where safe.

Do not require the user to restart the entire flow when only one media asset fails.

PRIVACY AND SECURITY

Design annotations for:

- Remove unnecessary image metadata
- Do not publish device file paths
- Do not expose private storage URLs
- Do not expose upload credentials
- Do not display identity-document media publicly
- Do not expose exact photo location without consent
- Use role-based access for private and verification media
- Preserve moderation evidence securely
- Protect draft media
- Apply visibility before serialization

Do not automatically add location from image metadata.

MEDIA MODERATION

Create states for:

- No moderation required
- Processing
- Under review
- Approved
- Restricted
- Removed
- Appeal available

Show a neutral explanation to viewers when media is unavailable.

Show the owner:

- Reason category
- Affected media
- Next step
- Appeal option where supported

Do not expose internal moderator notes.

FIGMA PAGES AND SECTIONS

Add these sections to the Figma library:

On `02 Components`:

- Upload components
- Image editor components
- Video editor components
- Music components
- Caption components
- Processing components
- Moderation components

Create a new Figma page:

`Media Studio`

Include frames for:

- Image upload
- Multi-image upload
- Image crop
- Image adjustments
- Video upload
- Video trim
- Video crop
- Video cover selection
- Music library
- Music selection
- Audio mixing
- Caption editing
- Final preview
- Upload progress
- Video processing
- Failed upload
- Failed processing
- Offline
- Moderation review

CONTEXT EXAMPLES

Create complete examples for:

- Delvers image post
- Delvers Reel with music
- Delvers Highlight
- Journey cover
- Journey video highlight with music
- Community question with images
- Community video discussion
- Review media
- Service listing gallery
- Vehicle listing
- Air or Water Transport media
- Profile avatar

Create key flows in:

- Traveler Light
- Traveler Dark
- Business Light
- Platform Dark where moderation is shown
- Desktop
- Mobile

PROTOTYPE

Prototype:

- Choose image
- Crop image
- Change aspect ratio
- Adjust image
- Add alternative text
- Upload multiple images
- Reorder media
- Choose video
- Trim video
- Choose cover
- Open music library
- Preview music
- Select music
- Change music segment
- Mix original and music volume
- Add captions
- Preview final media
- Upload
- Show processing
- Retry failure
- Remove music
- Handle music restriction
- Publish
- Return to draft
- Switch Light and Dark themes

ACCESSIBILITY

Annotate:

- Keyboard order
- Visible focus
- File-input labels
- Upload status announcements
- Progress announcements
- Timeline keyboard controls
- Non-drag reorder controls
- Cropper keyboard alternative
- Volume labels
- Music preview status
- Caption-editor labels
- Alternative-text guidance
- Error association
- Touch targets
- Reduced motion
- Light and Dark contrast
- Status not dependent on color
- Media-player controls
- Captions enabled state

BACKEND HANDOFF

Add Media Upload and Editing to the existing Backend Handoff page.

Document:

- Reused components
- New components
- Upload context
- Required configuration
- File validation
- Upload authorization
- Storage
- Processing
- Transcoding
- Thumbnail generation
- Cover generation
- Music library
- Music rights
- Captions
- Moderation
- Visibility
- Error recovery
- Draft preservation
- Publishing
- Removal
- Analytics intent

FINAL ACCEPTANCE

The Media Studio must:

- Be built from reusable component instances
- Be reusable across every Delve media-upload context
- Add missing components to `02 Components`
- Support images, videos, captions, and permitted music
- Restrict music to appropriate content types
- Support Traveler Light, Traveler Dark, Business Light, and Platform Dark
- Work on desktop, tablet, and mobile
- Preserve edits during recoverable errors
- Clearly show upload and processing state
- Protect private and sensitive media
- Include accessible editing alternatives
- Be ready for backend upload, processing, moderation, and music integration
- Avoid invented endpoints, storage providers, music providers, licenses, or processing services
- Keep Delve Purple as the primary interaction color