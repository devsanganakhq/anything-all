// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, test, expect, vi } from "vitest";
import { listService } from "../lists";
import { activityService } from "../service";
import { LIST_CATEGORIES, COURSE_CATEGORIES } from "../validation";
const state = vi.hoisted(() => ({ db: null, viewer: 1, requireAuthRequest: false }));
vi.mock("@/app/api/utils/getUserId", () => ({
  getSessionUserId: async (request) => {
    if (state.requireAuthRequest && !request)
      throw Object.assign(Error("Request required for native auth"), { code: "UNAUTHENTICATED" });
    if (!state.viewer)
      throw Object.assign(Error("Sign in"), { code: "UNAUTHENTICATED" });
    return state.viewer;
  },
  getSessionUserIdOrNull: async () => state.viewer,
}));
vi.mock("@/app/api/utils/sql", () => {
  const sql = (parts, ...values) => {
    let text, params;
    if (typeof parts === "string") {
      text = parts;
      params = values[0] || [];
    } else {
      text = parts.reduce((s, p, i) => s + (i ? `$${i}` : "") + p, "");
      params = values;
    }
    return {
      text,
      params,
      then(a, b) {
        return state.db
          .query(text, params)
          .then((r) => r.rows)
          .then(a, b);
      },
    };
  };
  sql.transaction = (queries) =>
    state.db.transaction(async (tx) => {
      const result = [];
      for (const q of queries)
        result.push((await tx.query(q.text, q.params)).rows);
      return result;
    });
  return { default: sql };
});
vi.mock("@/app/api/utils/pushDelivery", () => ({
  flushPushOutbox: async () => ({ sent: 0 }),
}));
let sql, lists, activities;
const req = (url, body) =>
  new Request(
    `https://example.test/api/${url}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(
    readFileSync("schema.sql", "utf8").replace(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      "",
    ),
  );
  await state.db.exec(
    "INSERT INTO users(id,email,password,first_name) VALUES(1,'one@example.test','x','One'),(2,'two@example.test','x','Two'),(3,'three@example.test','x','Three');INSERT INTO courses(id,name,club_name,country) VALUES(1,'North','Club One','England'),(2,'South','Club Two','UAE'),(3,'East','Club Three','England');",
  );
  await state.db.exec(readFileSync("migrations/20261017_activity.sql", "utf8"));
  await state.db.exec(
    readFileSync("migrations/20261019_list_sources.sql", "utf8"),
  );
  await state.db.exec(
    readFileSync("migrations/20261019_push_receipts.sql", "utf8"),
  );
  sql = (await import("@/app/api/utils/sql")).default;
  lists = listService(sql);
  activities = activityService(sql);
}, 30000);
afterAll(() => state.db?.close());
test("draft hiding, immediate progress, completion gate and separate list scoring", async () => {
  const draft = await lists.save(1, null, {
    title: "Two courses",
    description: "A curated experience",
    courseIds: [1, 2],
    isPublished: false,
  });
  expect(await lists.collections(1)).toHaveLength(0);
  await lists.save(1, draft.id, {
    title: "Two courses",
    courseIds: [1, 2],
    isPublished: true,
  });
  const body = {
    scores: Object.fromEntries(LIST_CATEGORIES.map((c) => [c.key, 8])),
    reviewText: "Memorable",
    photos: [],
  };
  await expect(lists.review(1, draft.id, body)).rejects.toMatchObject({
    status: 409,
  });
  await activities.create(1, "round", {
    courseId: 1,
    datePlayed: "2026-01-01",
    requestId: "list-round-00001",
  });
  expect((await lists.collections(1))[0]).toMatchObject({
    played: 1,
    started: 1,
    completed: 0,
  });
  await activities.create(1, "round", {
    courseId: 2,
    datePlayed: "2026-01-02",
    requestId: "list-round-00002",
  });
  expect(await lists.detail(1, draft.id)).toMatchObject({
    completed: true,
    canReview: true,
    list: { started: 1, completed: 1 },
  });
  const saved = await lists.review(1, draft.id, body);
  expect(Number(saved.rating)).toBe(4);
  expect((await lists.review(1, draft.id, body)).id).toBe(saved.id);
  expect((await lists.detail(1, draft.id)).canReview).toBe(false);
  expect(
    (await sql("SELECT community_rating FROM courses WHERE id=1"))[0]
      .community_rating,
  ).toBeNull();
});
test("course details show each activity and category averages; removed photos stay removed", async () => {
  const review = await activities.create(1, "review", {
    courseId: 1,
    datePlayed: "2026-01-01",
    requestId: "photo-review-001",
    scores: Object.fromEntries(COURSE_CATEGORIES.map((c) => [c.key, 8])),
    feeBand: "£150–£250",
    photos: ["https://images.example.test/golf.jpg"],
    termsAccepted: true,
  });
  await activities.edit(1, "review", review.id, {
    courseId: 1,
    datePlayed: "2026-01-02",
    scores: review.scores,
    feeBand: review.fee_band,
    reviewText: "Edited",
    photos: [],
  });
  expect(
    (
      await sql(
        "SELECT deleted_at FROM course_photos WHERE course_review_id=$1",
        [review.id],
      )
    )[0].deleted_at,
  ).toBeTruthy();
  const { GET } = await import("@/app/api/courses/[id]/route");
  const response = await GET(req("courses/1"), { params: { id: "1" } });
  expect(response.status).toBe(200);
  const json = await response.json();
  expect(json.reviews[0]).toMatchObject({ review_text: "Edited", photos: [] });
  expect(json.rounds).toHaveLength(1);
  expect(json.categoryAverages).toHaveLength(5);
  expect(json.curatedLists).toHaveLength(1);
});
test("passport data endpoints deny strangers and permit accepted friends", async () => {
  const [photoReview] = await sql(
    `INSERT INTO course_reviews(user_id,course_id,date_played,review_text,rating,photos)
     VALUES(1,3,'2026-02-03','Two photos',4.5,$1::jsonb) RETURNING id`,
    [JSON.stringify([
      "https://images.example.test/review-one.jpg",
      "https://images.example.test/review-two.jpg",
    ])],
  );
  await sql(
    `UPDATE users SET privacy_settings='{"profile_visible":false}' WHERE id=1`,
  );
  state.viewer = 2;
  const endpoints = [
    ["activity/reviews", await import("@/app/api/activity/reviews/route")],
    ["activity/rounds", await import("@/app/api/activity/rounds/route")],
    [
      "user/played-courses",
      await import("@/app/api/user/played-courses/route"),
    ],
    ["user/wishlist", await import("@/app/api/user/wishlist/route")],
  ];
  for (const [path, route] of endpoints)
    expect((await route.GET(req(`${path}?userId=1`))).status).toBe(403);
  await sql(
    "INSERT INTO friendships(user_id,friend_id,status) VALUES(1,2,'accepted')",
  );
  for (const [path, route] of endpoints)
    expect((await route.GET(req(`${path}?userId=1`))).status).toBe(200);
  const reviews = await endpoints[0][1].GET(req("activity/reviews?userId=1"));
  const reviewJson = await reviews.json();
  expect(reviewJson.reviews.find((review) => review.course_id === 3).photos).toEqual([
    "https://images.example.test/review-one.jpg",
    "https://images.example.test/review-two.jpg",
  ]);
  await sql("DELETE FROM course_reviews WHERE id=$1", [photoReview.id]);
});
test("friend requests, acceptance, following and unfollowing pass the request to native auth", async () => {
  state.requireAuthRequest = true;
  try {
    const friendRequests = await import("@/app/api/friends/request/route");
    const friendResponses = await import("@/app/api/friends/respond/route");
    const friends = await import("@/app/api/friends/list/route");
    const removeFriend = await import("@/app/api/friends/remove/route");
    const follow = await import("@/app/api/social/follow/route");

    state.viewer = 1;
    expect((await follow.POST(req("social/follow", { followeeId: "1" }))).status).toBe(400);
    expect((await follow.POST(req("social/follow", { followeeId: "invalid" }))).status).toBe(400);
    let response = await friendRequests.POST(req("friends/request", { friendId: 3 }));
    expect(response.status).toBe(200);
    const requestRow = (await sql(
      "SELECT id,status FROM friendships WHERE user_id=1 AND friend_id=3",
    ))[0];
    expect(requestRow.status).toBe("pending");

    response = await friends.GET(req("friends/list?status=pending&direction=inbound"));
    expect((await response.json()).friends).toHaveLength(0);
    state.viewer = 3;
    response = await friends.GET(req("friends/list?status=pending&direction=inbound"));
    expect((await response.json()).friends[0].friend_id).toBe(1);
    response = await friendResponses.POST(req("friends/respond", {
      friendshipId: requestRow.id,
      action: "accept",
    }));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("accepted");

    state.viewer = 1;
    response = await follow.POST(req("social/follow", { followeeId: 2, followeeType: "user" }));
    expect(response.status).toBe(200);
    expect((await response.json()).following).toBe(true);
    const followNotice = await sql("SELECT user_id,from_user_id,target_path FROM notifications WHERE user_id=2 AND from_user_id=1 AND notification_type='follow'");
    expect(followNotice).toHaveLength(1);
    expect(followNotice[0].target_path).toBe("/social/1");
    response = await follow.GET(req("social/follow?followeeId=2&followeeType=user"));
    expect((await response.json()).following).toBe(true);
    response = await follow.POST(req("social/follow", { followeeId: 2, followeeType: "user" }));
    expect((await response.json()).following).toBe(false);
    expect(await sql("SELECT * FROM follows WHERE follower_id=1 AND followee_id=2")).toHaveLength(0);

    response = await removeFriend.POST(req("friends/remove", { friendId: 3 }));
    expect(response.status).toBe(200);
    expect(await sql("SELECT * FROM friendships WHERE (user_id=1 AND friend_id=3) OR (user_id=3 AND friend_id=1)")).toHaveLength(0);
  } finally {
    state.requireAuthRequest = false;
  }
});
test("feed retains activity score and applies author privacy to list and detail reads", async () => {
  const { GET } = await import("@/app/api/feed/route");
  state.viewer = 3;
  let response = await GET(req("feed?filter=all"));
  expect(response.status).toBe(200);
  expect((await response.json()).posts).toHaveLength(0);
  state.viewer = 2;
  response = await GET(req("feed?filter=friends"));
  expect(response.status).toBe(200);
  const posts = (await response.json()).posts;
  expect(posts.find((p) => p.post_type === "review").rating).toBe(4);
  expect(posts.find((p) => p.post_type === "played_course").rating).toBeNull();
  const single = (await import("@/app/api/feed/[postId]/route")).GET;
  const postId = posts[0].id;
  state.viewer = 3;
  expect(
    (await single(req(`feed/${postId}`), { params: { postId } })).status,
  ).toBe(404);
});
test("community privacy, three-photo cap and mute-aware notifications", async () => {
  state.viewer = 1;
  await sql(
    "INSERT INTO communities(id,name,slug,created_by,community_type) VALUES(1,'Private club','private',1,'private')",
  );
  await sql(
    "INSERT INTO community_members(community_id,user_id,role) VALUES(1,1,'admin'),(1,2,'member')",
  );
  const chat = await import("@/app/api/communities/[id]/chat/route");
  state.viewer = 3;
  expect(
    (await chat.GET(req("communities/1/chat"), { params: { id: "1" } })).status,
  ).toBe(403);
  state.viewer = 1;
  const res = await chat.POST(
    req("communities/1/chat", {
      text: "Photo message",
      imageUrls: ["https://images.example.test/golf.jpg"],
    }),
    { params: { id: "1" } },
  );
  expect(res.status).toBe(200);
  expect((await res.json()).message.image_urls).toHaveLength(1);
  expect(await sql("SELECT * FROM notifications WHERE user_id=2 AND notification_type='community_message'")).toHaveLength(1);
  await sql("UPDATE community_members SET muted=true WHERE user_id=2");
  await chat.POST(req("communities/1/chat", { text: "Muted message" }), {
    params: { id: "1" },
  });
  expect(await sql("SELECT * FROM notifications WHERE user_id=2 AND notification_type='community_message'")).toHaveLength(
    1,
  );
  expect(
    (
      await chat.POST(
        req("communities/1/chat", {
          text: "Too many",
          imageUrls: Array(4).fill("https://images.example.test/golf.jpg"),
        }),
        { params: { id: "1" } },
      )
    ).status,
  ).toBe(400);
});
test("six client sheets import atomically, rerun safely, retain ties and exclude historical venues", async () => {
  const { importLists } = await import("../importLists");
  const manifest = JSON.parse(
    readFileSync("src/data/client-lists-2026.json", "utf8"),
  );
  await sql(
    "SELECT setval(pg_get_serial_sequence('courses','id'),(SELECT MAX(id) FROM courses))",
  );
  const identities = new Map();
  for (const l of manifest)
    for (const e of l.entries)
      if (e.sourceCourseId) identities.set(e.sourceCourseId, e.metadata);
  for (const [id, m] of identities)
    await sql(
      "INSERT INTO courses(hl_course_id,name,club_name,country,region) VALUES($1,$2,$3,$4,$5)",
      [
        id,
        m.course_name || m.display_name,
        m.club_name,
        m.country,
        m.state || m.region || null,
      ],
    );
  const before = (await sql("SELECT COUNT(*)::int AS n FROM played_courses"))[0]
    .n;
  const first = await importLists(sql, manifest, { apply: true, userId: 1 });
  expect(first).toMatchObject({
    lists: 6,
    entries: 90,
    playable: 86,
    applied: true,
    errors: [],
  });
  expect(first.additions).toHaveLength(2);
  const again = await importLists(sql, manifest, { apply: true, userId: 1 });
  expect(again.applied).toBe(true);
  expect(again.additions).toHaveLength(0);
  expect(
    (
      await sql(
        "SELECT COUNT(*)::int AS n FROM curated_lists WHERE source_key IS NOT NULL",
      )
    )[0].n,
  ).toBe(6);
  expect(
    (await sql("SELECT COUNT(*)::int AS n FROM played_courses"))[0].n,
  ).toBe(before);
  const us = (
    await sql(
      "SELECT id FROM curated_lists WHERE source_key='major_us_open_hosts'",
    )
  )[0];
  let detail = await lists.detail(1, us.id);
  expect(detail.courses).toHaveLength(55);
  expect(detail.total).toBe(51);
  expect(detail.courses.filter((c) => !c.counts_for_completion)).toHaveLength(
    4,
  );
  expect(
    detail.courses.filter((c) => c.counts_for_completion).every((c) => c.id),
  ).toBe(true);
  const england = (
    await sql(
      "SELECT id FROM curated_lists WHERE source_key='collection_england_peak_green_fees_2026_top5'",
    )
  )[0];
  expect((await lists.detail(1, england.id)).total).toBe(6);
  await sql(
    "INSERT INTO played_courses(user_id,course_id) SELECT 1,course_id FROM curated_list_courses WHERE list_id=$1 AND counts_for_completion ON CONFLICT DO NOTHING",
    [us.id],
  );
  detail = await lists.detail(1, us.id);
  expect(detail).toMatchObject({
    completed: true,
    canReview: true,
    total: 51,
    played: 51,
  });
  const changed = structuredClone(manifest);
  changed[0].entries[0].sourceCourseId = "MISSING-ID";
  const rejected = await importLists(sql, changed, { apply: true, userId: 1 });
  expect(rejected.applied).toBe(false);
  expect(rejected.errors.length).toBeGreaterThan(0);
  expect((await lists.detail(1, us.id)).courses).toHaveLength(55);
});
test("country pagination searches the full scope and treats Hawaii as a USA region", async () => {
  state.viewer = 1;
  for (let i = 0; i < 205; i++)
    await sql(
      "INSERT INTO courses(name,club_name,country,region,latitude,longitude) VALUES($1,$1,$2,$3,20,-155)",
      [
        `Hawaii test ${String(i).padStart(3, "0")}`,
        i % 2 ? "USA" : "United States",
        "Hawaii",
      ],
    );
  await sql(
    "INSERT INTO courses(name,country,region,latitude,longitude) VALUES('Mainland test','USA','California',34,-118)",
  );
  const { GET } = await import("@/app/api/courses/list/route");
  let r = await GET(
    req("courses/list?country=Hawaii&limit=200&paginated=true"),
  );
  let page = await r.json();
  expect(r.status).toBe(200);
  expect(page).toMatchObject({ total: 205, hasMore: true, nextOffset: 200 });
  expect(page.courses).toHaveLength(200);
  r = await GET(
    req("courses/list?country=Hawaii&limit=200&offset=200&paginated=true"),
  );
  page = await r.json();
  expect(page.courses).toHaveLength(5);
  expect(page.hasMore).toBe(false);
  r = await GET(req("courses/list?country=Hawaii&q=204&paginated=true"));
  expect((await r.json()).total).toBe(1);
  const map = await import("@/app/api/courses/map/route");
  r = await map.GET(req("courses/map?country=Hawaii&limit=200"));
  page = await r.json();
  expect(page).toMatchObject({ total: 205, hasMore: true, nextOffset: 200 });
  r = await map.GET(req("courses/map?country=Hawaii&offset=200&limit=200"));
  expect((await r.json()).courses).toHaveLength(5);
  r = await GET(req("courses/list?country=Hawaii&limit=bad&offset=-1"));
  expect(r.status).toBe(200);
  expect(Array.isArray(await r.json())).toBe(true);
});
test("account deletion is atomic and removes activity aggregates and credentials", async () => {
  state.viewer = 3;
  await activities.create(3, "round", {
    courseId: 3,
    datePlayed: "2026-01-01",
    requestId: "delete-round-0001",
  });
  await activities.create(3, "review", {
    courseId: 3,
    datePlayed: "2026-01-01",
    requestId: "delete-review-001",
    scores: Object.fromEntries(COURSE_CATEGORIES.map((c) => [c.key, 6])),
    feeBand: "£150–£250",
  });
  const { DELETE } = await import("@/app/api/user/account/route");
  const response = await DELETE(req("user/account"));
  expect(await response.json()).toMatchObject({ success: true });
  expect(await sql("SELECT id FROM users WHERE id=3")).toHaveLength(0);
  expect(
    await sql("SELECT id FROM course_rounds WHERE user_id=3"),
  ).toHaveLength(0);
  expect(
    (
      await sql("SELECT played_count,community_rating FROM courses WHERE id=3")
    )[0],
  ).toMatchObject({ played_count: 0, community_rating: null });
});
test("release readiness requires all six published lists and the migrated backend", async () => {
  const { GET } = await import("@/app/api/health/release/route");
  let r = await GET();
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ ready: true, lists: 6 });
  await sql(
    "UPDATE curated_lists SET is_published=false WHERE source_key='major_us_open_hosts'",
  );
  r = await GET();
  expect(r.status).toBe(503);
  expect((await r.json()).ready).toBe(false);
  await sql(
    "UPDATE curated_lists SET is_published=true WHERE source_key='major_us_open_hosts'",
  );
});

test("notification preferences persist independently on the authenticated account", async () => {
  const { POST } = await import("@/app/api/user/privacy/route");
  await sql("INSERT INTO users(id,email,password) VALUES(4,'prefs-route@example.test','x')");
  state.viewer = 4;
  const values = { friend_requests:false, likes:false, comments:false, follows:false, reviews:false, achievements:false, community_notifications:false };
  expect((await POST(req('user/privacy',{notificationSettings:values}))).status).toBe(200);
  expect((await POST(req('user/privacy',{notificationSettings:{likes:true}}))).status).toBe(200);
  const [saved] = await sql('SELECT notification_settings FROM users WHERE id=4');
  expect(saved.notification_settings).toMatchObject({...values,likes:true});
  expect((await sql('SELECT notification_settings FROM users WHERE id=2'))[0].notification_settings?.likes).not.toBe(false);
  expect((await POST(req('user/privacy',{notificationSettings:{likes:'false'}}))).status).toBe(400);
  state.viewer = null;
  expect((await POST(req('user/privacy',{notificationSettings:{likes:true}}))).status).toBe(401);
});
