// Country identifiers come from the course database; regions retain their
// parent-country identity. Hawaii is a US state, not a separate country.
export const COUNTRY_FLAGS = Object.freeze({
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  ireland: "🇮🇪", "republic of ireland": "🇮🇪", "northern ireland": "🇬🇧",
  uk: "🇬🇧", "united kingdom": "🇬🇧", usa: "🇺🇸", us: "🇺🇸",
  "united states": "🇺🇸", "united states of america": "🇺🇸", hawaii: "🇺🇸",
  australia: "🇦🇺", "new zealand": "🇳🇿", canada: "🇨🇦",
  spain: "🇪🇸", portugal: "🇵🇹", france: "🇫🇷", turkey: "🇹🇷",
  netherlands: "🇳🇱", "the netherlands": "🇳🇱", holland: "🇳🇱",
  germany: "🇩🇪", japan: "🇯🇵", "south africa": "🇿🇦",
  "isle of man": "🇮🇲", uae: "🇦🇪", "united arab emirates": "🇦🇪", dubai: "🇦🇪",
});

export function countryFlag(country) {
  return COUNTRY_FLAGS[String(country || "").trim().toLowerCase()] || "🌍";
}
