/**
 * Apply seed-communities.sql against DATABASE_URL from web/.env
 * Usage: node scripts/seed-communities.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(webRoot, ".env");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in web/.env");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const stubUsers = [
  ["stub.alice@heathland.local", "Alice", "MacLeod", "https://i.pravatar.cc/150?u=stub-alice", "Edinburgh", "Links purist chasing every Open rota course.", 12.4, "Muirfield"],
  ["stub.bob@heathland.local", "Bob", "Reilly", "https://i.pravatar.cc/150?u=stub-bob", "Dublin", "Society organiser and Dublin Bay regular.", 8.2, "Portmarnock"],
  ["stub.clare@heathland.local", "Clare", "Montgomery", "https://i.pravatar.cc/150?u=stub-clare", "St Andrews", "Architecture nerd. Redan holes forever.", 15.0, "Old Course"],
  ["stub.dan@heathland.local", "Dan", "Whitaker", "https://i.pravatar.cc/150?u=stub-dan", "London", "Bucket-list chaser. Top 100 or bust.", 6.8, "Sunningdale"],
  ["stub.emma@heathland.local", "Emma", "Gallagher", "https://i.pravatar.cc/150?u=stub-emma", "Galway", "Travel golfer. Always packing soft spikes.", 18.2, "Connemara"],
  ["stub.finn@heathland.local", "Finn", "O'Brien", "https://i.pravatar.cc/150?u=stub-finn", "Belfast", "Club photographer and dawn-patrol addict.", 14.1, "Royal County Down"],
  ["stub.grace@heathland.local", "Grace", "Nakamura", "https://i.pravatar.cc/150?u=stub-grace", "Manchester", "Course rec queen. Ask me about Lancashire.", 11.5, "Formby"],
  ["stub.harry@heathland.local", "Harry", "Singh", "https://i.pravatar.cc/150?u=stub-harry", "Glasgow", "Society captain. Banter optional, golf not.", 9.3, "Troon"],
  ["stub.isla@heathland.local", "Isla", "Campbell", "https://i.pravatar.cc/150?u=stub-isla", "Inverness", "Highlands links evangelist.", 16.7, "Royal Dornoch"],
  ["stub.jack@heathland.local", "Jack", "Moreno", "https://i.pravatar.cc/150?u=stub-jack", "Cardiff", "Club community builder. New members welcome.", 13.0, "Celtic Manor"],
  ["stub.kate@heathland.local", "Kate", "Brennan", "https://i.pravatar.cc/150?u=stub-kate", "Cork", "Wild Atlantic Way itinerary planner.", 10.4, "Old Head"],
  ["stub.liam@heathland.local", "Liam", "Foster", "https://i.pravatar.cc/150?u=stub-liam", "York", "Heathland snob in the best way.", 7.9, "Ganton"],
];

const communities = [
  {
    name: "Scottish Links Golf",
    slug: "scottish-links-golf",
    description:
      "A community for golfers chasing the finest links courses across Scotland — from East Lothian to the Highlands.",
    category: "Regional Golf",
    rules: ["Be respectful", "Share course photos", "No spam or self-promo"],
    cover:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.alice@heathland.local",
    members: [
      ["stub.alice@heathland.local", "admin"],
      ["stub.bob@heathland.local", "moderator"],
      ["stub.clare@heathland.local", "member"],
      ["stub.isla@heathland.local", "member"],
      ["stub.liam@heathland.local", "member"],
    ],
    posts: [
      ["stub.alice@heathland.local", "North Berwick in June", "Played the Redan hole yesterday — still the most fun short iron on the East Coast. Who else has it on their list this summer?", 6],
      ["stub.isla@heathland.local", "Dornoch conditions", "Championship Course is running firm already. Book early if you want the evening light.", 28],
    ],
  },
  {
    name: "Ireland Golf Travel",
    slug: "ireland-golf-travel",
    description:
      "Planning trips around the Wild Atlantic Way, Dublin Bay, and Northern Ireland? Share itineraries, hotels, and tee times.",
    category: "Golf Travel",
    rules: ["Helpful trip tips only", "No booking spam", "Keep prices honest"],
    cover:
      "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.emma@heathland.local",
    members: [
      ["stub.emma@heathland.local", "admin"],
      ["stub.kate@heathland.local", "moderator"],
      ["stub.bob@heathland.local", "member"],
      ["stub.finn@heathland.local", "member"],
    ],
    posts: [
      ["stub.emma@heathland.local", "Kerry 4-day itinerary", "Ballybunion Old + Lahinch + Tralee with one rest afternoon. Happy to share hotel picks.", 10],
      ["stub.kate@heathland.local", "Old Head access tip", "Weekday afternoon rates are kinder than weekends right now. DM if you need the contact.", 40],
    ],
  },
  {
    name: "Top 100 Chasers UK & Ireland",
    slug: "top-100-chasers-uk-ireland",
    description:
      "For golfers ticking off Top 100 lists across Britain and Ireland. Track progress, swap access tips, celebrate milestones.",
    category: "Top 100 Chasers",
    rules: ["Post your latest tick", "No gatekeeping", "Celebrate every round"],
    cover:
      "https://images.unsplash.com/photo-1590732503206-89686008b49e?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.dan@heathland.local",
    members: [
      ["stub.dan@heathland.local", "admin"],
      ["stub.alice@heathland.local", "moderator"],
      ["stub.emma@heathland.local", "member"],
      ["stub.grace@heathland.local", "member"],
      ["stub.liam@heathland.local", "member"],
    ],
    posts: [
      ["stub.dan@heathland.local", "Hit #47 this week", "Finally got onto Muirfield. Worth every bit of the wait. 48 more to go on my GB&I list.", 4],
      ["stub.grace@heathland.local", "Formby vs Hillside", "Both cracked my personal top 20. Which Southport track do you rate higher?", 50],
    ],
  },
  {
    name: "London Golf Societies",
    slug: "london-golf-societies",
    description:
      "Connect with society organisers around London and the Home Counties. Fixtures, guest days, and friendly matches.",
    category: "Golf Societies",
    rules: ["Keep invites clear", "No aggressive recruiting", "Respect club rules"],
    cover:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.harry@heathland.local",
    members: [
      ["stub.harry@heathland.local", "admin"],
      ["stub.dan@heathland.local", "member"],
      ["stub.grace@heathland.local", "member"],
      ["stub.jack@heathland.local", "member"],
    ],
    posts: [
      ["stub.harry@heathland.local", "September fixture interest", "Looking for 3–4 societies for a friendly at a Mid-Surrey track in mid-September. Comment if keen.", 18],
    ],
  },
  {
    name: "Hidden Gem Course Recs",
    slug: "hidden-gem-course-recs",
    description:
      "Skip the tourist traps. Recommend underrated tracks worth the drive — parkland, heathland, and quiet links alike.",
    category: "Course Recommendations",
    rules: ["Explain why you love it", "Include region/city", "No paid promotions"],
    cover:
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.grace@heathland.local",
    members: [
      ["stub.grace@heathland.local", "admin"],
      ["stub.isla@heathland.local", "moderator"],
      ["stub.clare@heathland.local", "member"],
      ["stub.liam@heathland.local", "member"],
    ],
    posts: [
      ["stub.grace@heathland.local", "Underrated Lancashire", "If you like Formby, try Hillside early morning — quieter and just as good in places.", 8],
      ["stub.isla@heathland.local", "Brora shout", "Still flying under too many radars. Take a jumper and leave the range finder at home.", 55],
    ],
  },
  {
    name: "Golf Photography Club",
    slug: "golf-photography-club",
    description:
      "Share golden-hour fairways, bunker textures, and clubhouse architecture. Critique welcome, egos not.",
    category: "Golf Photography",
    rules: ["Credit locations", "No AI spam", "Constructive critique only"],
    cover:
      "https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.finn@heathland.local",
    members: [
      ["stub.finn@heathland.local", "admin"],
      ["stub.kate@heathland.local", "member"],
      ["stub.isla@heathland.local", "member"],
      ["stub.alice@heathland.local", "member"],
    ],
    posts: [
      ["stub.finn@heathland.local", "Dawn at County Down", "Mist over the Mournes at 5:40am. Shot on 35mm — happy to share settings.", 12],
      ["stub.kate@heathland.local", "Atlantic light at Old Head", "Cliff-edge tee shots look unreal at golden hour. Anyone shooting film this season?", 36],
    ],
  },
  {
    name: "Course Architecture Fans",
    slug: "course-architecture-fans",
    description:
      "MacKenzie, Colt, Ross, Doak — discuss routing, green complexes, and what makes a great hole great.",
    category: "Golf Architecture",
    rules: ["Cite sources when you can", "Disagree kindly", "Photos help"],
    cover:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.clare@heathland.local",
    members: [
      ["stub.clare@heathland.local", "admin"],
      ["stub.dan@heathland.local", "moderator"],
      ["stub.liam@heathland.local", "member"],
      ["stub.finn@heathland.local", "member"],
    ],
    posts: [
      ["stub.clare@heathland.local", "Favourite Redan greens", "North Berwick gets the fame, but which UK/Ireland Redan do you think is best executed?", 22],
    ],
  },
  {
    name: "Celtic Manor Members Hub",
    slug: "celtic-manor-members-hub",
    description:
      "Unofficial hub for Celtic Manor members and regular visitors — course conditions, events, and social rounds.",
    category: "Club Communities",
    rules: ["Be welcoming to visitors", "No confidential club info", "Keep it friendly"],
    cover:
      "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=800&auto=format&fit=crop",
    ownerEmail: "stub.jack@heathland.local",
    members: [
      ["stub.jack@heathland.local", "admin"],
      ["stub.harry@heathland.local", "member"],
      ["stub.grace@heathland.local", "member"],
    ],
    posts: [
      ["stub.jack@heathland.local", "Twenty Ten greens rolling", "Greens are bouncing after the aeration window — book early for the best surfaces.", 15],
    ],
  },
];

async function main() {
  console.log("Seeding stub users…");
  for (const [email, first, last, photo, location, bio, handicap, club] of stubUsers) {
    await sql`
      INSERT INTO users (email, first_name, last_name, profile_photo_url, location, bio, handicap, home_club_name)
      VALUES (${email}, ${first}, ${last}, ${photo}, ${location}, ${bio}, ${handicap}, ${club})
      ON CONFLICT (email) DO NOTHING
    `;
  }

  const userRows = await sql`
    SELECT id, email FROM users WHERE email LIKE 'stub.%@heathland.local'
  `;
  const userIdByEmail = Object.fromEntries(userRows.map((r) => [r.email, r.id]));

  console.log(`Stub users ready: ${userRows.length}`);

  for (const c of communities) {
    const ownerId = userIdByEmail[c.ownerEmail];
    if (!ownerId) throw new Error(`Missing owner user for ${c.slug}`);

    const existing = await sql`SELECT id FROM communities WHERE slug = ${c.slug} LIMIT 1`;
    let communityId = existing[0]?.id;

    if (!communityId) {
      const inserted = await sql`
        INSERT INTO communities (
          name, slug, description, community_type, created_by, category,
          rules, cover_photo_url, member_count, post_count
        )
        VALUES (
          ${c.name}, ${c.slug}, ${c.description}, 'public', ${ownerId}, ${c.category},
          ${JSON.stringify(c.rules)}::jsonb, ${c.cover}, ${c.members.length}, ${c.posts.length}
        )
        RETURNING id
      `;
      communityId = inserted[0].id;
      console.log(`Created community: ${c.name} (#${communityId})`);
    } else {
      console.log(`Community already exists: ${c.name} (#${communityId})`);
    }

    for (const [email, role] of c.members) {
      const uid = userIdByEmail[email];
      if (!uid) throw new Error(`Missing member ${email}`);
      await sql`
        INSERT INTO community_members (community_id, user_id, role)
        VALUES (${communityId}, ${uid}, ${role})
        ON CONFLICT (community_id, user_id) DO NOTHING
      `;
    }

    for (const [email, title, body, hoursAgo] of c.posts) {
      const uid = userIdByEmail[email];
      const dup = await sql`
        SELECT id FROM community_posts
        WHERE community_id = ${communityId} AND user_id = ${uid} AND title = ${title}
        LIMIT 1
      `;
      if (dup.length) continue;
      await sql`
        INSERT INTO community_posts (community_id, user_id, title, body, post_type, created_at)
        VALUES (
          ${communityId}, ${uid}, ${title}, ${body}, 'discussion',
          NOW() - (${hoursAgo} || ' hours')::interval
        )
      `;
    }

    await sql`
      UPDATE communities
      SET
        member_count = (SELECT COUNT(*)::int FROM community_members WHERE community_id = ${communityId}),
        post_count = (SELECT COUNT(*)::int FROM community_posts WHERE community_id = ${communityId} AND is_deleted = false)
      WHERE id = ${communityId}
    `;
  }

  const summary = await sql`
    SELECT c.name, c.category, c.member_count, c.post_count, c.slug
    FROM communities c
    WHERE c.slug IN (
      'scottish-links-golf', 'ireland-golf-travel', 'top-100-chasers-uk-ireland',
      'london-golf-societies', 'hidden-gem-course-recs', 'golf-photography-club',
      'course-architecture-fans', 'celtic-manor-members-hub'
    )
    ORDER BY c.member_count DESC
  `;

  console.log("\nDiscover-ready communities:");
  for (const row of summary) {
    console.log(`  • ${row.name} [${row.category}] — ${row.member_count} members, ${row.post_count} posts`);
  }
  console.log("\nDone. Open Communities → Discover in the app.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
