// @vitest-environment node
import { expect, test } from "vitest";
import { publicListMetadata } from "../lists";

test("internal import bookkeeping never reaches golfers", () => {
  const out = publicListMetadata({
    notes: "Current playable host-course identity matched to the applicable Heathland Links country master.",
    master_verification_status: "matched", import_action: "link", courses_id: 42,
    profile_link_status: "ok", verification_source: "sheet", price_rank: 3,
  });
  expect(out).toEqual({ price_rank: 3 });
});

test("golfer-facing notes and price fields are kept", () => {
  const note = "Explicit exception: the £145 Saturday full-day ticket is included in the ranking.";
  expect(publicListMetadata({ notes: note, fee_amount_native: 145, fee_currency: "GBP", import_action: "x" }))
    .toEqual({ notes: note, fee_amount_native: 145, fee_currency: "GBP" });
});

test("candidate-bench and master-record notes are withheld", () => {
  for (const notes of [
    "Selected deterministically at the £405 cutoff. Retained as exact cutoff ties in Candidate_Bench.",
    "USA master currently has a club-level profile rather than separate North/South course rows.",
    "Existing USA master ID matched, but its copied coordinates appear inconsistent.",
  ]) expect(publicListMetadata({ notes })).toEqual({});
});

test("missing metadata is safe", () => {
  expect(publicListMetadata(null)).toEqual({});
  expect(publicListMetadata(undefined)).toEqual({});
});
