import { COUNTRY_FLAGS } from "./constants";

export function countryFlag(country) {
  if (!country) return "";
  return COUNTRY_FLAGS[country.toLowerCase()] || "🌍";
}
