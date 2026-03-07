import { useState, useEffect, useCallback, useRef } from “react”;

const PARAMS = {
temperature: { label: “Temperatur”, unit: “°C”, min: 10, max: 35, optimal: [18, 24], color: “#f97316” },
ph: { label: “pH-Wert”, unit: “pH”, min: 4, max: 9, optimal: [5.5, 6.5], color: “#a78bfa” },
ec: { label: “EC (Nährstoffe)”, unit: “mS/cm”, min: 0, max: 5, optimal: [1.5, 2.5], color: “#34d399” },
waterLevel: { label: “Wasserstand”, unit: “%”, min: 0, max: 100, optimal: [60, 90], color: “#38bdf8” },
co2: { label: “CO₂ / Luft”, unit: “ppm”, min: 300, max: 1500, optimal: [800, 1200], color: “#fbbf24” },
nutrientAvail: { label: “Nährstoff-Verfügbarkeit”, unit: “%”, min: 0, max: 100, optimal: [70, 100], color: “#f472b6” },
plantUptake: { label: “Pflanzenaufnahme”, unit: “%”, min: 0, max: 100, optimal: [60, 100], color: “#86efac” },
};

const EDGES = [
{ from: “temperature”, to: “ph”, effect: “neg”, label: “+1°C → −0.02 pH”, strength: 0.4 },
{ from: “temperature”, to: “ec”, effect: “pos”, label: “+Temp → Evaporation → +EC”, strength: 0.3 },
{ from: “temperature”, to: “plantUptake”, effect: “pos”, label: “+Temp → +Aufnahme”, strength: 0.5 },
{ from: “waterLevel”, to: “ec”, effect: “neg”, label: “−Wasser → +EC Konzentration”, strength: 0.7 },
{ from: “ph”, to: “nutrientAvail”, effect: “curve”, label: “pH 5.5–6.5 = optimale Verfügbarkeit”, strength: 0.9 },
{ from: “ec”, to: “nutrientAvail”, effect: “pos”, label: “+EC → mehr Nährstoffe”, strength: 0.5 },
{ from: “nutrientAvail”, to: “plantUptake”, effect: “pos”, label: “Verfügbarkeit → Aufnahme”, strength: 0.8 },
{ from: “co2”, to: “plantUptake”, effect: “pos”, label: “+CO₂ → +Photosynthese”, strength: 0.6 },
{ from: “plantUptake”, to: “waterLevel”, effect: “neg”, label: “+Aufnahme → −Wasserstand”, strength: 0.4 },
{ from: “plantUptake”, to: “ec”, effect: “neg”, label: “+Aufnahme → −EC”, strength: 0.3 },
{ from: “co2”, to: “ph”, effect: “neg”, label: “+CO₂ → leicht saurer pH”, strength: 0.2 },
];

const NODE_POSITIONS = {
temperature: { x: 15, y: 20 },
co2: { x: 15, y: 65 },
waterLevel: { x: 50, y: 10 },
ph: { x: 50, y: 42 },
ec: { x: 50, y: 74 },
nutrientAvail: { x: 80, y: 30 },
plantUptake: { x: 80, y: 65 },
};

function computeState(controls) {
const { waterPump, nutrientPump, phUpPump, phDownPump, light, tempSlider, co2Slider } = controls;

let temperature = tempSlider;
let waterLevel = 65 + (waterPump ? 8 : 0) - (light ? 3 : 0);
let co2 = co2Slider;

// Base EC
let ec = 1.8;
if (nutrientPump) ec += 0.6;
if (waterPump) ec -= 0.3; // dilution
// Concentration effect from water level
const waterFactor = 75 / Math.max(waterLevel, 10);
ec = ec * waterFactor;
ec = Math.max(0.1, Math.min(5, ec));

// Temperature affects EC via evaporation
if (temperature > 24) ec += (temperature - 24) * 0.04;

// Base pH
let ph = 6.2;
if (phUpPump) ph += 0.5;
if (phDownPump) ph -= 0.5;
// Temperature effect
ph -= (temperature - 22) * 0.02;
// CO2 acidification
ph -= (co2 - 800) * 0.0003;
// Nutrient pump slightly acidifies
if (nutrientPump) ph -= 0.15;
ph = Math.max(4, Math.min(9, ph));

// Nutrient availability curve (bell curve centered on pH 6.0)
const phDelta = Math.abs(ph - 6.0);
const nutrientAvail = Math.max(0, Math.min(100,
100 - (phDelta * phDelta * 18) - Math.max(0, ec - 3) * 15
));

// Plant uptake
const co2Factor = Math.min(1.3, co2 / 800);
const tempFactor = temperature >= 18 && temperature <= 28
? 1 - Math.abs(temperature - 22) * 0.02
: 0.5;
const lightFactor = light ? 1.3 : 0.6;
let plantUptake = (nutrientAvail / 100) * co2Factor * tempFactor * lightFactor * 80;
plantUptake = Math.max(0, Math.min(100, plantUptake));

return { temperature, ph, ec, waterLevel, co2, nutrientAvail, plantUptake };
}

function StatusBadge({ value, param }) {
const [lo, hi] = PARAMS[param].optimal;
const isOptimal = value >= lo && value <= hi;
const isWarning = !isOptimal && (value >= lo * 0.85 && value <= hi * 1.15);
const bg = isOptimal ? “#14532d” : isWarning ? “#78350f” : “#450a0a”;
const dot = isOptimal ? “#4ade80” : isWarning ? “#fbbf24” : “#f87171”;
const label = isOptimal ? “OK” : isWarning ? “⚠” : “✕”;
return (
<span style={{ background: bg, color: dot, border: `1px solid ${dot}30`, borderRadius: 4, padding: “1px 7px”, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
{label}
</span>
);
}

function ParamBar({ param, value }) {
const p = PARAMS[param];
const pct = ((value - p.min) / (p.max - p.min)) * 100;
const [lo, hi] = p.optimal;
const optLo = ((lo - p.min) / (p.max - p.min)) * 100;
const optHi = ((hi - p.min) / (p.max - p.min)) * 100;
return (
<div style={{ marginBottom: 14 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 5 }}>
<span style={{ color: “#94a3b8”, fontSize: 12, letterSpacing: 1, textTransform: “uppercase”, fontFamily: “monospace” }}>{p.label}</span>
<div style={{ display: “flex”, alignItems: “center”, gap: 8 }}>
<StatusBadge value={value} param={param} />
<span style={{ color: p.color, fontWeight: 700, fontSize: 14, fontFamily: “monospace”, minWidth: 60, textAlign: “right” }}>
{value.toFixed(1)} {p.unit}
</span>
</div>
</div>
<div style={{ height: 8, background: “#1e293b”, borderRadius: 4, position: “relative”, overflow: “visible” }}>
{/* optimal range highlight */}
<div style={{ position: “absolute”, left: `${optLo}%`, width: `${optHi - optLo}%`, height: “100%”, background: `${p.color}25`, borderRadius: 4 }} />
{/* value bar */}
<div style={{ position: “absolute”, left: 0, width: `${Math.min(100, pct)}%`, height: “100%”, background: p.color, borderRadius: 4, transition: “width 0.5s ease”, boxShadow: `0 0 8px ${p.color}80` }} />
{/* optimal markers */}
<div style={{ position: “absolute”, left: `${optLo}%`, top: -3, width: 2, height: 14, background: `${p.color}80`, borderRadius: 1 }} />
<div style={{ position: “absolute”, left: `${optHi}%`, top: -3, width: 2, height: 14, background: `${p.color}80`, borderRadius: 1 }} />
</div>
</div>
);
}

function Toggle({ label, icon, active, onChange, color = “#38bdf8” }) {
return (
<button onClick={() => onChange(!active)} style={{
background: active ? `${color}15` : “#0f172a”,
border: `1px solid ${active ? color : "#334155"}`,
borderRadius: 8, padding: “10px 14px”, cursor: “pointer”,
display: “flex”, alignItems: “center”, gap: 8, width: “100%”,
transition: “all 0.2s”, color: active ? color : “#64748b”,
}}>
<span style={{ fontSize: 18 }}>{icon}</span>
<span style={{ fontSize: 12, fontFamily: “monospace”, fontWeight: 600, letterSpacing: 0.5, flex: 1, textAlign: “left” }}>{label}</span>
<div style={{
width: 28, height: 16, borderRadius: 8, background: active ? color : “#1e293b”,
position: “relative”, transition: “background 0.2s”, flexShrink: 0,
border: `1px solid ${active ? color : "#475569"}`
}}>
<div style={{
position: “absolute”, top: 2, left: active ? 12 : 2,
width: 10, height: 10, borderRadius: “50%”, background: active ? “#fff” : “#475569”,
transition: “left 0.2s”
}} />
</div>
</button>
);
}

function Slider({ label, icon, value, min, max, onChange, color = “#f97316”, unit }) {
return (
<div style={{ marginBottom: 0 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: 6 }}>
<span style={{ color: “#94a3b8”, fontSize: 12, fontFamily: “monospace”, letterSpacing: 0.5 }}>{icon} {label}</span>
<span style={{ color, fontWeight: 700, fontSize: 12, fontFamily: “monospace” }}>{value}{unit}</span>
</div>
<input type=“range” min={min} max={max} value={value}
onChange={e => onChange(Number(e.target.value))}
style={{ width: “100%”, accentColor: color, cursor: “pointer” }} />
</div>
);
}

// SVG Dependency Graph
function DependencyGraph({ state, highlighted }) {
const svgRef = useRef(null);
const [tick, setTick] = useState(0);
useEffect(() => {
const id = setInterval(() => setTick(t => (t + 1) % 100), 80);
return () => clearInterval(id);
}, []);

const w = 500, h = 340;
const nodeW = 120, nodeH = 42;

const getPos = (key) => {
const p = NODE_POSITIONS[key];
return { x: (p.x / 100) * w, y: (p.y / 100) * h };
};

return (
<svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} style={{ width: “100%”, height: “100%” }}>
<defs>
{Object.entries(PARAMS).map(([key, p]) => (
<filter key={key} id={`glow-${key}`}>
<feGaussianBlur stdDeviation="3" result="blur" />
<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
</filter>
))}
<marker id="arrow-pos" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
<path d="M0,0 L0,6 L8,3 z" fill="#4ade80" />
</marker>
<marker id="arrow-neg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
<path d="M0,0 L0,6 L8,3 z" fill="#f87171" />
</marker>
<marker id="arrow-curve" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
<path d="M0,0 L0,6 L8,3 z" fill="#a78bfa" />
</marker>
</defs>

```
  {/* Background grid */}
  {[...Array(10)].map((_, i) => (
    <line key={`h${i}`} x1={0} y1={i * 34} x2={w} y2={i * 34} stroke="#1e293b" strokeWidth={0.5} />
  ))}
  {[...Array(15)].map((_, i) => (
    <line key={`v${i}`} x1={i * 34} y1={0} x2={i * 34} y2={h} stroke="#1e293b" strokeWidth={0.5} />
  ))}

  {/* Edges */}
  {EDGES.map((edge, i) => {
    const from = getPos(edge.from);
    const to = getPos(edge.to);
    const color = edge.effect === "pos" ? "#4ade80" : edge.effect === "neg" ? "#f87171" : "#a78bfa";
    const fx = from.x + nodeW * 0.75;
    const fy = from.y + nodeH / 2;
    const tx = to.x + nodeW * 0.25;
    const ty = to.y + nodeH / 2;
    const mx = (fx + tx) / 2;
    const my = (fy + ty) / 2 - 20;
    const dashOffset = -(tick * 2);
    const isActive = highlighted.includes(edge.from) || highlighted.includes(edge.to);
    return (
      <g key={i}>
        <path
          d={`M${fx},${fy} Q${mx},${my} ${tx},${ty}`}
          fill="none"
          stroke={color}
          strokeWidth={isActive ? 2 : 1}
          strokeOpacity={isActive ? 0.9 : 0.25}
          strokeDasharray="6 4"
          strokeDashoffset={dashOffset}
          markerEnd={`url(#arrow-${edge.effect})`}
        />
        {isActive && (
          <text>
            <textPath href={`#edge-path-${i}`} startOffset="50%" textAnchor="middle" style={{ fontSize: 9, fill: color, opacity: 0.8, fontFamily: "monospace" }}>
            </textPath>
          </text>
        )}
      </g>
    );
  })}

  {/* Nodes */}
  {Object.entries(NODE_POSITIONS).map(([key, pos]) => {
    const p = PARAMS[key];
    const { x, y } = getPos(key);
    const val = state[key];
    const [lo, hi] = p.optimal;
    const isOptimal = val >= lo && val <= hi;
    const isHigh = val > hi;
    const statusColor = isOptimal ? "#4ade80" : isHigh ? "#f97316" : "#f87171";
    const isHovered = highlighted.includes(key);
    return (
      <g key={key} filter={isHovered ? `url(#glow-${key})` : undefined}>
        {/* Node border glow */}
        <rect x={x} y={y} width={nodeW} height={nodeH} rx={6}
          fill={`${p.color}08`}
          stroke={isHovered ? p.color : `${p.color}40`}
          strokeWidth={isHovered ? 2 : 1}
        />
        {/* Status indicator */}
        <circle cx={x + nodeW - 10} cy={y + 10} r={4} fill={statusColor} opacity={0.9} />
        {/* Label */}
        <text x={x + 10} y={y + 16} style={{ fontSize: 9, fill: "#94a3b8", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>
          {p.label}
        </text>
        {/* Value */}
        <text x={x + 10} y={y + 32} style={{ fontSize: 13, fill: p.color, fontFamily: "monospace", fontWeight: "bold" }}>
          {val?.toFixed(1)} {p.unit}
        </text>
      </g>
    );
  })}
</svg>
```

);
}

// Cascade trace: which params are affected by a change
function getCascade(changedParam) {
const affected = new Set([changedParam]);
let changed = true;
while (changed) {
changed = false;
EDGES.forEach(e => {
if (affected.has(e.from) && !affected.has(e.to)) {
affected.add(e.to);
changed = true;
}
});
}
return […affected];
}

export default function HydroponicModel() {
const [controls, setControls] = useState({
waterPump: false, nutrientPump: false, phUpPump: false, phDownPump: false,
light: false, tempSlider: 22, co2Slider: 800,
});
const [highlighted, setHighlighted] = useState([]);
const [log, setLog] = useState([]);
const prevControls = useRef(controls);

const state = computeState(controls);

const update = useCallback((key, value) => {
setControls(c => ({ …c, [key]: value }));
// Determine cascade
const mapping = {
waterPump: “waterLevel”, nutrientPump: “ec”,
phUpPump: “ph”, phDownPump: “ph”,
light: “temperature”, tempSlider: “temperature”, co2Slider: “co2”
};
const root = mapping[key] || key;
const cascade = getCascade(root);
setHighlighted(cascade);
const time = new Date().toLocaleTimeString(“de-DE”, { hour: “2-digit”, minute: “2-digit”, second: “2-digit” });
const label = key === “tempSlider” ? `Temperatur → ${value}°C` :
key === “co2Slider” ? `CO₂ → ${value} ppm` :
`${key} ${value ? "EIN" : "AUS"}`;
setLog(l => [{
time, label, cascade: cascade.map(k => PARAMS[k]?.label).join(” → “)
}, …l].slice(0, 6));
setTimeout(() => setHighlighted([]), 3000);
}, []);

return (
<div style={{
background: “#020817”, minHeight: “100vh”, fontFamily: “‘IBM Plex Mono’, ‘Courier New’, monospace”,
color: “#e2e8f0”, padding: 0,
}}>
{/* Header */}
<div style={{ background: “#0a0f1e”, borderBottom: “1px solid #1e293b”, padding: “16px 24px”, display: “flex”, alignItems: “center”, gap: 16 }}>
<div style={{ width: 10, height: 10, borderRadius: “50%”, background: “#4ade80”, boxShadow: “0 0 8px #4ade80”, animation: “pulse 2s infinite” }} />
<div>
<div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: “uppercase”, color: “#e2e8f0” }}>Hydroponisches System</div>
<div style={{ fontSize: 10, color: “#475569”, letterSpacing: 1 }}>PARAMETER-ABHÄNGIGKEITS-MODELL · ECHTZEIT-SIMULATION</div>
</div>
<div style={{ marginLeft: “auto”, display: “flex”, gap: 20 }}>
{[[“pos”, “#4ade80”, “+ Einfluss”], [“neg”, “#f87171”, “− Einfluss”], [“curve”, “#a78bfa”, “Kurveneinfluss”]].map(([type, color, label]) => (
<div key={type} style={{ display: “flex”, alignItems: “center”, gap: 6, fontSize: 10, color: “#64748b” }}>
<div style={{ width: 20, height: 1, background: color, borderTop: `2px dashed ${color}` }} />
{label}
</div>
))}
</div>
</div>

```
  <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 280px", gap: 0, height: "calc(100vh - 65px)" }}>

    {/* LEFT: Controls */}
    <div style={{ background: "#050d1a", borderRight: "1px solid #1e293b", padding: 20, overflowY: "auto" }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Steuerung</div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Pumpen</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Toggle label="Wasserpumpe" icon="💧" active={controls.waterPump} onChange={v => update("waterPump", v)} color="#38bdf8" />
          <Toggle label="Nährstoff-Pumpe" icon="🧪" active={controls.nutrientPump} onChange={v => update("nutrientPump", v)} color="#34d399" />
          <Toggle label="pH-Hoch-Pumpe" icon="⬆" active={controls.phUpPump} onChange={v => update("phUpPump", v)} color="#a78bfa" />
          <Toggle label="pH-Runter-Pumpe" icon="⬇" active={controls.phDownPump} onChange={v => update("phDownPump", v)} color="#f472b6" />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Beleuchtung</div>
        <Toggle label="Wachstumslampe" icon="💡" active={controls.light} onChange={v => update("light", v)} color="#fbbf24" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1, marginBottom: 2, textTransform: "uppercase" }}>Umgebung</div>
        <Slider label="Temperatur" icon="🌡️" value={controls.tempSlider} min={10} max={35} unit="°C" color="#f97316" onChange={v => update("tempSlider", v)} />
        <Slider label="CO₂ / Luftqualität" icon="🌿" value={controls.co2Slider} min={300} max={1500} unit="ppm" color="#fbbf24" onChange={v => update("co2Slider", v)} />
      </div>

      {/* Cascade Log */}
      {log.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Änderungs-Protokoll</div>
          {log.map((entry, i) => (
            <div key={i} style={{ marginBottom: 10, padding: 8, background: "#0a0f1e", borderRadius: 6, borderLeft: `2px solid ${i === 0 ? "#38bdf8" : "#1e293b"}` }}>
              <div style={{ fontSize: 9, color: "#475569" }}>{entry.time}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{entry.label}</div>
              <div style={{ fontSize: 9, color: "#334155", marginTop: 3 }}>↪ {entry.cascade}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* CENTER: Dependency Graph */}
    <div style={{ background: "#020c1b", padding: 24, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
        Abhängigkeitsgraph · <span style={{ color: "#38bdf8" }}>Klicken Sie auf Steuerelemente um Kaskaden zu sehen</span>
      </div>
      <div style={{ flex: 1, background: "#030a14", borderRadius: 12, border: "1px solid #1e293b", overflow: "hidden", padding: 8 }}>
        <DependencyGraph state={state} highlighted={highlighted} />
      </div>

      {/* Edge legend */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {EDGES.slice(0, 6).map((edge, i) => (
          <div key={i} style={{
            padding: "6px 10px", background: "#0a0f1e", borderRadius: 6,
            border: "1px solid #1e293b", fontSize: 9, color: "#475569",
            borderLeft: `2px solid ${edge.effect === "pos" ? "#4ade80" : edge.effect === "neg" ? "#f87171" : "#a78bfa"}`
          }}>
            <span style={{ color: "#64748b" }}>{PARAMS[edge.from].label}</span>
            {" → "}{PARAMS[edge.to].label}
            <div style={{ color: "#334155", marginTop: 2 }}>{edge.label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* RIGHT: Parameter values */}
    <div style={{ background: "#050d1a", borderLeft: "1px solid #1e293b", padding: 20, overflowY: "auto" }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>System-Parameter</div>
      {Object.entries(state).map(([key, value]) => (
        <ParamBar key={key} param={key} value={value} />
      ))}

      {/* System health */}
      <div style={{ marginTop: 20, padding: 12, background: "#0a0f1e", borderRadius: 8, border: "1px solid #1e293b" }}>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>System-Gesundheit</div>
        {(() => {
          const score = Object.entries(state).reduce((sum, [key, val]) => {
            const [lo, hi] = PARAMS[key].optimal;
            return sum + (val >= lo && val <= hi ? 1 : 0);
          }, 0);
          const pct = Math.round((score / Object.keys(state).length) * 100);
          const color = pct >= 80 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#f87171";
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ color, fontSize: 28, fontWeight: 700 }}>{pct}%</span>
                <span style={{ color: "#475569", fontSize: 10 }}>Parameter im Optimum</span>
              </div>
              <div style={{ height: 6, background: "#1e293b", borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s, background 0.5s", boxShadow: `0 0 8px ${color}60` }} />
              </div>
            </>
          );
        })()}
      </div>

      {/* Alerts */}
      <div style={{ marginTop: 16 }}>
        {Object.entries(state).map(([key, val]) => {
          const [lo, hi] = PARAMS[key].optimal;
          if (val >= lo && val <= hi) return null;
          const isHigh = val > hi;
          return (
            <div key={key} style={{ marginBottom: 6, padding: "8px 10px", background: "#1c0a0a", border: "1px solid #450a0a", borderRadius: 6, fontSize: 10 }}>
              <span style={{ color: "#f87171" }}>⚠ {PARAMS[key].label}</span>
              <span style={{ color: "#7f1d1d", marginLeft: 6 }}>zu {isHigh ? "hoch" : "niedrig"}: {val.toFixed(1)} {PARAMS[key].unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>

  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    input[type=range] { height: 4px; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0f1e; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
  `}</style>
</div>
```

);
}