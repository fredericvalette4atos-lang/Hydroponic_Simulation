import { useState, useEffect, useCallback, useRef } from “react”;

// ─── PARAMETER DEFINITIONS ───────────────────────────────────────────────────
const PARAMS = {
temperature:    { label: “Temperatur”,             unit: “°C”,    min: 10, max: 35,   optimal: [18, 24], color: “#f97316” },
ph:             { label: “pH-Wert”,                unit: “pH”,    min: 4,  max: 9,    optimal: [5.5, 6.5], color: “#a78bfa” },
ec:             { label: “EC (Nährstoffe)”,         unit: “mS/cm”, min: 0,  max: 5,    optimal: [1.5, 2.5], color: “#34d399” },
waterLevel:     { label: “Wasserstand”,             unit: “%”,     min: 0,  max: 100,  optimal: [60, 90],  color: “#38bdf8” },
co2:            { label: “CO₂ / Luft”,             unit: “ppm”,   min: 300,max: 1500, optimal: [800, 1200], color: “#fbbf24” },
nutrientAvail:  { label: “Nährstoff-Verfügbarkeit”, unit: “%”,     min: 0,  max: 100,  optimal: [70, 100], color: “#f472b6” },
plantUptake:    { label: “Pflanzenaufnahme”,        unit: “%”,     min: 0,  max: 100,  optimal: [60, 100], color: “#86efac” },
};

const EDGES = [
{ from: “temperature”,   to: “ph”,            effect: “neg”,   label: “+1°C → −0.02 pH”,               strength: 0.4 },
{ from: “temperature”,   to: “ec”,            effect: “pos”,   label: “+Temp → Evaporation → +EC”,      strength: 0.3 },
{ from: “temperature”,   to: “plantUptake”,   effect: “pos”,   label: “+Temp → +Aufnahme”,              strength: 0.5 },
{ from: “waterLevel”,    to: “ec”,            effect: “neg”,   label: “−Wasser → +EC Konzentration”,    strength: 0.7 },
{ from: “ph”,            to: “nutrientAvail”, effect: “curve”, label: “pH 5.5–6.5 = optimale Verfügbarkeit”, strength: 0.9 },
{ from: “ec”,            to: “nutrientAvail”, effect: “pos”,   label: “+EC → mehr Nährstoffe”,          strength: 0.5 },
{ from: “nutrientAvail”, to: “plantUptake”,   effect: “pos”,   label: “Verfügbarkeit → Aufnahme”,       strength: 0.8 },
{ from: “co2”,           to: “plantUptake”,   effect: “pos”,   label: “+CO₂ → +Photosynthese”,          strength: 0.6 },
{ from: “plantUptake”,   to: “waterLevel”,    effect: “neg”,   label: “+Aufnahme → −Wasserstand”,       strength: 0.4 },
{ from: “plantUptake”,   to: “ec”,            effect: “neg”,   label: “+Aufnahme → −EC”,                strength: 0.3 },
{ from: “co2”,           to: “ph”,            effect: “neg”,   label: “+CO₂ → leicht saurer pH”,        strength: 0.2 },
];

const NODE_POSITIONS = {
temperature:   { x: 12, y: 18 },
co2:           { x: 12, y: 62 },
waterLevel:    { x: 47, y:  8 },
ph:            { x: 47, y: 40 },
ec:            { x: 47, y: 72 },
nutrientAvail: { x: 78, y: 28 },
plantUptake:   { x: 78, y: 63 },
};

// ─── PHYSICS ENGINE ──────────────────────────────────────────────────────────
function computeState(controls) {
const { waterPump, nutrientPump, phUpPump, phDownPump, light, tempSlider, co2Slider } = controls;
const temperature = tempSlider;
const co2 = co2Slider;
let waterLevel = 65 + (waterPump ? 8 : 0) - (light ? 3 : 0);
let ec = 1.8;
if (nutrientPump) ec += 0.6;
if (waterPump)    ec -= 0.3;
const waterFactor = 75 / Math.max(waterLevel, 10);
ec = Math.max(0.1, Math.min(5, ec * waterFactor + (temperature > 24 ? (temperature - 24) * 0.04 : 0)));
let ph = 6.2 + (phUpPump ? 0.5 : 0) - (phDownPump ? 0.5 : 0) - (temperature - 22) * 0.02 - (co2 - 800) * 0.0003 - (nutrientPump ? 0.15 : 0);
ph = Math.max(4, Math.min(9, ph));
const nutrientAvail = Math.max(0, Math.min(100, 100 - Math.pow(Math.abs(ph - 6.0), 2) * 18 - Math.max(0, ec - 3) * 15));
const co2Factor  = Math.min(1.3, co2 / 800);
const tempFactor = (temperature >= 18 && temperature <= 28) ? 1 - Math.abs(temperature - 22) * 0.02 : 0.5;
const lightFactor = light ? 1.3 : 0.6;
const plantUptake = Math.max(0, Math.min(100, (nutrientAvail / 100) * co2Factor * tempFactor * lightFactor * 80));
return { temperature, ph, ec, waterLevel, co2, nutrientAvail, plantUptake };
}

function getCascade(changedParam) {
const affected = new Set([changedParam]);
let changed = true;
while (changed) {
changed = false;
EDGES.forEach(e => { if (affected.has(e.from) && !affected.has(e.to)) { affected.add(e.to); changed = true; } });
}
return […affected];
}

// ─── AI ADVISORY CALL ────────────────────────────────────────────────────────
async function fetchAdvisory(trigger, state, prevState, language = “de”) {
const langInstructions = {
de: “Antworte ausschließlich auf Deutsch.”,
fr: “Réponds exclusivement en français.”,
en: “Reply exclusively in English.”,
};

const changedParams = Object.entries(state)
.filter(([k, v]) => Math.abs(v - (prevState[k] ?? v)) > 0.05)
.map(([k, v]) => `${PARAMS[k]?.label}: ${(prevState[k] ?? v).toFixed(1)} → ${v.toFixed(1)} ${PARAMS[k]?.unit}`)
.join(”, “);

const prompt = `Du bist ein Hydroponik-Wissenschaftsberater. Ein Benutzer hat folgende Änderung vorgenommen: “${trigger}”.

Aktuelle Systemwerte:

- Temperatur: ${state.temperature.toFixed(1)}°C
- pH-Wert: ${state.ph.toFixed(2)}
- EC (Leitfähigkeit): ${state.ec.toFixed(2)} mS/cm
- Wasserstand: ${state.waterLevel.toFixed(0)}%
- CO₂: ${state.co2} ppm
- Nährstoffverfügbarkeit: ${state.nutrientAvail.toFixed(0)}%
- Pflanzenaufnahme: ${state.plantUptake.toFixed(0)}%

Veränderte Parameter: ${changedParams || “keine signifikante Änderung”}

${langInstructions[language]}

Erkläre in 3–4 Sätzen:

1. Welche Wechselwirkung wurde ausgelöst und warum (physikalisch/chemisch)?
1. Welche weiteren Parameter werden beeinflusst (Kaskade)?
1. Was empfiehlst du als nächste Maßnahme?

Füge am Ende 2–3 wissenschaftliche Quellen im Format hinzu:
📚 [Autor, Jahr] Titel — Verlag/Journal

Sei präzise, wissenschaftlich korrekt und praxisorientiert. Verweise auf reale Forschung zu Hydroponik, Pflanzenphysiologie oder Wasserchemie.`;

const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1000,
messages: [{ role: “user”, content: prompt }],
}),
});
const data = await response.json();
return data.content?.map(b => b.text || “”).join(””) || “Keine Antwort erhalten.”;
}

// ─── UI COMPONENTS ───────────────────────────────────────────────────────────
function StatusBadge({ value, param }) {
const [lo, hi] = PARAMS[param].optimal;
const ok = value >= lo && value <= hi;
const warn = !ok && (value >= lo * 0.85 && value <= hi * 1.15);
const [bg, dot, lbl] = ok ? [”#14532d”,”#4ade80”,“OK”] : warn ? [”#78350f”,”#fbbf24”,“⚠”] : [”#450a0a”,”#f87171”,“✕”];
return <span style={{ background: bg, color: dot, border: `1px solid ${dot}30`, borderRadius: 4, padding: “1px 7px”, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{lbl}</span>;
}

function ParamBar({ param, value }) {
const p = PARAMS[param];
const pct = ((value - p.min) / (p.max - p.min)) * 100;
const [lo, hi] = p.optimal;
const optLo = ((lo - p.min) / (p.max - p.min)) * 100;
const optHi = ((hi - p.min) / (p.max - p.min)) * 100;
return (
<div style={{ marginBottom: 12 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 4 }}>
<span style={{ color: “#94a3b8”, fontSize: 11, letterSpacing: 1, textTransform: “uppercase”, fontFamily: “monospace” }}>{p.label}</span>
<div style={{ display: “flex”, alignItems: “center”, gap: 8 }}>
<StatusBadge value={value} param={param} />
<span style={{ color: p.color, fontWeight: 700, fontSize: 13, fontFamily: “monospace”, minWidth: 58, textAlign: “right” }}>{value.toFixed(1)} {p.unit}</span>
</div>
</div>
<div style={{ height: 7, background: “#1e293b”, borderRadius: 4, position: “relative” }}>
<div style={{ position: “absolute”, left: `${optLo}%`, width: `${optHi - optLo}%`, height: “100%”, background: `${p.color}22`, borderRadius: 4 }} />
<div style={{ position: “absolute”, left: 0, width: `${Math.min(100, pct)}%`, height: “100%”, background: p.color, borderRadius: 4, transition: “width 0.5s ease”, boxShadow: `0 0 8px ${p.color}80` }} />
<div style={{ position: “absolute”, left: `${optLo}%`, top: -2, width: 2, height: 11, background: `${p.color}70`, borderRadius: 1 }} />
<div style={{ position: “absolute”, left: `${optHi}%`, top: -2, width: 2, height: 11, background: `${p.color}70`, borderRadius: 1 }} />
</div>
</div>
);
}

function Toggle({ label, icon, active, onChange, color = “#38bdf8” }) {
return (
<button onClick={() => onChange(!active)} style={{ background: active ? `${color}15` : “#0f172a”, border: `1px solid ${active ? color : "#334155"}`, borderRadius: 8, padding: “9px 12px”, cursor: “pointer”, display: “flex”, alignItems: “center”, gap: 8, width: “100%”, transition: “all 0.2s”, color: active ? color : “#64748b” }}>
<span style={{ fontSize: 16 }}>{icon}</span>
<span style={{ fontSize: 11, fontFamily: “monospace”, fontWeight: 600, letterSpacing: 0.5, flex: 1, textAlign: “left” }}>{label}</span>
<div style={{ width: 26, height: 15, borderRadius: 8, background: active ? color : “#1e293b”, position: “relative”, transition: “background 0.2s”, flexShrink: 0, border: `1px solid ${active ? color : "#475569"}` }}>
<div style={{ position: “absolute”, top: 2, left: active ? 11 : 2, width: 9, height: 9, borderRadius: “50%”, background: active ? “#fff” : “#475569”, transition: “left 0.2s” }} />
</div>
</button>
);
}

function SliderCtrl({ label, icon, value, min, max, onChange, color, unit }) {
return (
<div>
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: 4 }}>
<span style={{ color: “#94a3b8”, fontSize: 11, fontFamily: “monospace” }}>{icon} {label}</span>
<span style={{ color, fontWeight: 700, fontSize: 11, fontFamily: “monospace” }}>{value}{unit}</span>
</div>
<input type=“range” min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: “100%”, accentColor: color, cursor: “pointer” }} />
</div>
);
}

// ─── DEPENDENCY GRAPH SVG ────────────────────────────────────────────────────
function DependencyGraph({ state, highlighted }) {
const [tick, setTick] = useState(0);
useEffect(() => { const id = setInterval(() => setTick(t => (t + 1) % 100), 80); return () => clearInterval(id); }, []);
const W = 480, H = 310, nW = 118, nH = 40;
const pos = k => { const p = NODE_POSITIONS[k]; return { x: (p.x / 100) * W, y: (p.y / 100) * H }; };

return (
<svg viewBox={`0 0 ${W} ${H}`} style={{ width: “100%”, height: “100%” }}>
<defs>
{[“pos”,“neg”,“curve”].map(t => (
<marker key={t} id={`arr-${t}`} markerWidth=“7” markerHeight=“7” refX=“5” refY=“3” orient=“auto”>
<path d=“M0,0 L0,6 L7,3z” fill={t===“pos”?”#4ade80”:t===“neg”?”#f87171”:”#a78bfa”} />
</marker>
))}
</defs>
{[…Array(9)].map((*,i) => <line key={`h${i}`} x1={0} y1={i*35} x2={W} y2={i*35} stroke=”#0f172a” strokeWidth={0.8}/>)}
{[…Array(14)].map((*,i) => <line key={`v${i}`} x1={i*35} y1={0} x2={i*35} y2={H} stroke=”#0f172a” strokeWidth={0.8}/>)}
{EDGES.map((edge, i) => {
const f = pos(edge.from), t = pos(edge.to);
const color = edge.effect===“pos”?”#4ade80”:edge.effect===“neg”?”#f87171”:”#a78bfa”;
const fx=f.x+nW*0.8, fy=f.y+nH/2, tx=t.x+nW*0.2, ty=t.y+nH/2;
const mx=(fx+tx)/2, my=(fy+ty)/2-22;
const active = highlighted.includes(edge.from)||highlighted.includes(edge.to);
return (
<path key={i} d={`M${fx},${fy} Q${mx},${my} ${tx},${ty}`} fill=“none”
stroke={color} strokeWidth={active?2.5:1} strokeOpacity={active?1:0.2}
strokeDasharray=“6 4” strokeDashoffset={-(tick*2)} markerEnd={`url(#arr-${edge.effect})`} />
);
})}
{Object.entries(NODE_POSITIONS).map(([key]) => {
const p = PARAMS[key], { x, y } = pos(key), val = state[key];
const [lo,hi] = p.optimal;
const sc = val>=lo&&val<=hi?”#4ade80”:val>hi?”#f97316”:”#f87171”;
const hl = highlighted.includes(key);
return (
<g key={key}>
{hl && <rect x={x-2} y={y-2} width={nW+4} height={nH+4} rx={8} fill="none" stroke={p.color} strokeWidth={2} strokeOpacity={0.5}/>}
<rect x={x} y={y} width={nW} height={nH} rx={6} fill={`${p.color}0a`} stroke={hl?p.color:`${p.color}35`} strokeWidth={hl?1.5:1}/>
<circle cx={x+nW-10} cy={y+10} r={4} fill={sc} opacity={0.9}/>
<text x={x+9} y={y+15} style={{fontSize:8,fill:”#64748b”,fontFamily:“monospace”,textTransform:“uppercase”,letterSpacing:0.8}}>{p.label}</text>
<text x={x+9} y={y+31} style={{fontSize:12,fill:p.color,fontFamily:“monospace”,fontWeight:“bold”}}>{val?.toFixed(1)} {p.unit}</text>
</g>
);
})}
</svg>
);
}

// ─── ADVISORY PANEL ──────────────────────────────────────────────────────────
function AdvisoryPanel({ messages, isLoading, language, setLanguage }) {
const endRef = useRef(null);
useEffect(() => { endRef.current?.scrollIntoView({ behavior: “smooth” }); }, [messages]);

const formatMessage = (text) => {
const lines = text.split(’\n’);
return lines.map((line, i) => {
if (line.startsWith(“📚”)) {
return (
<div key={i} style={{ marginTop: 8, padding: “7px 10px”, background: “#071020”, borderRadius: 6, borderLeft: “2px solid #38bdf8”, color: “#64748b”, fontSize: 10.5, fontFamily: “monospace”, lineHeight: 1.6 }}>
{line}
</div>
);
}
if (line.trim() === “”) return <div key={i} style={{ height: 6 }} />;
return <span key={i} style={{ display: “block”, lineHeight: 1.7 }}>{line}</span>;
});
};

return (
<div style={{ display: “flex”, flexDirection: “column”, height: “100%”, background: “#050d1a” }}>
<div style={{ padding: “12px 14px”, borderBottom: “1px solid #1e293b”, display: “flex”, alignItems: “center”, gap: 10, flexShrink: 0 }}>
<div style={{ width: 7, height: 7, borderRadius: “50%”, background: “#a78bfa”, boxShadow: “0 0 6px #a78bfa” }} />
<span style={{ fontSize: 9, color: “#94a3b8”, letterSpacing: 2, textTransform: “uppercase”, fontFamily: “monospace”, flex: 1 }}>
KI-Wissenschaftsberater
</span>
<div style={{ display: “flex”, gap: 3 }}>
{[[“de”,“DE”],[“fr”,“FR”],[“en”,“EN”]].map(([code,lbl]) => (
<button key={code} onClick={() => setLanguage(code)} style={{ padding: “2px 7px”, borderRadius: 4, border: `1px solid ${language===code?"#a78bfa":"#1e293b"}`, background: language===code?”#a78bfa15”:“transparent”, color: language===code?”#a78bfa”:”#475569”, fontSize: 9, fontFamily: “monospace”, cursor: “pointer”, fontWeight: language===code?700:400 }}>{lbl}</button>
))}
</div>
</div>

```
  <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
    {messages.length === 0 && !isLoading && (
      <div style={{ textAlign: "center", padding: "28px 12px", color: "#334155" }}>
        <div style={{ fontSize: 26, marginBottom: 10 }}>🌱</div>
        <div style={{ fontSize: 10, fontFamily: "monospace", lineHeight: 2, color: "#475569" }}>
          Aktivieren Sie eine Pumpe,<br/>ändern Sie Temperatur oder CO₂,<br/>um eine wissenschaftliche<br/>Analyse zu erhalten.
        </div>
        <div style={{ marginTop: 16, padding: "8px 10px", background: "#0a0f1e", borderRadius: 6, fontSize: 9, color: "#334155", textAlign: "left", lineHeight: 1.8 }}>
          💡 Die KI erklärt Ursachen,<br/>Kaskaden-Effekte und gibt<br/>Handlungsempfehlungen mit<br/>wissenschaftlichen Quellen.
        </div>
      </div>
    )}
    {[...messages].reverse().map((msg, i) => (
      <div key={i} style={{ background: "#0a0f1e", borderRadius: 8, padding: 13, border: "1px solid #1e293b", borderLeft: `3px solid ${msg.color || "#a78bfa"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: msg.color || "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{msg.trigger}</span>
          <span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>{msg.time}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "#94a3b8", fontFamily: "monospace" }}>
          {formatMessage(msg.text)}
        </div>
      </div>
    ))}
    {isLoading && (
      <div style={{ background: "#0a0f1e", borderRadius: 8, padding: 14, border: "1px solid #1e293b", borderLeft: "3px solid #a78bfa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0,1,2].map(j => (
              <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: `bounce 1.2s ${j*0.2}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>Wissenschaftliche Analyse läuft…</span>
        </div>
      </div>
    )}
    <div ref={endRef} />
  </div>
</div>
```

);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const TRIGGER_META = {
waterPump:    { on: “💧 Wasserpumpe EIN”,      off: “💧 Wasserpumpe AUS”,      color: “#38bdf8” },
nutrientPump: { on: “🧪 Nährstoff-Pumpe EIN”,  off: “🧪 Nährstoff-Pumpe AUS”,  color: “#34d399” },
phUpPump:     { on: “⬆ pH-Hoch-Pumpe EIN”,    off: “⬆ pH-Hoch-Pumpe AUS”,    color: “#a78bfa” },
phDownPump:   { on: “⬇ pH-Runter-Pumpe EIN”,  off: “⬇ pH-Runter-Pumpe AUS”,  color: “#f472b6” },
light:        { on: “💡 Wachstumslampe EIN”,    off: “💡 Wachstumslampe AUS”,    color: “#fbbf24” },
tempSlider:   { on: “🌡️ Temperatur”,           off: “🌡️ Temperatur”,           color: “#f97316” },
co2Slider:    { on: “🌿 CO₂-Wert”,             off: “🌿 CO₂-Wert”,             color: “#fbbf24” },
};
const PARAM_MAP = { waterPump:“waterLevel”, nutrientPump:“ec”, phUpPump:“ph”, phDownPump:“ph”, light:“temperature”, tempSlider:“temperature”, co2Slider:“co2” };

export default function HydroponicModel() {
const defaultControls = { waterPump:false, nutrientPump:false, phUpPump:false, phDownPump:false, light:false, tempSlider:22, co2Slider:800 };
const [controls, setControls] = useState(defaultControls);
const [highlighted, setHighlighted] = useState([]);
const [advisoryMsgs, setAdvisoryMsgs] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [language, setLanguage] = useState(“de”);
const prevStateRef = useRef(computeState(defaultControls));
const debounceRef = useRef(null);

const state = computeState(controls);

const handleChange = useCallback((key, value) => {
setControls(prev => {
const next = { …prev, [key]: value };
const newState = computeState(next);
const cascade = getCascade(PARAM_MAP[key] || key);
setHighlighted(cascade);
setTimeout(() => setHighlighted([]), 3500);

```
  const meta = TRIGGER_META[key];
  const label = typeof value === "boolean"
    ? (value ? meta?.on : meta?.off)
    : `${meta?.on}: ${value}${key==="tempSlider"?"°C":" ppm"}`;
  const color = meta?.color || "#a78bfa";
  const time = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit", second:"2-digit" });

  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    setIsLoading(true);
    try {
      const text = await fetchAdvisory(label, newState, prevStateRef.current, language);
      prevStateRef.current = newState;
      setAdvisoryMsgs(msgs => [{ trigger: label, text, time, color }, ...msgs].slice(0, 8));
    } catch {
      setAdvisoryMsgs(msgs => [{ trigger: label, text: "⚠ Verbindungsfehler zur KI-API.", time, color: "#f87171" }, ...msgs].slice(0, 8));
    }
    setIsLoading(false);
  }, typeof value === "boolean" ? 100 : 700);

  return next;
});
```

}, [language]);

const systemScore = (() => {
const ok = Object.entries(state).filter(([k,v]) => { const [lo,hi]=PARAMS[k].optimal; return v>=lo&&v<=hi; }).length;
return Math.round((ok / Object.keys(state).length) * 100);
})();
const scoreColor = systemScore>=80?”#4ade80”:systemScore>=55?”#fbbf24”:”#f87171”;

return (
<div style={{ background:”#020817”, height:“100vh”, fontFamily:”‘IBM Plex Mono’,‘Courier New’,monospace”, color:”#e2e8f0”, display:“flex”, flexDirection:“column”, overflow:“hidden” }}>

```
  {/* HEADER */}
  <div style={{ background:"#0a0f1e", borderBottom:"1px solid #1e293b", padding:"11px 20px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
    <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 8px #4ade80", animation:"pulse 2s infinite" }} />
    <div>
      <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Hydroponisches System</div>
      <div style={{ fontSize:9, color:"#475569", letterSpacing:1 }}>PARAMETER-ABHÄNGIGKEITSMODELL · KI-WISSENSCHAFTSBERATUNG</div>
    </div>
    <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:14 }}>
      {[["#4ade80","+ Einfluss"],["#f87171","− Einfluss"],["#a78bfa","Kurven-Effekt"]].map(([c,l]) => (
        <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#64748b" }}>
          <div style={{ width:14, height:0, borderTop:`2px dashed ${c}` }} />{l}
        </div>
      ))}
      <div style={{ padding:"3px 12px", background:`${scoreColor}15`, border:`1px solid ${scoreColor}40`, borderRadius:20, fontSize:10, color:scoreColor, fontWeight:700 }}>
        System {systemScore}%
      </div>
    </div>
  </div>

  {/* MAIN GRID */}
  <div style={{ flex:1, display:"grid", gridTemplateColumns:"200px 1fr 230px 295px", overflow:"hidden" }}>

    {/* LEFT: Controls */}
    <div style={{ background:"#050d1a", borderRight:"1px solid #1e293b", padding:14, overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>
      <div>
        <div style={{ fontSize:9, color:"#334155", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Pumpen</div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <Toggle label="Wasserpumpe"     icon="💧" active={controls.waterPump}    onChange={v=>handleChange("waterPump",v)}    color="#38bdf8"/>
          <Toggle label="Nährstoff-Pumpe" icon="🧪" active={controls.nutrientPump} onChange={v=>handleChange("nutrientPump",v)} color="#34d399"/>
          <Toggle label="pH ↑ Pumpe"      icon="⬆" active={controls.phUpPump}     onChange={v=>handleChange("phUpPump",v)}     color="#a78bfa"/>
          <Toggle label="pH ↓ Pumpe"      icon="⬇" active={controls.phDownPump}   onChange={v=>handleChange("phDownPump",v)}   color="#f472b6"/>
        </div>
      </div>
      <div>
        <div style={{ fontSize:9, color:"#334155", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Beleuchtung</div>
        <Toggle label="Wachstumslampe" icon="💡" active={controls.light} onChange={v=>handleChange("light",v)} color="#fbbf24"/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:9, color:"#334155", letterSpacing:2, textTransform:"uppercase" }}>Umgebung</div>
        <SliderCtrl label="Temperatur" icon="🌡️" value={controls.tempSlider} min={10} max={35} unit="°C"  color="#f97316" onChange={v=>handleChange("tempSlider",v)}/>
        <SliderCtrl label="CO₂ / Luft" icon="🌿" value={controls.co2Slider}  min={300} max={1500} unit="ppm" color="#fbbf24" onChange={v=>handleChange("co2Slider",v)}/>
      </div>
      <div>
        {Object.entries(state).map(([key,val]) => {
          const [lo,hi]=PARAMS[key].optimal;
          if (val>=lo&&val<=hi) return null;
          return (
            <div key={key} style={{ marginBottom:4, padding:"5px 8px", background:"#1c0a0a", border:"1px solid #450a0a", borderRadius:5, fontSize:9 }}>
              <span style={{ color:"#f87171" }}>⚠ {PARAMS[key].label}: {val.toFixed(1)} {PARAMS[key].unit}</span>
            </div>
          );
        })}
      </div>
    </div>

    {/* CENTER: Graph */}
    <div style={{ background:"#020c1b", padding:14, display:"flex", flexDirection:"column" }}>
      <div style={{ fontSize:9, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
        Abhängigkeitsgraph · <span style={{ color:"#38bdf8" }}>aktive Kaskaden werden hervorgehoben</span>
      </div>
      <div style={{ flex:1, background:"#030a14", borderRadius:10, border:"1px solid #1e293b", padding:8, overflow:"hidden" }}>
        <DependencyGraph state={state} highlighted={highlighted}/>
      </div>
      <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
        {EDGES.slice(0,6).map((edge,i) => (
          <div key={i} style={{ padding:"4px 8px", background:"#0a0f1e", borderRadius:5, border:"1px solid #1e293b", fontSize:9, color:"#475569", borderLeft:`2px solid ${edge.effect==="pos"?"#4ade80":edge.effect==="neg"?"#f87171":"#a78bfa"}` }}>
            <span style={{ color:"#64748b" }}>{PARAMS[edge.from]?.label}</span>{" → "}{PARAMS[edge.to]?.label}
            <div style={{ color:"#334155", marginTop:1 }}>{edge.label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* RIGHT: Params */}
    <div style={{ background:"#050d1a", borderLeft:"1px solid #1e293b", padding:14, overflowY:"auto" }}>
      <div style={{ fontSize:9, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Systemparameter</div>
      {Object.entries(state).map(([k,v]) => <ParamBar key={k} param={k} value={v}/>)}
      <div style={{ marginTop:14, padding:12, background:"#0a0f1e", borderRadius:8, border:"1px solid #1e293b" }}>
        <div style={{ fontSize:9, color:"#475569", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>System-Gesundheit</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
          <span style={{ color:scoreColor, fontSize:24, fontWeight:700 }}>{systemScore}%</span>
          <span style={{ color:"#475569", fontSize:9 }}>im Optimum</span>
        </div>
        <div style={{ height:5, background:"#1e293b", borderRadius:3 }}>
          <div style={{ width:`${systemScore}%`, height:"100%", background:scoreColor, borderRadius:3, transition:"width 0.5s, background 0.5s", boxShadow:`0 0 8px ${scoreColor}60` }}/>
        </div>
      </div>
    </div>

    {/* FAR RIGHT: AI Advisory */}
    <div style={{ borderLeft:"1px solid #1e293b", overflow:"hidden" }}>
      <AdvisoryPanel messages={advisoryMsgs} isLoading={isLoading} language={language} setLanguage={setLanguage}/>
    </div>
  </div>

  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
    input[type=range]{height:4px;}
    ::-webkit-scrollbar{width:3px;}
    ::-webkit-scrollbar-track{background:#0a0f1e;}
    ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px;}
  `}</style>
</div>
```

);
}