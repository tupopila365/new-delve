-- Idempotent marketing/demo Journeys for Delve Journeys page.
-- Can be executed directly on the PostgreSQL database.
-- Run this script to seed or reset the 5 realistic marketing journeys.

-- 1. CLEANUP PREVIOUS SEED DATA
DELETE FROM "JourneyStop" WHERE "journeyId" IN (SELECT id FROM "Journey" WHERE "authorId" LIKE 'mkuser_%');
DELETE FROM "Journey" WHERE "authorId" LIKE 'mkuser_%';
DELETE FROM "TravelerProfile" WHERE "userId" LIKE 'mkuser_%';
DELETE FROM "User" WHERE id LIKE 'mkuser_%';

-- 2. SEED CREATORS
INSERT INTO "User" (
  id, email, username, "usernameNormalized", "passwordHash", "emailVerifiedAt", "accountStatus", role, "createdAt", "updatedAt"
) VALUES 
('mkuser_amara', 'amara.n@delve.internal', 'amara_n', 'amara_n', '$2a$10$UncLeThIsIsAFaKePaSsWoRdHaShFoRSeEdInG', NOW(), 'active', 'traveler', NOW(), NOW()),
('mkuser_liam', 'liam.k@delve.internal', 'liam_k', 'liam_k', '$2a$10$UncLeThIsIsAFaKePaSsWoRdHaShFoRSeEdInG', NOW(), 'active', 'traveler', NOW(), NOW()),
('mkuser_nandi', 'nandi.m@delve.internal', 'nandi_m', 'nandi_m', '$2a$10$UncLeThIsIsAFaKePaSsWoRdHaShFoRSeEdInG', NOW(), 'active', 'traveler', NOW(), NOW()),
('mkuser_daniel', 'daniel.m@delve.internal', 'daniel_m', 'daniel_m', '$2a$10$UncLeThIsIsAFaKePaSsWoRdHaShFoRSeEdInG', NOW(), 'active', 'traveler', NOW(), NOW()),
('mkuser_tuli', 'tuli.m@delve.internal', 'tuli_m', 'tuli_m', '$2a$10$UncLeThIsIsAFaKePaSsWoRdHaShFoRSeEdInG', NOW(), 'active', 'traveler', NOW(), NOW());

INSERT INTO "TravelerProfile" (
  id, "userId", "displayName", "onboardingStatus", "onboardingCompletedAt", "preferredCurrency", "preferredLanguage", "createdAt", "updatedAt"
) VALUES
('mkprof_amara', 'mkuser_amara', 'Amara N.', 'COMPLETED', NOW(), 'USD', 'en', NOW(), NOW()),
('mkprof_liam', 'mkuser_liam', 'Liam K.', 'COMPLETED', NOW(), 'USD', 'en', NOW(), NOW()),
('mkprof_nandi', 'mkuser_nandi', 'Nandi M.', 'COMPLETED', NOW(), 'USD', 'en', NOW(), NOW()),
('mkprof_daniel', 'mkuser_daniel', 'Daniel M.', 'COMPLETED', NOW(), 'USD', 'en', NOW(), NOW()),
('mkprof_tuli', 'mkuser_tuli', 'Tuli M.', 'COMPLETED', NOW(), 'USD', 'en', NOW(), NOW());

-- 3. SEED JOURNEYS & STOPS

-- JOURNEY 1: A Weekend in Swakopmund
INSERT INTO "Journey" (
  id, slug, "authorId", title, summary, "coverUrl", "coverResourceType", "startPlace", "endPlace", countries, "durationDays", "transportModes", "historicalCost", currency, "partyType", tags, visibility, "moderationStatus", takeaway, "publishedAt", "createdAt", "updatedAt"
) VALUES (
  'mkjrn_swakop',
  'weekend-in-swakopmund',
  'mkuser_amara',
  'A Weekend in Swakopmund',
  'A quick escape from Windhoek — good food, ocean views, and a little adventure along the coast.',
  'https://images.unsplash.com/photo-1547190027-915990683905?w=1200&h=800&fit=crop&q=80',
  'image',
  'Windhoek',
  'Windhoek',
  ARRAY['Namibia'],
  3,
  ARRAY['Car rental', 'On foot'],
  '4500',
  'N$',
  'COUPLE',
  ARRAY['coast', 'adventure', 'food', 'nature'],
  'PUBLIC',
  'VISIBLE',
  'Pack layers because the coast gets cold, and book Sandwich Harbour activities in advance.',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO "JourneyStop" (
  id, "journeyId", "sortOrder", place, region, "arrivalDay", "durationDays", notes, highlights, "mediaUrls", "mediaResourceTypes", "createdAt", "updatedAt"
) VALUES 
(
  'mkstop_swakop_1',
  'mkjrn_swakop',
  1,
  'Windhoek to Swakopmund',
  'Khomas',
  1,
  1,
  'Departed Windhoek early morning. Drove along the B2 highway as the landscape transition into sand dunes. Checked in at our hotel, walked along the iconic jetty at sunset, and had fresh oysters for dinner.',
  ARRAY['Road trip from Windhoek', 'Hotel check-in', 'Sunset jetty walk', 'Seafood dinner'],
  ARRAY['https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_swakop_2',
  'mkjrn_swakop',
  2,
  'Sandwich Harbour',
  'Erongo',
  2,
  1,
  'An incredible adventure where the dunes meet the ocean. Took a guided 4x4 desert drive down steep sand slopes, enjoyed a lunch picnic on the dunes, and got some amazing landscape photos.',
  ARRAY['4x4 desert adventure', 'Sandwich Harbour lagoon', 'Picnic lunch on dunes', 'Dune photography'],
  ARRAY['https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_swakop_3',
  'mkjrn_swakop',
  3,
  'Swakopmund town center',
  'Erongo',
  3,
  1,
  'A slow morning enjoying coffee and breakfast at a local cafe. Took a beach walk before exploring the colonial German architecture and driving back to Windhoek.',
  ARRAY['Slow breakfast', 'Coastal beach walk', 'Explore town center', 'Drive back to Windhoek'],
  ARRAY['https://images.unsplash.com/photo-1547190027-915990683905?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
);

-- JOURNEY 2: 5 Days in Cape Town
INSERT INTO "Journey" (
  id, slug, "authorId", title, summary, "coverUrl", "coverResourceType", "startPlace", "endPlace", countries, "durationDays", "transportModes", "historicalCost", currency, "partyType", tags, visibility, "moderationStatus", takeaway, "publishedAt", "createdAt", "updatedAt"
) VALUES (
  'mkjrn_capetown',
  '5-days-in-cape-town',
  'mkuser_liam',
  '5 Days in Cape Town',
  'First time in Cape Town. A mix of food, beaches, sightseeing and way too many photos.',
  'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&h=800&fit=crop&q=80',
  'image',
  'Cape Town',
  'Cape Town',
  ARRAY['South Africa'],
  5,
  ARRAY['Uber', 'On foot'],
  '7200',
  'ZAR',
  'SOLO',
  ARRAY['city', 'beach', 'food', 'nature'],
  'PUBLIC',
  'VISIBLE',
  'Use Uber to get around easily and check the weather forecast daily before visiting Table Mountain.',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO "JourneyStop" (
  id, "journeyId", "sortOrder", place, region, "arrivalDay", "durationDays", notes, highlights, "mediaUrls", "mediaResourceTypes", "createdAt", "updatedAt"
) VALUES 
(
  'mkstop_ct_1',
  'mkjrn_capetown',
  1,
  'V&A Waterfront',
  'Western Cape',
  1,
  1,
  'Arrived at the airport, checked into the hotel, and walked down to the harbor for dinner by the water.',
  ARRAY['Arrival', 'Hotel check-in', 'V&A Waterfront walk', 'Harbor dinner'],
  ARRAY['https://images.unsplash.com/photo-1576485264979-4d6934c1b183?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_ct_2',
  'mkjrn_capetown',
  2,
  'Table Mountain & Camps Bay',
  'Western Cape',
  2,
  1,
  'Woke up early to take the Cableway up Table Mountain for epic views. Headed down to Camps Bay for beach walking, coffee, and watching the sunset.',
  ARRAY['Table Mountain views', 'Camps Bay beach', 'Sunset coffee'],
  ARRAY['https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_ct_3',
  'mkjrn_capetown',
  3,
  'Boulders Beach & Cape Point',
  'Western Cape',
  3,
  1,
  'Drove out to Simon''s Town to see the African penguins at Boulders Beach, went hiking at Cape Point, and finished with fresh seafood.',
  ARRAY['Boulders Beach penguins', 'Cape Point hike', 'Seafood lunch'],
  ARRAY['https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_ct_4',
  'mkjrn_capetown',
  4,
  'Stellenbosch Winelands',
  'Western Cape',
  4,
  1,
  'Drove through Stellenbosch for a relaxing lunch and wine tasting session surrounded by green mountain scenery.',
  ARRAY['Wine tasting', 'Scenic winelands drive', 'Vineyard lunch'],
  ARRAY['https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_ct_5',
  'mkjrn_capetown',
  5,
  'V&A Waterfront to Airport',
  'Western Cape',
  5,
  1,
  'Final breakfast overlooking the harbor, quick packing session, and headed out for departure.',
  ARRAY['Harbor breakfast', 'Packing', 'Departure'],
  ARRAY['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
);

-- JOURNEY 3: Zanzibar With The Girls
INSERT INTO "Journey" (
  id, slug, "authorId", title, summary, "coverUrl", "coverResourceType", "startPlace", "endPlace", countries, "durationDays", "transportModes", "historicalCost", currency, "partyType", tags, visibility, "moderationStatus", takeaway, "publishedAt", "createdAt", "updatedAt"
) VALUES (
  'mkjrn_zanzibar',
  'zanzibar-with-the-girls',
  'mkuser_nandi',
  'Zanzibar With The Girls',
  'A few days of sunshine, ocean views, good food and exploring somewhere completely new.',
  'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=1200&h=800&fit=crop&q=80',
  'image',
  'Zanzibar',
  'Zanzibar',
  ARRAY['Tanzania'],
  4,
  ARRAY['Taxi', 'On foot'],
  '8500',
  'USD',
  'FRIENDS',
  ARRAY['beach', 'nature', 'food', 'culture'],
  'PUBLIC',
  'VISIBLE',
  'Make sure to bring cash (USD) since card payments aren''t accepted everywhere, and dress modestly in Stone Town.',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO "JourneyStop" (
  id, "journeyId", "sortOrder", place, region, "arrivalDay", "durationDays", notes, highlights, "mediaUrls", "mediaResourceTypes", "createdAt", "updatedAt"
) VALUES 
(
  'mkstop_zan_1',
  'mkjrn_zanzibar',
  1,
  'Nungwi Beach',
  'Zanzibar North',
  1,
  1,
  'Arrived at the hotel and spent the afternoon relaxedly swimming in the crystal clear water and watching the dhow boats pass by.',
  ARRAY['Beach afternoon', 'Poolside mocktails', 'Sunset views'],
  ARRAY['https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_zan_2',
  'mkjrn_zanzibar',
  2,
  'Mnemba Atoll Snorkeling',
  'Zanzibar East',
  2,
  1,
  'Booked a private boat trip to snorkel in the vibrant coral reef around Mnemba Atoll. Saw dolphins and had a local seafood lunch on the beach.',
  ARRAY['Snorkeling reef', 'Dolphin spotting', 'Grilled fish lunch'],
  ARRAY['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_zan_3',
  'mkjrn_zanzibar',
  3,
  'Stone Town',
  'Zanzibar Urban',
  3,
  1,
  'Walked the labyrinth of historic streets, visited local cafes, and bought fresh spices at the market.',
  ARRAY['Historic Stone Town architecture', 'Local coffee shop', 'Spice market shopping'],
  ARRAY['https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_zan_4',
  'mkjrn_zanzibar',
  4,
  'Zanzibar Beach & Airport',
  'Zanzibar Urban',
  4,
  1,
  'Took a few final travel photos on the beach during a slow morning walk, packed up, and left for the airport.',
  ARRAY['Beach walk', 'Photo session', 'Departure'],
  ARRAY['https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
);

-- JOURNEY 4: Desert Escape — Sossusvlei
INSERT INTO "Journey" (
  id, slug, "authorId", title, summary, "coverUrl", "coverResourceType", "startPlace", "endPlace", countries, "durationDays", "transportModes", "historicalCost", currency, "partyType", tags, visibility, "moderationStatus", takeaway, "publishedAt", "createdAt", "updatedAt"
) VALUES (
  'mkjrn_sossus',
  'desert-escape-sossusvlei',
  'mkuser_daniel',
  'Desert Escape — Sossusvlei',
  'A short desert escape for sunrise, massive dunes and a much-needed break from the city.',
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&h=800&fit=crop&q=80',
  'image',
  'Sossusvlei',
  'Sossusvlei',
  ARRAY['Namibia'],
  2,
  ARRAY['Car rental'],
  '3200',
  'N$',
  'SOLO',
  ARRAY['nature', 'adventure', 'desert'],
  'PUBLIC',
  'VISIBLE',
  'Waking up early is essential. The colors on the dunes at first light are unmatched.',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO "JourneyStop" (
  id, "journeyId", "sortOrder", place, region, "arrivalDay", "durationDays", notes, highlights, "mediaUrls", "mediaResourceTypes", "createdAt", "updatedAt"
) VALUES 
(
  'mkstop_sos_1',
  'mkjrn_sossus',
  1,
  'Sossusvlei Desert Lodge',
  'Hardap',
  1,
  1,
  'Drove through Spreetshoogte Pass from Windhoek. Checked into the lodge and climbed the surrounding dunes for sunset stargazing.',
  ARRAY['Scenic desert drive', 'Lodge check-in', 'Sunset dune climb', 'Stargazing'],
  ARRAY['https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
),
(
  'mkstop_sos_2',
  'mkjrn_sossus',
  2,
  'Deadvlei & Sossusvlei Dunes',
  'Hardap',
  2,
  1,
  'Woke up at 5:00 AM to see sunrise over Dune 45. Walked to the surreal clay pan of Deadvlei to capture the iconic dark trees before driving back to Windhoek.',
  ARRAY['Sunrise on Dune 45', 'Deadvlei clay pan hike', 'Landscape photography'],
  ARRAY['https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
);

-- JOURNEY 5: Saturday in Windhoek
INSERT INTO "Journey" (
  id, slug, "authorId", title, summary, "coverUrl", "coverResourceType", "startPlace", "endPlace", countries, "durationDays", "transportModes", "historicalCost", currency, "partyType", tags, visibility, "moderationStatus", takeaway, "publishedAt", "createdAt", "updatedAt"
) VALUES (
  'mkjrn_windhoek',
  'saturday-in-windhoek',
  'mkuser_tuli',
  'Saturday in Windhoek',
  'Sometimes you don''t need to leave the city to have a good day.',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=800&fit=crop&q=80',
  'image',
  'Windhoek',
  'Windhoek',
  ARRAY['Namibia'],
  1,
  ARRAY['On foot', 'Taxi'],
  '600',
  'N$',
  'FRIENDS',
  ARRAY['city', 'food', 'local'],
  'PUBLIC',
  'VISIBLE',
  'Windhoek''s cafe scene is fantastic. Try to sit outside in the shade.',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO "JourneyStop" (
  id, "journeyId", "sortOrder", place, region, "arrivalDay", "durationDays", notes, highlights, "mediaUrls", "mediaResourceTypes", "createdAt", "updatedAt"
) VALUES 
(
  'mkstop_whk_1',
  'mkjrn_windhoek',
  1,
  'Windhoek Central',
  'Khomas',
  1,
  1,
  'Started the morning with a flat white and pastries at a local cafe. Walked around downtown for some shopping, met friends for lunch, and capped off the day with live music and drinks at a local hotspot.',
  ARRAY['Morning coffee & breakfast', 'Shopping & lunch with friends', 'Live music & drinks'],
  ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80'],
  ARRAY['image'],
  NOW(),
  NOW()
);
