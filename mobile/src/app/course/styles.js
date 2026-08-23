// ─── Shared inline style objects ─────────────────────────────────────────────
export const styles = {
  floatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroPillText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#FFFFFF",
  },
  claimClubBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  claimClubBtnText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
};

// Fake absolute-fill style object (matches StyleSheet.absoluteFill behaviour)
export const StyleSheet_absoluteFill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
