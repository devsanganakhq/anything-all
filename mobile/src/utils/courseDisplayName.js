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

export function formatCourseShareLabel(course) {
  const { title, subtitle } = courseDisplayName(course);
  return subtitle ? `${title} — ${subtitle}` : title;
}
