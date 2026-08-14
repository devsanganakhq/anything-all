/**
 * GET /api/user/leaderboard
 * Params: scope = overall | year | friends | country
 *
 * Ranks golfers by courses played. Always includes the current user
 * (appended at the end if outside the top list).
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const LIMIT = 50;

export async function GET(request) {
  const USER_ID = await getSessionUserId(request);
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") || "overall").toLowerCase();

  try {
    const yearFilter =
      scope === "year"
        ? `AND EXTRACT(YEAR FROM COALESCE(pc.date_played, pc.created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)`
        : "";

    let scopeJoin = "";
    let scopeWhere = "WHERE u.is_suspended = false";
    const params = [USER_ID];

    if (scope === "friends") {
      scopeWhere += ` AND (
        u.id = $1
        OR u.id IN (
          SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'
          UNION
          SELECT user_id FROM friendships WHERE friend_id = $1 AND status = 'accepted'
        )
      )`;
    } else if (scope === "country") {
      // Same country as the current user (from profile location, else most-played country)
      scopeJoin = `
        LEFT JOIN LATERAL (
          SELECT COALESCE(
            (SELECT NULLIF(TRIM(location), '') FROM users WHERE id = $1),
            (SELECT c.country
             FROM played_courses pc2
             JOIN courses c ON c.id = pc2.course_id
             WHERE pc2.user_id = $1 AND c.country IS NOT NULL
             GROUP BY c.country
             ORDER BY COUNT(*) DESC
             LIMIT 1)
          ) AS user_country
        ) uc ON true
      `;
      scopeWhere += ` AND (
        u.id = $1
        OR (
          uc.user_country IS NOT NULL
          AND (
            LOWER(COALESCE(u.location, '')) = LOWER(uc.user_country)
            OR EXISTS (
              SELECT 1 FROM played_courses pc3
              JOIN courses c3 ON c3.id = pc3.course_id
              WHERE pc3.user_id = u.id AND LOWER(c3.country) = LOWER(uc.user_country)
            )
          )
        )
      )`;
    }

    const rows = await sql(
      `WITH counts AS (
          SELECT
            u.id,
            NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS name,
            u.email,
            u.profile_photo_url AS avatar,
            COALESCE(
              NULLIF(TRIM(u.location), ''),
              (SELECT c.country
               FROM played_courses pc2
               JOIN courses c ON c.id = pc2.course_id
               WHERE pc2.user_id = u.id AND c.country IS NOT NULL
               GROUP BY c.country
               ORDER BY COUNT(*) DESC
               LIMIT 1)
            ) AS country,
            COUNT(pc.id)::int AS courses
          FROM users u
          ${scopeJoin}
          LEFT JOIN played_courses pc
            ON pc.user_id = u.id
            ${yearFilter}
          ${scopeWhere}
          GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_photo_url, u.location
          HAVING COUNT(pc.id) > 0 OR u.id = $1
        ),
        ranked AS (
          SELECT
            id,
            COALESCE(name, SPLIT_PART(email, '@', 1), 'Golfer') AS name,
            avatar,
            country,
            courses,
            RANK() OVER (ORDER BY courses DESC, name ASC)::int AS rank,
            (id = $1) AS is_user
          FROM counts
        )
        SELECT * FROM ranked
        ORDER BY rank ASC, name ASC
        LIMIT ${LIMIT}`,
      params,
    );

    // Ensure current user is present even if outside the top LIMIT
    let leaderboard = rows;
    const userInList = rows.some((r) => r.is_user);
    if (!userInList) {
      const [me] = await sql(
        `WITH counts AS (
            SELECT
              u.id,
              NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS name,
              u.email,
              u.profile_photo_url AS avatar,
              COALESCE(
                NULLIF(TRIM(u.location), ''),
                (SELECT c.country
                 FROM played_courses pc2
                 JOIN courses c ON c.id = pc2.course_id
                 WHERE pc2.user_id = u.id AND c.country IS NOT NULL
                 GROUP BY c.country
                 ORDER BY COUNT(*) DESC
                 LIMIT 1)
              ) AS country,
              COUNT(pc.id)::int AS courses
            FROM users u
            LEFT JOIN played_courses pc
              ON pc.user_id = u.id
              ${yearFilter}
            WHERE u.id = $1
            GROUP BY u.id
          ),
          all_ranks AS (
            SELECT
              u.id,
              COUNT(pc.id)::int AS courses
            FROM users u
            LEFT JOIN played_courses pc
              ON pc.user_id = u.id
              ${yearFilter}
            WHERE u.is_suspended = false
            GROUP BY u.id
          ),
          my_rank AS (
            SELECT 1 + COUNT(*)::int AS rank
            FROM all_ranks ar, counts c
            WHERE ar.courses > c.courses
               OR (ar.courses = c.courses AND ar.id < c.id)
          )
          SELECT
            c.id,
            COALESCE(c.name, SPLIT_PART(c.email, '@', 1), 'Golfer') AS name,
            c.avatar,
            c.country,
            c.courses,
            mr.rank,
            true AS is_user
          FROM counts c
          CROSS JOIN my_rank mr`,
        [USER_ID],
      );
      if (me) leaderboard = [...rows, me];
    }

    return Response.json({
      scope,
      leaderboard: leaderboard.map((r) => ({
        id: r.id,
        rank: Number(r.rank),
        name: r.is_user ? "You" : r.name,
        courses: Number(r.courses),
        country: r.country || null,
        avatar: r.avatar || null,
        isUser: Boolean(r.is_user),
      })),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
