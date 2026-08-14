-- Stub communities + members for Communities → Discover
-- Idempotent: safe to re-run (ON CONFLICT / NOT EXISTS guards).
-- Apply with: node scripts/seed-communities.mjs

-- ── Stub users (display-only; cannot log in) ─────────────────────────────────
INSERT INTO users (email, first_name, last_name, profile_photo_url, location, bio, handicap, home_club_name)
VALUES
  ('stub.alice@heathland.local',   'Alice',   'MacLeod',    'https://i.pravatar.cc/150?u=stub-alice',   'Edinburgh',  'Links purist chasing every Open rota course.', 12.4, 'Muirfield'),
  ('stub.bob@heathland.local',     'Bob',     'Reilly',     'https://i.pravatar.cc/150?u=stub-bob',     'Dublin',     'Society organiser and Dublin Bay regular.',     8.2,  'Portmarnock'),
  ('stub.clare@heathland.local',   'Clare',   'Montgomery', 'https://i.pravatar.cc/150?u=stub-clare',   'St Andrews', 'Architecture nerd. Redan holes forever.',       15.0, 'Old Course'),
  ('stub.dan@heathland.local',     'Dan',     'Whitaker',   'https://i.pravatar.cc/150?u=stub-dan',     'London',     'Bucket-list chaser. Top 100 or bust.',           6.8,  'Sunningdale'),
  ('stub.emma@heathland.local',    'Emma',    'Gallagher',  'https://i.pravatar.cc/150?u=stub-emma',    'Galway',     'Travel golfer. Always packing soft spikes.',    18.2, 'Connemara'),
  ('stub.finn@heathland.local',    'Finn',    'O''Brien',   'https://i.pravatar.cc/150?u=stub-finn',    'Belfast',    'Club photographer and dawn-patrol addict.',     14.1, 'Royal County Down'),
  ('stub.grace@heathland.local',   'Grace',   'Nakamura',   'https://i.pravatar.cc/150?u=stub-grace',   'Manchester', 'Course rec queen. Ask me about Lancashire.',    11.5, 'Formby'),
  ('stub.harry@heathland.local',   'Harry',   'Singh',      'https://i.pravatar.cc/150?u=stub-harry',   'Glasgow',    'Society captain. Banter optional, golf not.',   9.3,  'Troon'),
  ('stub.isla@heathland.local',    'Isla',    'Campbell',   'https://i.pravatar.cc/150?u=stub-isla',    'Inverness',  'Highlands links evangelist.',                   16.7, 'Royal Dornoch'),
  ('stub.jack@heathland.local',    'Jack',    'Moreno',     'https://i.pravatar.cc/150?u=stub-jack',    'Cardiff',    'Club community builder. New members welcome.',  13.0, 'Celtic Manor'),
  ('stub.kate@heathland.local',    'Kate',    'Brennan',    'https://i.pravatar.cc/150?u=stub-kate',    'Cork',       'Wild Atlantic Way itinerary planner.',          10.4, 'Old Head'),
  ('stub.liam@heathland.local',    'Liam',    'Foster',     'https://i.pravatar.cc/150?u=stub-liam',    'York',       'Heathland snob in the best way.',               7.9,  'Ganton')
ON CONFLICT (email) DO NOTHING;

-- ── Communities (one per Discover category) ──────────────────────────────────
INSERT INTO communities (name, slug, description, community_type, created_by, category, rules, cover_photo_url, member_count, post_count)
SELECT v.name, v.slug, v.description, 'public', u.id, v.category, v.rules::jsonb, v.cover, v.member_count, v.post_count
FROM (VALUES
  (
    'Scottish Links Golf',
    'scottish-links-golf',
    'A community for golfers chasing the finest links courses across Scotland — from East Lothian to the Highlands.',
    'Regional Golf',
    '["Be respectful","Share course photos","No spam or self-promo"]',
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=800&auto=format&fit=crop',
    5, 2,
    'stub.alice@heathland.local'
  ),
  (
    'Ireland Golf Travel',
    'ireland-golf-travel',
    'Planning trips around the Wild Atlantic Way, Dublin Bay, and Northern Ireland? Share itineraries, hotels, and tee times.',
    'Golf Travel',
    '["Helpful trip tips only","No booking spam","Keep prices honest"]',
    'https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=800&auto=format&fit=crop',
    4, 2,
    'stub.emma@heathland.local'
  ),
  (
    'Top 100 Chasers UK & Ireland',
    'top-100-chasers-uk-ireland',
    'For golfers ticking off Top 100 lists across Britain and Ireland. Track progress, swap access tips, celebrate milestones.',
    'Top 100 Chasers',
    '["Post your latest tick","No gatekeeping","Celebrate every round"]',
    'https://images.unsplash.com/photo-1590732503206-89686008b49e?q=80&w=800&auto=format&fit=crop',
    5, 2,
    'stub.dan@heathland.local'
  ),
  (
    'London Golf Societies',
    'london-golf-societies',
    'Connect with society organisers around London and the Home Counties. Fixtures, guest days, and friendly matches.',
    'Golf Societies',
    '["Keep invites clear","No aggressive recruiting","Respect club rules"]',
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=800&auto=format&fit=crop',
    4, 1,
    'stub.harry@heathland.local'
  ),
  (
    'Hidden Gem Course Recs',
    'hidden-gem-course-recs',
    'Skip the tourist traps. Recommend underrated tracks worth the drive — parkland, heathland, and quiet links alike.',
    'Course Recommendations',
    '["Explain why you love it","Include region/city","No paid promotions"]',
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=800&auto=format&fit=crop',
    4, 2,
    'stub.grace@heathland.local'
  ),
  (
    'Golf Photography Club',
    'golf-photography-club',
    'Share golden-hour fairways, bunker textures, and clubhouse architecture. Critique welcome, egos not.',
    'Golf Photography',
    '["Credit locations","No AI spam","Constructive critique only"]',
    'https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=800&auto=format&fit=crop',
    4, 2,
    'stub.finn@heathland.local'
  ),
  (
    'Course Architecture Fans',
    'course-architecture-fans',
    'MacKenzie, Colt, Ross, Doak — discuss routing, green complexes, and what makes a great hole great.',
    'Golf Architecture',
    '["Cite sources when you can","Disagree kindly","Photos help"]',
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=800&auto=format&fit=crop',
    4, 1,
    'stub.clare@heathland.local'
  ),
  (
    'Celtic Manor Members Hub',
    'celtic-manor-members-hub',
    'Unofficial hub for Celtic Manor members and regular visitors — course conditions, events, and social rounds.',
    'Club Communities',
    '["Be welcoming to visitors","No confidential club info","Keep it friendly"]',
    'https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=800&auto=format&fit=crop',
    3, 1,
    'stub.jack@heathland.local'
  )
) AS v(name, slug, description, category, rules, cover, member_count, post_count, owner_email)
JOIN users u ON u.email = v.owner_email
WHERE NOT EXISTS (SELECT 1 FROM communities c WHERE c.slug = v.slug);

-- ── Memberships ─────────────────────────────────────────────────────────────
INSERT INTO community_members (community_id, user_id, role)
SELECT c.id, u.id, m.role
FROM (VALUES
  -- Scottish Links Golf
  ('scottish-links-golf', 'stub.alice@heathland.local', 'admin'),
  ('scottish-links-golf', 'stub.bob@heathland.local',   'moderator'),
  ('scottish-links-golf', 'stub.clare@heathland.local', 'member'),
  ('scottish-links-golf', 'stub.isla@heathland.local',  'member'),
  ('scottish-links-golf', 'stub.liam@heathland.local',  'member'),
  -- Ireland Golf Travel
  ('ireland-golf-travel', 'stub.emma@heathland.local',  'admin'),
  ('ireland-golf-travel', 'stub.kate@heathland.local',  'moderator'),
  ('ireland-golf-travel', 'stub.bob@heathland.local',   'member'),
  ('ireland-golf-travel', 'stub.finn@heathland.local',  'member'),
  -- Top 100 Chasers
  ('top-100-chasers-uk-ireland', 'stub.dan@heathland.local',   'admin'),
  ('top-100-chasers-uk-ireland', 'stub.alice@heathland.local', 'moderator'),
  ('top-100-chasers-uk-ireland', 'stub.emma@heathland.local',  'member'),
  ('top-100-chasers-uk-ireland', 'stub.grace@heathland.local', 'member'),
  ('top-100-chasers-uk-ireland', 'stub.liam@heathland.local',  'member'),
  -- London Golf Societies
  ('london-golf-societies', 'stub.harry@heathland.local', 'admin'),
  ('london-golf-societies', 'stub.dan@heathland.local',   'member'),
  ('london-golf-societies', 'stub.grace@heathland.local', 'member'),
  ('london-golf-societies', 'stub.jack@heathland.local',  'member'),
  -- Hidden Gem Course Recs
  ('hidden-gem-course-recs', 'stub.grace@heathland.local', 'admin'),
  ('hidden-gem-course-recs', 'stub.isla@heathland.local',  'moderator'),
  ('hidden-gem-course-recs', 'stub.clare@heathland.local', 'member'),
  ('hidden-gem-course-recs', 'stub.liam@heathland.local',  'member'),
  -- Golf Photography Club
  ('golf-photography-club', 'stub.finn@heathland.local',  'admin'),
  ('golf-photography-club', 'stub.kate@heathland.local',  'member'),
  ('golf-photography-club', 'stub.isla@heathland.local',  'member'),
  ('golf-photography-club', 'stub.alice@heathland.local', 'member'),
  -- Course Architecture Fans
  ('course-architecture-fans', 'stub.clare@heathland.local', 'admin'),
  ('course-architecture-fans', 'stub.dan@heathland.local',   'moderator'),
  ('course-architecture-fans', 'stub.liam@heathland.local',  'member'),
  ('course-architecture-fans', 'stub.finn@heathland.local',  'member'),
  -- Celtic Manor Members Hub
  ('celtic-manor-members-hub', 'stub.jack@heathland.local',  'admin'),
  ('celtic-manor-members-hub', 'stub.harry@heathland.local', 'member'),
  ('celtic-manor-members-hub', 'stub.grace@heathland.local', 'member')
) AS m(slug, email, role)
JOIN communities c ON c.slug = m.slug
JOIN users u ON u.email = m.email
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Keep denormalized member_count in sync
UPDATE communities c
SET member_count = (SELECT COUNT(*)::int FROM community_members cm WHERE cm.community_id = c.id)
WHERE c.slug IN (
  'scottish-links-golf', 'ireland-golf-travel', 'top-100-chasers-uk-ireland',
  'london-golf-societies', 'hidden-gem-course-recs', 'golf-photography-club',
  'course-architecture-fans', 'celtic-manor-members-hub'
);

-- ── Recent posts (drives "N this week" on Discover cards) ────────────────────
INSERT INTO community_posts (community_id, user_id, title, body, post_type, created_at)
SELECT c.id, u.id, p.title, p.body, 'discussion', NOW() - (p.hours_ago || ' hours')::interval
FROM (VALUES
  ('scottish-links-golf', 'stub.alice@heathland.local', 'North Berwick in June', 'Played the Redan hole yesterday — still the most fun short iron on the East Coast. Who else has it on their list this summer?', 6),
  ('scottish-links-golf', 'stub.isla@heathland.local',  'Dornoch conditions', 'Championship Course is running firm already. Book early if you want the evening light.', 28),
  ('ireland-golf-travel', 'stub.emma@heathland.local',  'Kerry 4-day itinerary', 'Ballybunion Old + Lahinch + Tralee with one rest afternoon. Happy to share hotel picks.', 10),
  ('ireland-golf-travel', 'stub.kate@heathland.local',  'Old Head access tip', 'Weekday afternoon rates are kinder than weekends right now. DM if you need the contact.', 40),
  ('top-100-chasers-uk-ireland', 'stub.dan@heathland.local', 'Hit #47 this week', 'Finally got onto Muirfield. Worth every bit of the wait. 48 more to go on my GB&I list.', 4),
  ('top-100-chasers-uk-ireland', 'stub.grace@heathland.local', 'Formby vs Hillside', 'Both cracked my personal top 20. Which Southport track do you rate higher?', 50),
  ('london-golf-societies', 'stub.harry@heathland.local', 'September fixture interest', 'Looking for 3–4 societies for a friendly at a Mid-Surrey track in mid-September. Comment if keen.', 18),
  ('hidden-gem-course-recs', 'stub.grace@heathland.local', 'Underrated Lancashire', 'If you like Formby, try Hillside early morning — quieter and just as good in places.', 8),
  ('hidden-gem-course-recs', 'stub.isla@heathland.local',  'Brora shout', 'Still flying under too many radars. Take a jumper and leave the range finder at home.', 55),
  ('golf-photography-club', 'stub.finn@heathland.local',  'Dawn at County Down', 'Mist over the Mournes at 5:40am. Shot on 35mm — happy to share settings.', 12),
  ('golf-photography-club', 'stub.kate@heathland.local',  'Atlantic light at Old Head', 'Cliff-edge tee shots look unreal at golden hour. Anyone shooting film this season?', 36),
  ('course-architecture-fans', 'stub.clare@heathland.local', 'Favourite Redan greens', 'North Berwick gets the fame, but which UK/Ireland Redan do you think is best executed?', 22),
  ('celtic-manor-members-hub', 'stub.jack@heathland.local', 'Twenty Ten greens rolling', 'Greens are bouncing after the aeration window — book early for the best surfaces.', 15)
) AS p(slug, email, title, body, hours_ago)
JOIN communities c ON c.slug = p.slug
JOIN users u ON u.email = p.email
WHERE NOT EXISTS (
  SELECT 1 FROM community_posts cp
  WHERE cp.community_id = c.id AND cp.user_id = u.id AND cp.title = p.title
);

UPDATE communities c
SET post_count = (SELECT COUNT(*)::int FROM community_posts cp WHERE cp.community_id = c.id AND cp.is_deleted = false)
WHERE c.slug IN (
  'scottish-links-golf', 'ireland-golf-travel', 'top-100-chasers-uk-ireland',
  'london-golf-societies', 'hidden-gem-course-recs', 'golf-photography-club',
  'course-architecture-fans', 'celtic-manor-members-hub'
);
