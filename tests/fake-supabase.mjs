// Minimal in-memory stand-in for the supabase-js query builder (tests only):
// from().select().eq/neq/in/ilike/is/gte/lt/limit, insert/upsert/update, rpc.
export function fakeSupabase(tables = {}) {
  const calls = [];
  const like = (value, pattern) => String(value ?? "").toLowerCase() === String(pattern).toLowerCase();
  function query(table) {
    const filters = [];
    let op = "select", payload = null, limitN = Infinity, conflict = null;
    const rows = () => (tables[table] ??= []);
    const matches = (r) => filters.every((f) => f(r));
    const run = () => {
      calls.push({ table, op, payload });
      if (op === "select") return { data: rows().filter(matches).slice(0, limitN), error: null };
      if (op === "insert" || op === "upsert") {
        const list = Array.isArray(payload) ? payload : [payload];
        for (const item of list) {
          const keys = conflict ? conflict.split(",") : ["id"];
          const existing = rows().find((r) => keys.every((k) => r[k] !== undefined && r[k] === item[k]));
          if (existing) { if (op === "upsert") Object.assign(existing, item); else return { data: null, error: { message: "duplicate" } }; }
          else { const row = { ...item, id: item.id ?? `${table}-${rows().length + 1}` }; rows().push(row); Object.assign(item, row); }
        }
        return { data: list, error: null };
      }
      if (op === "update") { const hit = rows().filter(matches); hit.forEach((r) => Object.assign(r, payload)); return { data: hit.map((r) => ({ ...r })), error: null }; }
      return { data: null, error: null };
    };
    const builder = {
      select() { return builder; },
      eq(k, v) { filters.push((r) => r[k] === v); return builder; },
      neq(k, v) { filters.push((r) => r[k] !== v); return builder; },
      in(k, vs) { filters.push((r) => vs.includes(r[k])); return builder; },
      ilike(k, v) { filters.push((r) => like(r[k], v)); return builder; },
      is(k, v) { filters.push((r) => (r[k] ?? null) === v); return builder; },
      gte(k, v) { filters.push((r) => r[k] >= v); return builder; },
      lt(k, v) { filters.push((r) => r[k] < v); return builder; },
      or() { return builder; },
      order() { return builder; },
      limit(n) { limitN = n; return builder; },
      insert(p) { op = "insert"; payload = p; return builder; },
      upsert(p, o = {}) { op = "upsert"; payload = p; conflict = o.onConflict || null; return builder; },
      update(p) { op = "update"; payload = p; return builder; },
      maybeSingle() { const r = run(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
      single() { return builder.maybeSingle(); },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    return builder;
  }
  return { tables, calls, from: query, rpc: async (name, args) => { calls.push({ rpc: name, args }); return { data: null, error: null }; } };
}
