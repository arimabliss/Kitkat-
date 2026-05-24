import { useState, useEffect, useCallback } from "react";

const RELATIONSHIP_START = new Date("2026-04-28T17:41:00");

function getElapsed(from) {
  const diff = Math.max(0, Date.now() - from.getTime());
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function getRemaining(to) {
  const diff = new Date(to).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const EMOJIS_MOOD = ["😊","😍","🥰","😢","😴","🤗","😤","🥺","😌","🌟","😘","💭"];
const EMOJIS_MEM  = ["💕","💗","🥰","😊","🌙","✨","💌","🎉","🌹","💝","🌟","📸","🎵","🌊","☕"];
const QUOTES = [
  "Distance means nothing when someone means everything 💫",
  "Same moon, same stars, always together 🌙",
  "Every day brings us closer to forever ✨",
  "Missing you is proof that this love is real 💗",
  "Across every mile, you are home 🏡",
  "The wait makes the reunion even sweeter 🌹",
];

const STORAGE_DEFAULTS = {
  names: { p1: "Your Name", p2: "Their Name" },
  memories: [],
  letter: "",
  nextVisit: "",
  playlist: [],
  moods: { p1: "😊", p2: "😊" },
};

async function load(key, fallback) {
  try {
    const r = await window.storage.get(key);
    if (r && r.value) return JSON.parse(r.value);
  } catch {}
  return fallback;
}
async function save(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

function useStorage(key, fallback) {
  const [val, setVal] = useState(fallback);
  useEffect(() => { load(key, fallback).then(setVal); }, []);
  const set = useCallback((v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    save(key, next);
  }, [val, key]);
  return [val, set];
}

function CountdownBlock({ label, value, big }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(212,175,140,0.18)",
      borderRadius: big ? 18 : 14,
      padding: big ? "22px 18px" : "14px 12px",
      textAlign: "center",
      minWidth: big ? 88 : 64,
      backdropFilter: "blur(12px)",
      flex: 1,
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: big ? "clamp(2.2rem,5vw,3.6rem)" : "clamp(1.4rem,3vw,2rem)",
        fontWeight: 700,
        color: "#f5cdd8",
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>
        {String(value).padStart(2, "0")}
      </div>
      <div style={{
        fontSize: big ? "0.65rem" : "0.6rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#d4af8c",
        marginTop: 6,
        fontFamily: "'Jost', sans-serif",
      }}>{label}</div>
    </div>
  );
}

function MemoryCard({ memory, onClick, delay }) {
  return (
    <div onClick={onClick} style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(212,175,140,0.14)",
      borderRadius: 18,
      padding: "22px 20px",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(.23,1,.32,1)",
      animation: `fadeUp 0.5s ${delay}s both ease`,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(160,60,100,0.22)"; e.currentTarget.style.borderColor = "rgba(212,175,140,0.35)"; e.currentTarget.style.background = "rgba(180,90,120,0.13)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "rgba(212,175,140,0.14)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
    >
      <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>{memory.emoji}</div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#f5cdd8", marginBottom: 6, fontWeight: 600 }}>{memory.title}</h3>
      {memory.date && <p style={{ fontSize: "0.7rem", color: "#d4af8c", marginBottom: 10, letterSpacing: "0.05em" }}>📅 {memory.date}</p>}
      <p style={{ fontSize: "0.85rem", color: "rgba(240,230,215,0.55)", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
        {memory.content || "—"}
      </p>
    </div>
  );
}

export default function App() {
  const [names, setNames] = useStorage("names", STORAGE_DEFAULTS.names);
  const [memories, setMemories] = useStorage("memories", []);
  const [letter, setLetter] = useStorage("letter", "");
  const [nextVisit, setNextVisit] = useStorage("nextVisit", "");
  const [playlist, setPlaylist] = useStorage("playlist", []);
  const [moods, setMoods] = useStorage("moods", STORAGE_DEFAULTS.moods);

  const [tab, setTab] = useState("home");
  const [elapsed, setElapsed] = useState(getElapsed(RELATIONSHIP_START));
  const [visitCD, setVisitCD] = useState(null);
  const [hugState, setHugState] = useState(false);
  const [editNames, setEditNames] = useState(false);
  const [editLetter, setEditLetter] = useState(false);
  const [letterDraft, setLetterDraft] = useState(letter);
  const [showAddMem, setShowAddMem] = useState(false);
  const [viewMem, setViewMem] = useState(null);
  const [newMem, setNewMem] = useState({ title: "", content: "", date: "", emoji: "💕" });
  const [newSong, setNewSong] = useState("");
  const [tmpNames, setTmpNames] = useState(names);
  const [stars] = useState(() =>
    Array.from({ length: 90 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.8,
      dur: (Math.random() * 3 + 2).toFixed(1),
      del: (Math.random() * 6).toFixed(1),
    }))
  );
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(getElapsed(RELATIONSHIP_START));
      if (nextVisit) setVisitCD(getRemaining(nextVisit));
    }, 1000);
    return () => clearInterval(id);
  }, [nextVisit]);

  useEffect(() => { setLetterDraft(letter); }, [letter]);
  useEffect(() => { setTmpNames(names); }, [names]);

  const addMemory = () => {
    if (!newMem.title.trim()) return;
    setMemories(prev => [...prev, { ...newMem, id: Date.now() }]);
    setNewMem({ title: "", content: "", date: "", emoji: "💕" });
    setShowAddMem(false);
  };

  const deleteMemory = (id) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    setViewMem(null);
  };

  const sendHug = () => {
    setHugState(true);
    setTimeout(() => setHugState(false), 3500);
  };

  const TABS = [
    { id: "home",     label: "Home",     icon: "✦" },
    { id: "memories", label: "Memories", icon: "♡" },
    { id: "letters",  label: "Letters",  icon: "✉" },
    { id: "connect",  label: "Connect",  icon: "⊹" },
  ];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#080815;}
    ::-webkit-scrollbar{width:3px;}
    ::-webkit-scrollbar-track{background:#080815;}
    ::-webkit-scrollbar-thumb{background:#7a3a5a;border-radius:2px;}
    @keyframes twinkle{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes hugPop{0%{transform:scale(1)}30%{transform:scale(1.35)}65%{transform:scale(.95)}100%{transform:scale(1)}}
    @keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.12)}28%{transform:scale(1)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
    .star{position:fixed;border-radius:50%;background:#fff;pointer-events:none;}
    .btn-primary{background:linear-gradient(135deg,#7a3a5a,#c07080);border:none;border-radius:50px;color:#fff;cursor:pointer;font-family:'Jost',sans-serif;font-size:.88rem;font-weight:600;letter-spacing:.06em;padding:10px 26px;transition:all .3s;white-space:nowrap;}
    .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(122,58,90,.55);}
    .btn-ghost{background:rgba(255,255,255,.06);border:1px solid rgba(212,175,140,.2);border-radius:50px;color:#d4af8c;cursor:pointer;font-family:'Jost',sans-serif;font-size:.82rem;padding:8px 18px;transition:all .3s;}
    .btn-ghost:hover{background:rgba(212,175,140,.12);border-color:rgba(212,175,140,.4);}
    .tab-btn{background:none;border:none;color:rgba(212,175,140,.5);cursor:pointer;font-family:'Jost',sans-serif;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;padding:10px 18px;border-radius:40px;transition:all .3s;display:flex;align-items:center;gap:6px;}
    .tab-btn.active,.tab-btn:hover{background:rgba(180,90,120,.22);color:#f5cdd8;}
    .inp{background:rgba(255,255,255,.06);border:1px solid rgba(212,175,140,.18);border-radius:12px;color:#f0e6d5;font-family:'Jost',sans-serif;font-size:.88rem;padding:10px 14px;width:100%;outline:none;transition:border-color .3s;}
    .inp:focus{border-color:rgba(212,175,140,.5);}
    .inp::placeholder{color:rgba(212,175,140,.35);}
    .card{background:rgba(255,255,255,.035);border:1px solid rgba(212,175,140,.12);border-radius:22px;padding:28px;}
    .shimmer-text{background:linear-gradient(90deg,#d4af8c,#f5cdd8,#f0b8c8,#d4af8c);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3.5s linear infinite;}
    .emoji-btn{background:rgba(255,255,255,.05);border:2px solid transparent;border-radius:10px;cursor:pointer;font-size:1.4rem;padding:6px 8px;transition:all .2s;line-height:1;}
    .emoji-btn:hover,.emoji-btn.sel{background:rgba(180,90,120,.2);border-color:rgba(212,175,140,.4);transform:scale(1.18);}
    .overlay{position:fixed;inset:0;background:rgba(4,4,18,.88);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
    .modal{background:linear-gradient(145deg,#10102a,#180f2e);border:1px solid rgba(212,175,140,.22);border-radius:26px;padding:36px;max-width:540px;width:100%;max-height:82vh;overflow-y:auto;animation:slideDown .3s ease;}
  `;

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", background: "#080815", minHeight: "100vh", color: "#f0e6d5" }}>
      <style>{css}</style>

      {/* Stars */}
      {stars.map(s => (
        <div key={s.id} className="star" style={{
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          animation: `twinkle ${s.dur}s ${s.del}s infinite ease-in-out`,
        }} />
      ))}

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: "blur(24px)", background: "rgba(8,8,21,.75)",
        borderBottom: "1px solid rgba(212,175,140,.08)",
        padding: "10px 16px", display: "flex", justifyContent: "center",
        gap: 4, flexWrap: "wrap",
      }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "84px 20px 72px" }}>

        {/* ─── HOME ─── */}
        {tab === "home" && (
          <div style={{ animation: "fadeUp .5s ease" }}>
            {/* Names */}
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              {editNames ? (
                <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                  <input className="inp" value={tmpNames.p1} onChange={e => setTmpNames(p => ({ ...p, p1: e.target.value }))} style={{ width: 160, textAlign: "center" }} />
                  <span style={{ fontSize: "1.8rem", color: "#c07080" }}>♡</span>
                  <input className="inp" value={tmpNames.p2} onChange={e => setTmpNames(p => ({ ...p, p2: e.target.value }))} style={{ width: 160, textAlign: "center" }} />
                  <button className="btn-primary" onClick={() => { setNames(tmpNames); setEditNames(false); }}>Save</button>
                  <button className="btn-ghost" onClick={() => setEditNames(false)}>Cancel</button>
                </div>
              ) : (
                <div onClick={() => setEditNames(true)} style={{ cursor: "pointer", display: "inline-block" }}>
                  <h1 className="shimmer-text" style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(2rem,6vw,3.8rem)",
                    fontWeight: 400, lineHeight: 1.2,
                  }}>
                    {names.p1} <span style={{ color: "#c07080", WebkitTextFillColor: "#c07080" }}>♡</span> {names.p2}
                  </h1>
                  <p style={{ color: "rgba(212,175,140,.35)", fontSize: ".7rem", marginTop: 4, letterSpacing: ".1em" }}>tap to edit names</p>
                </div>
              )}
              <p style={{ color: "#d4af8c", fontSize: ".75rem", letterSpacing: ".2em", textTransform: "uppercase", marginTop: 14 }}>
                Together Since April 28, 2026 at 5:41 PM
              </p>
            </div>

            {/* Elapsed Countdown */}
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#d4af8c", marginBottom: 22, fontSize: "1.05rem" }}>
                We've been in love for…
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {[["days", elapsed.days], ["hours", elapsed.hours], ["minutes", elapsed.minutes], ["seconds", elapsed.seconds]].map(([l, v]) => (
                  <CountdownBlock key={l} label={l} value={v} big />
                ))}
              </div>
              <div style={{ marginTop: 24, animation: "heartbeat 1.8s infinite" }}>
                <span style={{ fontSize: "2.2rem" }}>💗</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(212,175,140,.08)", margin: "0 0 36px" }} />

            {/* Next Visit */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.55rem", color: "#f5cdd8", marginBottom: 20 }}>
                ✈️ Next Time Together
              </h2>
              <input
                type="datetime-local"
                className="inp"
                value={nextVisit}
                onChange={e => { setNextVisit(e.target.value); }}
                style={{ maxWidth: 280, marginBottom: 20 }}
              />
              {visitCD ? (
                <div>
                  <p style={{ color: "rgba(212,175,140,.6)", fontSize: ".82rem", marginBottom: 14 }}>Counting down to our reunion…</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[["days", visitCD.days], ["hours", visitCD.hours], ["min", visitCD.minutes], ["sec", visitCD.seconds]].map(([l, v]) => (
                      <CountdownBlock key={l} label={l} value={v} />
                    ))}
                  </div>
                </div>
              ) : nextVisit ? (
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#f5cdd8" }}>🥳 That day is here!</p>
              ) : (
                <p style={{ color: "rgba(212,175,140,.35)", fontSize: ".82rem" }}>Set a reunion date to begin the countdown…</p>
              )}
            </div>

            {/* Mood */}
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.55rem", color: "#f5cdd8", marginBottom: 24 }}>
                🌙 How Are We Feeling?
              </h2>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                {[{ key: "p1", label: names.p1 }, { key: "p2", label: names.p2 }].map(({ key, label }) => (
                  <div key={key} style={{ flex: 1, minWidth: 190 }}>
                    <p style={{ color: "#d4af8c", fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>{label}</p>
                    <div style={{ fontSize: "2.6rem", marginBottom: 14 }}>{moods[key]}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {EMOJIS_MOOD.map(e => (
                        <button key={e} className={`emoji-btn ${moods[key] === e ? "sel" : ""}`}
                          onClick={() => setMoods(prev => ({ ...prev, [key]: e }))}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily quote */}
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <p style={{
                fontFamily: "'Playfair Display', serif", fontStyle: "italic",
                fontSize: "1.05rem", color: "rgba(212,175,140,.6)", lineHeight: 1.7,
              }}>
                "{QUOTES[quoteIdx]}"
              </p>
            </div>
          </div>
        )}

        {/* ─── MEMORIES ─── */}
        {tab === "memories" && (
          <div style={{ animation: "fadeUp .5s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 400, color: "#f5cdd8" }}>
                  Our Memories
                </h1>
                <p style={{ color: "rgba(212,175,140,.4)", fontSize: ".78rem", marginTop: 4 }}>{memories.length} {memories.length === 1 ? "moment" : "moments"} captured</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddMem(true)}>+ Add Memory</button>
            </div>

            {memories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "90px 0", color: "rgba(212,175,140,.35)" }}>
                <div style={{ fontSize: "4rem", marginBottom: 18, animation: "float 3s infinite" }}>📸</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "rgba(245,205,216,.5)" }}>Your story begins here</p>
                <p style={{ fontSize: ".82rem", marginTop: 8, marginBottom: 28 }}>Add your first memory together</p>
                <button className="btn-primary" onClick={() => setShowAddMem(true)}>Create First Memory</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
                {memories.map((m, i) => (
                  <MemoryCard key={m.id} memory={m} delay={i * 0.06} onClick={() => setViewMem(m)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── LETTERS ─── */}
        {tab === "letters" && (
          <div style={{ animation: "fadeUp .5s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 400, color: "#f5cdd8" }}>
                  Letters
                </h1>
                <p style={{ color: "rgba(212,175,140,.4)", fontSize: ".78rem", marginTop: 4 }}>Words across the distance</p>
              </div>
              {!editLetter && (
                <button className="btn-ghost" onClick={() => setEditLetter(true)}>✏️ {letter ? "Edit" : "Write"} Letter</button>
              )}
            </div>

            {editLetter ? (
              <div>
                <textarea
                  className="inp"
                  value={letterDraft}
                  onChange={e => setLetterDraft(e.target.value)}
                  placeholder={`My dearest ${names.p2},\n\nWrite your heart here…\n\nAll my love,\n${names.p1}`}
                  style={{ minHeight: 400, lineHeight: 1.85, fontSize: "1rem", fontFamily: "'Playfair Display', serif", borderRadius: 18 }}
                />
                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button className="btn-primary" onClick={() => { setLetter(letterDraft); setEditLetter(false); }}>Save Letter</button>
                  <button className="btn-ghost" onClick={() => { setLetterDraft(letter); setEditLetter(false); }}>Cancel</button>
                </div>
              </div>
            ) : letter ? (
              <div style={{
                background: "linear-gradient(170deg,rgba(22,18,48,.9),rgba(16,12,36,.9))",
                border: "1px solid rgba(212,175,140,.16)",
                borderRadius: 22,
                padding: "clamp(28px,5vw,54px)",
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.05rem",
                lineHeight: 1.95,
                color: "#e8d8c4",
                position: "relative",
                whiteSpace: "pre-wrap",
              }}>
                <div style={{
                  position: "absolute", left: "clamp(42px,7vw,70px)",
                  top: 0, bottom: 0, width: 1,
                  background: "rgba(212,175,140,.06)"
                }} />
                <p style={{ fontSize: ".68rem", letterSpacing: ".1em", color: "rgba(212,175,140,.3)", marginBottom: 28, fontFamily: "'Jost', sans-serif", textTransform: "uppercase" }}>
                  — press ✏️ Edit Letter to update —
                </p>
                {letter}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "90px 0", color: "rgba(212,175,140,.35)" }}>
                <div style={{ fontSize: "4rem", marginBottom: 18, animation: "float 3s infinite" }}>✉️</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "rgba(245,205,216,.5)" }}>No letter yet</p>
                <p style={{ fontSize: ".82rem", marginTop: 8, marginBottom: 28 }}>Write something beautiful to your love</p>
                <button className="btn-primary" onClick={() => setEditLetter(true)}>Write a Letter</button>
              </div>
            )}
          </div>
        )}

        {/* ─── CONNECT ─── */}
        {tab === "connect" && (
          <div style={{ animation: "fadeUp .5s ease" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 400, color: "#f5cdd8", marginBottom: 40 }}>
              Stay Connected
            </h1>

            {/* Virtual Hug */}
            <div className="card" style={{ marginBottom: 22, textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.55rem", color: "#f5cdd8", marginBottom: 10 }}>Virtual Hug 🤗</h2>
              <p style={{ color: "rgba(212,175,140,.55)", fontSize: ".85rem", marginBottom: 26, maxWidth: 340, margin: "0 auto 26px" }}>
                Send warmth across every mile
              </p>
              <button
                className="btn-primary"
                onClick={sendHug}
                style={{
                  fontSize: "1rem", padding: "14px 40px",
                  animation: hugState ? "hugPop .6s ease" : "none",
                  background: hugState ? "linear-gradient(135deg,#c47a8a,#e0a0b0)" : undefined,
                }}
              >
                {hugState ? "💕 Hug Sent! 💕" : "Send a Hug ∿"}
              </button>
              {hugState && (
                <div style={{ marginTop: 20, fontSize: "2rem", display: "flex", justifyContent: "center", gap: 12 }}>
                  {["🤗","💗","✨","💗","🤗"].map((e,i) => (
                    <span key={i} style={{ animation: `float ${1 + i * .15}s ${i * .1}s infinite ease-in-out`, display: "inline-block" }}>{e}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Playlist */}
            <div className="card" style={{ marginBottom: 22 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.55rem", color: "#f5cdd8", marginBottom: 20 }}>🎵 Our Playlist</h2>
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  className="inp"
                  placeholder="Add a song that reminds you of them…"
                  value={newSong}
                  onChange={e => setNewSong(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newSong.trim()) {
                      setPlaylist(p => [...p, { id: Date.now(), song: newSong.trim() }]);
                      setNewSong("");
                    }
                  }}
                />
                <button className="btn-primary" onClick={() => {
                  if (newSong.trim()) {
                    setPlaylist(p => [...p, { id: Date.now(), song: newSong.trim() }]);
                    setNewSong("");
                  }
                }}>Add</button>
              </div>
              {playlist.length === 0 ? (
                <p style={{ color: "rgba(212,175,140,.35)", fontSize: ".82rem" }}>Songs that carry your hearts to each other…</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {playlist.map((item, i) => (
                    <div key={item.id} style={{
                      background: "rgba(255,255,255,.04)", borderRadius: 12,
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    }}>
                      <span style={{ color: "#d4af8c", fontSize: ".75rem", minWidth: 20 }}>{i + 1}.</span>
                      <span style={{ fontSize: "1rem", lineHeight: 1 }}>🎵</span>
                      <span style={{ flex: 1, color: "#f0e6d5", fontSize: ".9rem" }}>{item.song}</span>
                      <button onClick={() => setPlaylist(p => p.filter(x => x.id !== item.id))}
                        style={{ background: "none", border: "none", color: "rgba(212,175,140,.35)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "2px 4px" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Love Reminders */}
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.55rem", color: "#f5cdd8", marginBottom: 20 }}>🌟 Little Reminders</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>
                {QUOTES.map((q, i) => (
                  <div key={i} style={{
                    background: "rgba(180,90,120,.09)",
                    border: "1px solid rgba(212,175,140,.1)",
                    borderRadius: 16, padding: "18px",
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: "italic", fontSize: ".92rem",
                    color: "#e8d4bc", lineHeight: 1.6,
                    animation: `fadeUp .4s ${i * .07}s both ease`,
                  }}>
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── ADD MEMORY MODAL ─── */}
      {showAddMem && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddMem(false); }}>
          <div className="modal">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "#f5cdd8", marginBottom: 24 }}>Add a Memory</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: ".7rem", color: "#d4af8c", letterSpacing: ".12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Title *</label>
                <input className="inp" placeholder="Our first video call…" value={newMem.title} onChange={e => setNewMem(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: ".7rem", color: "#d4af8c", letterSpacing: ".12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Date</label>
                <input type="date" className="inp" value={newMem.date} onChange={e => setNewMem(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: ".7rem", color: "#d4af8c", letterSpacing: ".12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Story</label>
                <textarea className="inp" placeholder="Tell the story of this memory…" value={newMem.content}
                  onChange={e => setNewMem(p => ({ ...p, content: e.target.value }))} style={{ minHeight: 110, resize: "vertical", borderRadius: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: ".7rem", color: "#d4af8c", letterSpacing: ".12em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Emoji</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {EMOJIS_MEM.map(e => (
                    <button key={e} className={`emoji-btn ${newMem.emoji === e ? "sel" : ""}`} onClick={() => setNewMem(p => ({ ...p, emoji: e }))}>{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button className="btn-primary" onClick={addMemory}>Save Memory</button>
                <button className="btn-ghost" onClick={() => setShowAddMem(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW MEMORY MODAL ─── */}
      {viewMem && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setViewMem(null); }}>
          <div className="modal">
            <div style={{ fontSize: "3.2rem", marginBottom: 16 }}>{viewMem.emoji}</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", color: "#f5cdd8", marginBottom: 8 }}>{viewMem.title}</h2>
            {viewMem.date && <p style={{ color: "#d4af8c", fontSize: ".75rem", marginBottom: 22, letterSpacing: ".06em" }}>📅 {viewMem.date}</p>}
            {viewMem.content && (
              <p style={{ lineHeight: 1.85, color: "#e8d8c4", whiteSpace: "pre-wrap", fontFamily: "'Playfair Display', serif", fontSize: "1.02rem" }}>
                {viewMem.content}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
              <button className="btn-ghost" onClick={() => setViewMem(null)}>Close</button>
              <button className="btn-ghost" style={{ color: "#e07070", borderColor: "rgba(224,112,112,.2)" }}
                onClick={() => deleteMemory(viewMem.id)}>Delete Memory</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
