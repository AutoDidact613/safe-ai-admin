import React, { useEffect, useMemo, useState } from "react";

/**
 * Safe Filter Admin – Single-file React + TypeScript UI
 *
 * Features:
 * - Sidebar: scopes list (auto-discovered from prompts/embeddings you load + manual add)
 * - Scope details: Embeddings + Prompts for selected scope
 * - Playground: choose scope, ask a question, see isAllowed result
 * - Manage embeddings: add (create-embedding), delete (delete-embedding)
 *
 * Notes / assumptions:
 * - There is NO "list scopes" endpoint in what you described, so scopes are discovered from:
 *   1) whatever you load (prompts/embeddings) and
 *   2) manual add scope input
 * - DELETE /filter/delete-embedding: since you didn’t specify its body, this UI tries to delete by:
 *   a) _id (preferred) OR
 *   b) scope+topic (fallback)
 *   It sends JSON body with both when possible.
 * - GET endpoints:
 *   GET /filter/get-embeddings/:scope
 *   GET /filter/get-prompts/:scope
 */

type EmbeddingDoc = {
  _id: string;
  scope: string;
  type: "allowed" | "blocked" | string;
  topic: string;
  vector?: number[];
  createdAt?: string;
  __v?: number;
};

type PromptDoc = {
  _id: string;
  code?: string;
  scope: string;
  content: string;
  description?: string;
  createdAt?: string;
  status?: "active" | "inactive" | string;
};

type IsAllowedResponse =
  | {
      isAllowed?: boolean;
      allowed?: boolean;
      reason?: string;
      score?: number;
      matchedTopic?: string;
      debug?: any;
      [k: string]: any;
    }
  | any;

const DEFAULT_BASE_URL = "http://localhost:3001";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const json = safeJsonParse(text);
  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json ?? text;
}

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function smallDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function normalizeIsAllowed(resp: IsAllowedResponse) {
  // Your server may return different shapes. Normalize common patterns.
  if (resp && typeof resp === "object") {
    if (typeof resp.isAllowed === "boolean") return resp.isAllowed;
    if (typeof resp.allowed === "boolean") return resp.allowed;
    if (typeof resp.is_allowed === "boolean") return resp.is_allowed;
  }
  return undefined;
}

const SectionTitle: React.FC<{ title: string; right?: React.ReactNode }> = ({
  title,
  right,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
    <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
    <div style={{ marginLeft: "auto" }}>{right}</div>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "gray" | "green" | "red" | "blue" }> = ({
  children,
  tone = "gray",
}) => {
  const bg =
    tone === "green"
      ? "#E8FAEF"
      : tone === "red"
      ? "#FDECEC"
      : tone === "blue"
      ? "#EAF2FF"
      : "#F3F4F6";
  const fg =
    tone === "green"
      ? "#0F7A33"
      : tone === "red"
      ? "#B42318"
      : tone === "blue"
      ? "#1D4ED8"
      : "#374151";
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: "1px solid rgba(0,0,0,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "danger" | "ghost" }
> = ({ tone = "primary", style, ...props }) => {
  const base: React.CSSProperties = {
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid rgba(0,0,0,0.10)",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.6 : 1,
  };
  const tones: Record<string, React.CSSProperties> = {
    primary: { background: "#111827", color: "white" },
    danger: { background: "#B42318", color: "white" },
    ghost: { background: "transparent", color: "#111827" },
  };
  return <button {...props} style={{ ...base, ...tones[tone], ...style }} />;
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
      borderRadius: 10,
      padding: "10px 12px",
      border: "1px solid rgba(0,0,0,0.12)",
      outline: "none",
      fontSize: 13,
      ...props.style,
    }}
  />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    style={{
      width: "100%",
      borderRadius: 10,
      padding: "10px 12px",
      border: "1px solid rgba(0,0,0,0.12)",
      outline: "none",
      fontSize: 13,
      minHeight: 90,
      ...props.style,
    }}
  />
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      border: "1px solid rgba(0,0,0,0.10)",
      borderRadius: 16,
      padding: 14,
      background: "white",
      boxShadow: "0 1px 10px rgba(0,0,0,0.03)",
      ...style,
    }}
  >
    {children}
  </div>
);

export default function SafeFilterAdmin() {
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    // optional convenience: allow overriding via localStorage
    return localStorage.getItem("safeFilter.baseUrl") || DEFAULT_BASE_URL;
  });

  // Scope discovery: start with a few reasonable defaults
  const [scopes, setScopes] = useState<string[]>(() => {
    const saved = localStorage.getItem("safeFilter.scopes");
    if (saved) {
      const arr = safeJsonParse(saved);
      if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr;
    }
    return ["programming", "general"];
  });

  const [selectedScope, setSelectedScope] = useState<string>(() => {
    return localStorage.getItem("safeFilter.selectedScope") || "programming";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [embeddings, setEmbeddings] = useState<EmbeddingDoc[]>([]);
  const [prompts, setPrompts] = useState<PromptDoc[]>([]);

  // Embeddings filters
  const [embedSearch, setEmbedSearch] = useState("");
  const [embedTypeFilter, setEmbedTypeFilter] = useState<"all" | "allowed" | "blocked">("all");

  // Add embedding form
  const [newEmbeddingType, setNewEmbeddingType] = useState<"allowed" | "blocked">("allowed");
  const [newEmbeddingTopic, setNewEmbeddingTopic] = useState("");

  // Playground
  const [playScope, setPlayScope] = useState<string>(selectedScope);
  const [playText, setPlayText] = useState("איך יוצרים קומפוננטה עם useState בריאקט?");
  const [playResult, setPlayResult] = useState<IsAllowedResponse | null>(null);
  const [playBusy, setPlayBusy] = useState(false);

  // Add scope
  const [newScope, setNewScope] = useState("");

  // Persist basic settings
  useEffect(() => {
    localStorage.setItem("safeFilter.baseUrl", baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    localStorage.setItem("safeFilter.scopes", JSON.stringify(scopes));
  }, [scopes]);

  useEffect(() => {
    localStorage.setItem("safeFilter.selectedScope", selectedScope);
    // keep playground scope aligned when user switches
    setPlayScope(selectedScope);
  }, [selectedScope]);

  const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);

  async function refreshScope(scope: string) {
    setError("");
    setLoading(true);
    try {
      const [emb, pr] = await Promise.all([
        fetchJson(`${base}/filter/get-embeddings/${encodeURIComponent(scope)}`),
        fetchJson(`${base}/filter/get-prompts/${encodeURIComponent(scope)}`),
      ]);

      // Support both "raw array" or {data: array} shapes
      const embArr: EmbeddingDoc[] = Array.isArray(emb) ? emb : Array.isArray(emb?.data) ? emb.data : [];
      const prArr: PromptDoc[] = Array.isArray(pr) ? pr : Array.isArray(pr?.data) ? pr.data : [];

      setEmbeddings(embArr);
      setPrompts(prArr);

      // Discover new scopes from loaded data
      const discovered = new Set<string>(scopes);
      for (const e of embArr) if (e?.scope) discovered.add(e.scope);
      for (const p of prArr) if (p?.scope) discovered.add(p.scope);
      setScopes(Array.from(discovered).sort());
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    refreshScope(selectedScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEmbeddings = useMemo(() => {
    const s = embedSearch.trim().toLowerCase();
    return embeddings
      .filter((e) => (embedTypeFilter === "all" ? true : (e.type || "").toLowerCase() === embedTypeFilter))
      .filter((e) => {
        if (!s) return true;
        const hay = `${e.topic ?? ""} ${e.type ?? ""} ${e._id ?? ""}`.toLowerCase();
        return hay.includes(s);
      });
  }, [embeddings, embedSearch, embedTypeFilter]);

  async function onCreateEmbedding() {
    if (!newEmbeddingTopic.trim()) return;
    setError("");
    try {
      await fetchJson(`${base}/filter/create-embedding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: selectedScope,
          type: newEmbeddingType,
          topic: newEmbeddingTopic.trim(),
        }),
      });
      setNewEmbeddingTopic("");
      await refreshScope(selectedScope);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function onDeleteEmbedding(doc: EmbeddingDoc) {
    const ok = window.confirm(`למחוק embedding?\n\n${doc.topic}\n(${doc.type})`);
    if (!ok) return;

    setError("");
    try {
      // Your DELETE endpoint shape wasn't specified.
      // We send a body with both _id and (scope+topic) so server can choose.
      await fetchJson(`${base}/filter/delete-embedding`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: doc._id,
          scope: doc.scope ?? selectedScope,
          topic: doc.topic,
          type: doc.type,
        }),
      });
      await refreshScope(selectedScope);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function onPlaygroundRun() {
    if (!playText.trim()) return;
    setError("");
    setPlayResult(null);
    setPlayBusy(true);
    try {
      const resp = await fetchJson(`${base}/filter/is-allowed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: playScope,
          text: playText.trim(),
        }),
      });
      setPlayResult(resp);
      // discover scope if needed
      if (playScope && !scopes.includes(playScope)) {
        setScopes([...scopes, playScope].sort());
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setPlayBusy(false);
    }
  }

  function onAddScope() {
    const s = newScope.trim();
    if (!s) return;
    if (!scopes.includes(s)) setScopes([...scopes, s].sort());
    setSelectedScope(s);
    setNewScope("");
    refreshScope(s);
  }

  function onRemoveScope(scope: string) {
    const ok = window.confirm(
      `להסיר את scope "${scope}" מהרשימה ב-UI?\n(זה לא מוחק DB, רק מוריד מהרשימה המקומית)`
    );
    if (!ok) return;
    const next = scopes.filter((x) => x !== scope);
    setScopes(next);
    if (selectedScope === scope) {
      const fallback = next[0] || "";
      setSelectedScope(fallback);
      if (fallback) refreshScope(fallback);
      else {
        setEmbeddings([]);
        setPrompts([]);
      }
    }
  }

  const isAllowed = playResult ? normalizeIsAllowed(playResult) : undefined;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        minHeight: "100vh",
        background: "#F7F8FA",
        color: "#111827",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, "Noto Sans Hebrew", sans-serif',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          padding: 14,
          borderRight: "1px solid rgba(0,0,0,0.08)",
          background: "white",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Safe Filter Admin</div>

        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Base URL</div>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:3001"
          />
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
            טיפ: אם את מריצה דרך Docker על אותו מחשב, זה בדרך כלל <code>localhost:3001</code>.
          </div>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <SectionTitle
            title="Scopes"
            right={
              <Button
                tone="ghost"
                onClick={() => refreshScope(selectedScope)}
                disabled={!selectedScope || loading}
                title="Refresh selected scope"
              >
                ↻
              </Button>
            }
          />

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <Input
              value={newScope}
              onChange={(e) => setNewScope(e.target.value)}
              placeholder='Add scope (e.g. "design")'
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddScope();
              }}
            />
            <Button onClick={onAddScope} disabled={!newScope.trim()}>
              Add
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {scopes.length === 0 && (
              <div style={{ fontSize: 13, color: "#6B7280" }}>אין scopes עדיין. הוסיפי אחד.</div>
            )}
            {scopes.map((s) => {
              const active = s === selectedScope;
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: active ? "#111827" : "white",
                    color: active ? "white" : "#111827",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedScope(s);
                    refreshScope(s);
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s}</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveScope(s);
                      }}
                      title="Remove from UI list"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: active ? "rgba(255,255,255,0.85)" : "#6B7280",
                        fontSize: 14,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Status</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill tone={loading ? "blue" : "green"}>{loading ? "Loading…" : "Ready"}</Pill>
            <Pill tone="gray">scope: {selectedScope || "-"}</Pill>
            <Pill tone="gray">embeddings: {embeddings.length}</Pill>
            <Pill tone="gray">prompts: {prompts.length}</Pill>
          </div>
          {error && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(180,35,24,0.25)",
                background: "#FDECEC",
                color: "#7A271A",
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </div>
          )}
        </Card>
      </div>

      {/* Main */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Scope: {selectedScope || "—"}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button onClick={() => refreshScope(selectedScope)} disabled={!selectedScope || loading}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Playground */}
        <Card>
          <SectionTitle title="Playground (is-allowed)" />
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Scope</div>
              <Input value={playScope} onChange={(e) => setPlayScope(e.target.value)} placeholder="programming" />
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
                אפשר לבחור scope מהרשימה בצד או להקליד אחד חדש.
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Question</div>
              <TextArea value={playText} onChange={(e) => setPlayText(e.target.value)} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <Button onClick={onPlaygroundRun} disabled={playBusy || !playText.trim()}>
                  {playBusy ? "Running…" : "Run"}
                </Button>

                {playResult && (
                  <>
                    {isAllowed === true && <Pill tone="green">ALLOWED</Pill>}
                    {isAllowed === false && <Pill tone="red">BLOCKED</Pill>}
                    {typeof isAllowed !== "boolean" && <Pill tone="gray">Result received</Pill>}
                  </>
                )}
              </div>
            </div>
          </div>

          {playResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Response</div>
              <pre
                style={{
                  background: "#0B1020",
                  color: "#E5E7EB",
                  padding: 12,
                  borderRadius: 14,
                  overflow: "auto",
                  fontSize: 12,
                  lineHeight: 1.45,
                  maxHeight: 260,
                }}
              >
                {pretty(playResult)}
              </pre>
            </div>
          )}
        </Card>

        {/* Embeddings + Prompts */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
          {/* Embeddings */}
          <Card>
            <SectionTitle
              title="Embeddings"
              right={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={embedTypeFilter}
                    onChange={(e) => setEmbedTypeFilter(e.target.value as any)}
                    style={{
                      borderRadius: 10,
                      padding: "8px 10px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontSize: 13,
                      background: "white",
                    }}
                  >
                    <option value="all">All</option>
                    <option value="allowed">Allowed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              }
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 12 }}>
              <Input
                value={embedSearch}
                onChange={(e) => setEmbedSearch(e.target.value)}
                placeholder="Search by topic / type / id…"
              />

              <div
                style={{
                  border: "1px dashed rgba(0,0,0,0.18)",
                  borderRadius: 16,
                  padding: 12,
                  background: "#FAFAFB",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Add embedding</div>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <select
                    value={newEmbeddingType}
                    onChange={(e) => setNewEmbeddingType(e.target.value as any)}
                    style={{
                      borderRadius: 10,
                      padding: "10px 12px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontSize: 13,
                      background: "white",
                    }}
                  >
                    <option value="allowed">allowed</option>
                    <option value="blocked">blocked</option>
                  </select>

                  <Input
                    value={newEmbeddingTopic}
                    onChange={(e) => setNewEmbeddingTopic(e.target.value)}
                    placeholder='topic, e.g. "typescript interfaces generics types"'
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCreateEmbedding();
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button onClick={onCreateEmbedding} disabled={!newEmbeddingTopic.trim()}>
                    Create + Embed
                  </Button>
                  <Button
                    tone="ghost"
                    onClick={() => setNewEmbeddingTopic("")}
                    disabled={!newEmbeddingTopic.trim()}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredEmbeddings.length === 0 ? (
                <div style={{ fontSize: 13, color: "#6B7280" }}>אין embeddings להצגה.</div>
              ) : (
                filteredEmbeddings.map((e) => (
                  <div
                    key={e._id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Pill tone={(e.type || "").toLowerCase() === "blocked" ? "red" : "green"}>
                        {String(e.type || "").toUpperCase()}
                      </Pill>
                      <Pill tone="gray">{e.scope}</Pill>
                      {typeof e.vector?.length === "number" && <Pill tone="blue">vec: {e.vector.length}</Pill>}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <Button tone="danger" onClick={() => onDeleteEmbedding(e)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>{e.topic}</div>

                    <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                      <span>_id: {e._id}</span>
                      {e.createdAt ? <span> • created: {smallDate(e.createdAt)}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Prompts */}
          <Card>
            <SectionTitle title="Prompts" />

            {prompts.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6B7280" }}>אין prompts ל-scope הזה.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {prompts.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Pill tone="gray">{p.scope}</Pill>
                      {p.code ? <Pill tone="blue">{p.code}</Pill> : null}
                      {p.status ? (
                        <Pill tone={String(p.status).toLowerCase() === "active" ? "green" : "gray"}>
                          {String(p.status).toUpperCase()}
                        </Pill>
                      ) : null}
                    </div>

                    {p.description ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>{p.description}</div>
                    ) : null}

                    <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Content</div>
                    <pre
                      style={{
                        background: "#F3F4F6",
                        padding: 10,
                        borderRadius: 14,
                        overflow: "auto",
                        fontSize: 12,
                        lineHeight: 1.45,
                        maxHeight: 240,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {p.content}
                    </pre>

                    {p.createdAt ? (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                        created: {smallDate(p.createdAt)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Footer tips */}
        <div style={{ fontSize: 12, color: "#6B7280" }}>
          <div style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>Server endpoints used</div>
          <div style={{ display: "grid", gap: 4 }}>
            <code>GET {DEFAULT_BASE_URL}/filter/get-embeddings/:scope</code>
            <code>GET {DEFAULT_BASE_URL}/filter/get-prompts/:scope</code>
            <code>POST {DEFAULT_BASE_URL}/filter/is-allowed</code>
            <code>POST {DEFAULT_BASE_URL}/filter/create-embedding</code>
            <code>DELETE {DEFAULT_BASE_URL}/filter/delete-embedding</code>
          </div>
        </div>
      </div>
    </div>
  );
}