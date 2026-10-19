export const COURSE_CATEGORIES = [
  {
    key: "clubhouse",
    title: "Clubhouse, Welcome, practice facilities, halfway house & Pro shop.",
    caption: "",
  },
  {
    key: "conditioning",
    title: "Course conditioning.",
    caption: "The overall condition & presentation of the golf course",
  },
  {
    key: "enjoyment",
    title: "Course enjoyment & experience",
    caption:
      "How much did you enjoy your round? & how memorable will it remain?",
  },
  {
    key: "value",
    title: "Value for full green fee.",
    caption:
      "Your opinion on how much value the experience is offering for the full green fee advertised",
  },
  {
    key: "overall",
    title: "Overall experience.",
    caption:
      "Factoring in all the categories above and anything more, what’s your opinion on the overall experience?",
  },
];
export const LIST_CATEGORIES = [
  {
    key: "enjoyment",
    title: "Enjoyment",
    caption: "How much did you enjoy completing this list?",
  },
  {
    key: "memorability",
    title: "Memorability",
    caption: "How memorable was the experience of completing this list?",
  },
  {
    key: "value",
    title: "Value",
    caption: "Was the expense of completing the list worth it?",
  },
  {
    key: "recommend",
    title: "Recommend",
    caption:
      "Would you recommend other Heathland Links users complete this list?",
  },
  {
    key: "overall",
    title: "Overall experience",
    caption:
      "Factoring in everything, how good was the overall experience of completing this list?",
  },
];
export const FEE_BANDS = [
  "< £50",
  "£50–£99",
  "£100–£149",
  "£150–£250",
  "> £250",
];
export function invalid(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export function positiveId(value) {
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  )
    throw invalid("Invalid identifier");
  return Number(value);
}
export function photoUrls(value = []) {
  if (!Array.isArray(value) || value.length > 3)
    throw invalid("A maximum of three photos is allowed");
  return value.map((item) => {
    const url =
      typeof item === "string" ? item : item?.image_url || item?.imageUrl;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password)
        throw Error();
    } catch {
      throw invalid("Invalid image URL");
    }
    if (url.length > 2048) throw invalid("Image URL is too long");
    return url;
  });
}
export function scoreReview(scores, categories = COURSE_CATEGORIES) {
  if (
    !scores ||
    typeof scores !== "object" ||
    Array.isArray(scores) ||
    Object.keys(scores).length !== 5
  )
    throw invalid("All five ratings are required");
  for (const { key } of categories)
    if (!Number.isInteger(scores[key]) || scores[key] < 1 || scores[key] > 10)
      throw invalid("Ratings must be whole numbers from 1 to 10");
  return categories.reduce((sum, { key }) => sum + scores[key], 0) / 10;
}
export function activityInput(
  body,
  kind,
  { legacy = false, edit = false } = {},
) {
  const courseId = positiveId(body.courseId);
  const date = String(body.datePlayed || "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw invalid("A valid played date is required");
  if (date > new Date().toISOString().slice(0, 10))
    throw invalid("Played date cannot be in the future");
  const text = body.reviewText ?? body.comments ?? "";
  if (typeof text !== "string" || text.length > 10000)
    throw invalid("Comments must be at most 10,000 characters");
  const photos = photoUrls(body.photos);
  if (photos.length && body.termsAccepted !== true && !edit)
    throw invalid("Photo permission confirmation is required");
  let rating = null,
    scores = null;
  if (kind === "review") {
    if (body.scores) {
      rating = scoreReview(body.scores);
      scores = body.scores;
    } else if (
      legacy &&
      Number.isInteger(body.rating) &&
      body.rating >= 1 &&
      body.rating <= 5
    )
      rating = body.rating;
    else throw invalid("All five review ratings are required");
    if (scores && !FEE_BANDS.includes(body.feeBand))
      throw invalid("Select the full green fee band");
  }
  const requestId = body.requestId;
  if (
    !edit &&
    (typeof requestId !== "string" ||
      !/^[a-zA-Z0-9_-]{12,100}$/.test(requestId))
  )
    throw invalid("A stable request ID is required");
  return {
    courseId,
    date,
    text: text.trim(),
    photos,
    rating,
    scores,
    feeBand: scores ? body.feeBand : null,
    requestId,
  };
}
