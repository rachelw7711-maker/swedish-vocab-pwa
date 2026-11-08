// Retired 2026-11-09 (G5): the old PWA's "Komplettera" endpoint generated a card with no dictionary
// reference and none of the word-card checks. Nothing calls it any more (the PWA is no longer
// served; the iOS app uses /api/native generate_word, which runs the dictionaries and the checks).
// The handler that was here is in git history (d62bcf8).
export default function handler(req, res) {
  res.status(410).json({ error: "Gone: word cards are generated through /api/native (generate_word)." });
}
