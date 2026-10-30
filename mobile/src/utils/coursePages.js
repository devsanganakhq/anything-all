// Follow server pagination so countries and maps are never silently capped.
export async function fetchCoursePages(path, signal) {
  const courses = [],
    seen = new Set();
  let offset = 0;
  for (;;) {
    const response = await fetch(
      `${path}${path.includes("?") ? "&" : "?"}offset=${offset}`,
      { signal },
    );
    if (!response.ok) throw new Error("Unable to load courses");
    const page = await response.json(),
      rows = Array.isArray(page) ? page : page.courses;
    if (!Array.isArray(rows)) throw new Error("Invalid course response");
    for (const course of rows)
      if (!seen.has(course.id)) {
        seen.add(course.id);
        courses.push(course);
      }
    if (Array.isArray(page) || !page.hasMore)
      return { courses, total: page.total ?? courses.length };
    if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset <= offset)
      throw new Error("Unable to load the next course page");
    offset = page.nextOffset;
  }
}
