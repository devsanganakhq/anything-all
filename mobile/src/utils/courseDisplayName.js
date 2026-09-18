function norm(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function namesEqual(a, b) {
  return norm(a).toLowerCase() === norm(b).toLowerCase();
}

/**
 * Club name first; course name as subtitle only when it is a distinct course.
 */
export function courseDisplayName(course) {
  const club = norm(course?.club_name);
  const courseName = norm(course?.name || course?.course_name);
  const display = norm(course?.display_name);

  if (club && courseName && !namesEqual(club, courseName)) {
    return { title: club, subtitle: courseName };
  }
  if (club) return { title: club, subtitle: null };
  if (courseName) return { title: courseName, subtitle: null };
  if (display) return { title: display, subtitle: null };
  return { title: "Golf course", subtitle: null };
}

export function formatCourseLocation(course, { includeCounty = false } = {}) {
  const parts = includeCounty
    ? [course?.city, course?.county, course?.country]
    : [course?.city, course?.country];
  return parts.filter(Boolean).join(", ");
}

/** Same defaults as course details Overview when DB values are missing. */
export function resolveCourseHoles(course) {
  const raw = course?.holes ?? course?.course_holes;
  if (raw == null || raw === "") return 18;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 18;
}

export function resolveCoursePar(course) {
  const raw = course?.par ?? course?.course_par;
  if (raw == null || raw === "") return 72;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 72;
}

export function formatCourseHolesPar(course, { compact = false } = {}) {
  const holes = resolveCourseHoles(course);
  const par = resolveCoursePar(course);
  return compact ? `${holes}H · Par ${par}` : `${holes} holes · Par ${par}`;
}

export function formatCourseShareLabel(course) {
  const { title, subtitle } = courseDisplayName(course);
  return subtitle ? `${title} — ${subtitle}` : title;
}
