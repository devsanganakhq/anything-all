/**
 * POST /api/communities/create
 * Body: { name, slug, description, category, communityType, rules }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const {
    name,
    slug,
    description,
    category,
    communityType = "public",
    rules = [],
  } = await request.json();

  if (!name?.trim() || !slug?.trim() || !description?.trim() || !category) {
    return Response.json(
      { error: "name, slug, description and category required" },
      { status: 400 },
    );
  }

  try {
    // Check slug uniqueness
    const existing = await sql(`SELECT id FROM communities WHERE slug=$1`, [
      slug,
    ]);
    if (existing.length) {
      return Response.json(
        {
          error:
            "A community with that name already exists — try a slightly different name.",
        },
        { status: 409 },
      );
    }

    const result = await sql(
      `INSERT INTO communities (name, slug, description, community_type, created_by, category, rules, member_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       RETURNING id`,
      [
        name.trim(),
        slug,
        description.trim(),
        communityType,
        userId,
        category,
        JSON.stringify(rules),
      ],
    );

    const communityId = result[0].id;

    // Make creator admin
    await sql(
      `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [communityId, userId],
    );

    return Response.json({ success: true, communityId });
  } catch (error) {
    console.error("Create community error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
