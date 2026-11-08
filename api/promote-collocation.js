// Retired 2026-11-09 (G5): the old PWA's "promote a collocation to a phrase entry" saved the phrase
// as human_reviewed with no dictionary lookup and no checks. Nothing calls it any more (last used
// 2026-08-19; the PWA is no longer served). The handler that was here is in git history (d62bcf8).
export default function handler(req, res) {
  res.status(410).json({ error: "Gone: phrase entries are generated through /api/native (generate_word)." });
}
