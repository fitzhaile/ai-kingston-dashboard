import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap, ScatterChart, Scatter, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from "recharts";

const COLORS = {
  bg: "#f8f9fb",
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  accent: "#d97706",
  accentDim: "#b45309",
  blue: "#2563eb",
  teal: "#0d9488",
  rose: "#e11d48",
  violet: "#7c3aed",
  green: "#16a34a",
  slate: "#64748b",
  muted: "#64748b",
  text: "#1e293b",
  textDim: "#475569",
  white: "#1e293b",
};

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#14b8a6", "#f43f5e", "#8b5cf6", "#22c55e", "#e879f9", "#fb923c", "#38bdf8", "#a3e635"];

// ─── DATA ──────────────────────────────────────────────────
const occupationData = [
  { name: "Attorney", total: 155750, count: 69, donors: 51, avg: 2257 },
  { name: "Homemaker", total: 146500, count: 51, donors: 30, avg: 2873 },
  { name: "Owner", total: 133750, count: 58, donors: 40, avg: 2306 },
  { name: "President", total: 130500, count: 39, donors: 22, avg: 3346 },
  { name: "Retired", total: 98250, count: 45, donors: 35, avg: 2183 },
  { name: "CEO", total: 66250, count: 24, donors: 16, avg: 2760 },
  { name: "Pres. & CEO", total: 35000, count: 4, donors: 1, avg: 8750 },
  { name: "Filmmaker", total: 35000, count: 6, donors: 2, avg: 5833 },
  { name: "Construction", total: 33000, count: 9, donors: 5, avg: 3667 },
  { name: "Consultant", total: 30500, count: 22, donors: 18, avg: 1386 },
];

const amountClusters = [
  { amount: "$250", count: 33, pct: 4.3 },
  { amount: "$500", count: 87, pct: 11.3 },
  { amount: "$1,000", count: 156, pct: 20.3 },
  { amount: "$1,500", count: 84, pct: 10.9 },
  { amount: "$2,000", count: 23, pct: 3.0 },
  { amount: "$2,500", count: 34, pct: 4.4 },
  { amount: "$3,000", count: 11, pct: 1.4 },
  { amount: "$3,500", count: 269, pct: 35.0 },
  { amount: "$5,000", count: 29, pct: 3.8 },
  { amount: "$7,000", count: 17, pct: 2.2 },
];

const batchData = [
  { name: "Jul 2025", contributions: 308, total: 943550, mean: 3063, donors: 189, ga_pct: 84 },
  { name: "Dec 2025", contributions: 256, total: 617450, mean: 2412, donors: 195, ga_pct: 90 },
  { name: "Jan 2026", contributions: 205, total: 322300, mean: 1572, donors: 181, ga_pct: 69 },
];

const geoData = [
  { name: "GA", value: 676, amount: 1539650 },
  { name: "DC", value: 33, amount: 68900 },
  { name: "VA", value: 28, amount: 62000 },
  { name: "FL", value: 23, amount: 61750 },
  { name: "SC", value: 17, amount: 47500 },
  { name: "NY", value: 5, amount: 7000 },
  { name: "WI", value: 5, amount: 21000 },
  { name: "OH", value: 5, amount: 5500 },
  { name: "Other", value: 27, amount: 69000 },
];

const familyPairs = [
  { family: "Critz", total: 45500, members: 2 },
  { family: "Demere", total: 45500, members: 2 },
  { family: "Hollis", total: 45500, members: 2 },
  { family: "Dorsey", total: 42000, members: 2 },
  { family: "Miranda", total: 31500, members: 2 },
  { family: "Jackson", total: 31500, members: 2 },
  { family: "Jepson", total: 31500, members: 2 },
  { family: "Mingledorff (J.)", total: 31500, members: 2 },
  { family: "Myers", total: 31500, members: 2 },
  { family: "Haynes", total: 21000, members: 2 },
  { family: "Mingledorff (B.)", total: 21000, members: 2 },
  { family: "Daniel", total: 21000, members: 2 },
  { family: "Pattiz (J.A.)", total: 21000, members: 2 },
  { family: "Skeadas", total: 21000, members: 2 },
];

const employerNetwork = [
  { name: "Critz Inc.", total: 51000, donors: 4 },
  { name: "Pintail Site Prep", total: 37500, donors: 4 },
  { name: "Colonial Group", total: 37000, donors: 2 },
  { name: "Mingledorffs Inc.", total: 32500, donors: 3 },
  { name: "The Miranda Group", total: 31500, donors: 2 },
  { name: "Capital Dev Partners", total: 31500, donors: 2 },
  { name: "Thurston Group", total: 21000, donors: 2 },
  { name: "Bridgeport Tire", total: 21000, donors: 2 },
  { name: "Sterling Seacrest P.", total: 19500, donors: 3 },
  { name: "First Capital City", total: 17750, donors: 2 },
];

const dcVaOccupations = [
  { name: "Consultant", value: 14 },
  { name: "Principal", value: 5 },
  { name: "Officer (Military)", value: 4 },
  { name: "Partner", value: 4 },
  { name: "Lobbyist", value: 3 },
  { name: "JAG", value: 3 },
  { name: "Other", value: 8 },
];

const refundData = [
  { name: "$3,500 refunds", value: 41, amount: -143500 },
  { name: "$1,500 refunds", value: 9, amount: -13500 },
  { name: "$1,000 refunds", value: 1, amount: -1000 },
];

const spousalData = [
  { homemaker: "Demere, Maddie", spouse: "Demere, Christian B.", spouseOcc: "Pres. & CEO", hmTotal: 10500, spTotal: 35000 },
  { homemaker: "Daniel, Cindy", spouse: "Daniel, Marvin", spouseOcc: "Founder/Chair", hmTotal: 10500, spTotal: 10500 },
  { homemaker: "Haynes, Lorill", spouse: "Haynes, Patrick III", spouseOcc: "Chair/Founder", hmTotal: 10500, spTotal: 10500 },
  { homemaker: "Hufstetler, Teresa", spouse: "Hufstetler, Steve", spouseOcc: "Real Estate Dev", hmTotal: 10500, spTotal: 10500 },
  { homemaker: "Mingledorff, Nicky", spouse: "Mingledorff, Jeffrey", spouseOcc: "Sales Mgmt", hmTotal: 10500, spTotal: 21000 },
  { homemaker: "Mingledorff, Shirley", spouse: "Mingledorff, Bud", spouseOcc: "Management", hmTotal: 10500, spTotal: 10500 },
  { homemaker: "Jones, Emily", spouse: "Jones, Corey", spouseOcc: "Owner", hmTotal: 7000, spTotal: 7000 },
  { homemaker: "Lewis, Caroline", spouse: "Lewis, J. Curtis IV", spouseOcc: "Accounting", hmTotal: 3500, spTotal: 17000 },
];

// ─── COMPONENTS ────────────────────────────────────────────

const Card = ({ children, span = 1, title, subtitle }) => (
  <div style={{
    gridColumn: `span ${span}`,
    background: COLORS.card,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
    overflow: "hidden",
  }}>
    {title && (
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 18, background: COLORS.accent, borderRadius: 2 }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.white, letterSpacing: "-0.01em" }}>{title}</h3>
        </div>
        {subtitle && <p style={{ margin: "6px 0 0 11px", fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const StatBadge = ({ label, value, color = COLORS.accent }) => (
  <div style={{ textAlign: "center", padding: "8px 0" }}>
    <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    <div style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#f1f5f9", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: COLORS.white, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || COLORS.textDim }}>
          {p.name}: {typeof p.value === "number" && p.value >= 1000 ? `$${p.value.toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  );
};

const insightSections = [
  { id: "summary", label: "KPI Summary" },
  { id: "amounts", label: "Amount Clustering" },
  { id: "household", label: "Household Bundling" },
  { id: "timeline", label: "Filing Timeline" },
  { id: "dcva", label: "DC/VA Corridor" },
  { id: "employers", label: "Employer Networks" },
  { id: "occupations", label: "Occupation Mix" },
  { id: "refunds", label: "Refund Patterns" },
  { id: "geography", label: "Geography" },
];

export default function Dashboard() {
  const [active, setActive] = useState("summary");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 640px) {
          .dk-header { padding: 16px 16px 0 !important; }
          .dk-content { padding: 0 16px 24px !important; }
          .dk-kpi { grid-template-columns: repeat(2, 1fr) !important; }
          .dk-section { grid-template-columns: 1fr !important; }
          .dk-title-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .dk-refund-stat { grid-template-columns: 1fr !important; }
          .dk-table-wrap { overflow-x: auto !important; }
          .dk-nav { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
          .dk-nav button { text-align: center !important; }
        }
      `}</style>

      {/* Header */}
      <div className="dk-header" style={{ padding: "28px 32px 0", maxWidth: 1200, margin: "0 auto" }}>
        <div className="dk-title-row" style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLORS.white, letterSpacing: "-0.03em" }}>
            Jim Kingston Contributions
          </h1>
          <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 600, background: "#fef3c7", padding: "3px 10px", borderRadius: 20, marginBottom: 3 }}>
            FEC Contribution Analysis
          </span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.muted }}>
          820 itemized receipts · 534 unique contributors · $1.73M net · 2025–2026 Primary Runoff cycle
        </p>

        {/* Nav */}
        <div style={{ margin: "20px 0" }}>
          <button
            onClick={() => setActive("summary")}
            className="dk-summary-btn"
            style={{
              display: "block",
              width: "100%",
              background: active === "summary" ? COLORS.accent : "transparent",
              color: active === "summary" ? "#fff" : COLORS.muted,
              border: `1px solid ${active === "summary" ? COLORS.accent : COLORS.cardBorder}`,
              borderRadius: 20,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              marginBottom: 8,
              letterSpacing: "0.02em",
            }}
          >
            KPI Summary
          </button>
          <div className="dk-nav" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {insightSections.filter(s => s.id !== "summary").map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  background: active === s.id ? COLORS.accent : "transparent",
                  color: active === s.id ? "#fff" : COLORS.muted,
                  border: `1px solid ${active === s.id ? COLORS.accent : COLORS.cardBorder}`,
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="dk-content" style={{ padding: "0 32px 40px", maxWidth: 1200, margin: "0 auto" }}>

        {/* SUMMARY */}
        {active === "summary" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Row 1, Col 1: Waterfall */}
            <Card title="Fundraising Waterfall" subtitle="How gross receipts become net raised after refunds.">
              <div style={{ textAlign: "center", padding: "8px 0 0" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.accent, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>$1.73M</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>net raised</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { name: "Gross", value: 1880000 },
                  { name: "Refunds", value: 158000 },
                  { name: "Net", value: 1730000 },
                ]} margin={{ top: 16, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 2000000]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} label={({ x, y, width, index }) => {
                    const labels = ["$1.88M", "-$158K", "$1.73M"];
                    return <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={COLORS.muted}>{labels[index]}</text>;
                  }}>
                    {[COLORS.green, COLORS.rose, COLORS.accent].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Row 1, Col 2: Savannah Dominance */}
            <Card title="Savannah Dominance" subtitle="One city drives the campaign — Savannah alone accounts for nearly half of all contribution records.">
              <div style={{ textAlign: "center", padding: "8px 0 0" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.green, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>44%</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>of receipts from Savannah</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Savannah", value: 342 },
                      { name: "Other GA", value: 290 },
                      { name: "DC/VA", value: 61 },
                      { name: "Other states", value: 127 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    dataKey="value"
                    startAngle={90} endAngle={-270}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}`}
                  >
                    <Cell fill={COLORS.accent} />
                    <Cell fill={COLORS.green} />
                    <Cell fill={COLORS.violet} />
                    <Cell fill={COLORS.slate} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Row 2, Col 1: Donor Engagement */}
            <Card title="Donor Engagement" subtitle="534 unique donors filed 820 receipts — 35% are repeat contributors.">
              <div style={{ textAlign: "center", padding: "8px 0 0" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.blue, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>534</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>unique donors</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "One-time donors", value: 348 },
                      { name: "Repeat donors", value: 186 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    dataKey="value"
                    startAngle={90} endAngle={-270}
                    paddingAngle={3}
                    label={({ value }) => value}
                  >
                    <Cell fill={COLORS.blue} />
                    <Cell fill={COLORS.violet} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Row 2, Col 2: Donor Concentration */}
            <Card title="Donor Concentration" subtitle="How much of total fundraising comes from the biggest contributors.">
              <div style={{ textAlign: "center", padding: "8px 0 0" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.violet, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>62%</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>from top 50 donors</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={[
                  { pct: "Top 10", cumulative: 28 },
                  { pct: "Top 20", cumulative: 41 },
                  { pct: "Top 50", cumulative: 62 },
                  { pct: "Top 100", cumulative: 78 },
                  { pct: "All 534", cumulative: 100 },
                ]} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="pct" tick={{ fontSize: 9, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Area type="monotone" dataKey="cumulative" name="% of Total $" stroke={COLORS.violet} fill={COLORS.violet} fillOpacity={0.15} strokeWidth={2}
                    label={{ position: "top", fontSize: 10, fontWeight: 600, fill: COLORS.muted, formatter: v => `${v}%` }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Row 2, Col 3: Household Leverage */}
            <Card title="Household Leverage" subtitle="Spousal pairs effectively double giving — 15 homemaker-spouse pairs contribute at or near the combined max.">
              <div style={{ textAlign: "center", padding: "8px 0 0" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.teal, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>$7K</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>typical household pair</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { type: "Individual max", value: 3500 },
                  { type: "Spousal pair", value: 7000 },
                  { type: "Top household", value: 10500 },
                ]} margin={{ top: 16, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="type" tick={{ fontSize: 9, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 12000]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} label={({ x, y, width, index }) => {
                    const labels = ["$3.5K", "$7K", "$10.5K"];
                    return <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={COLORS.muted}>{labels[index]}</text>;
                  }}>
                    <Cell fill={COLORS.slate} />
                    <Cell fill={COLORS.teal} />
                    <Cell fill={COLORS.accent} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* INSIGHT 1: AMOUNT CLUSTERING */}
        {active === "amounts" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <Card title="Contribution Amounts Cluster at Legal Limits"
              subtitle="35% of all positive contributions are exactly $3,500 — the individual primary limit. The distribution is heavily bimodal, not normal.">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={amountClusters} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="amount" tick={{ fontSize: 11, fill: COLORS.muted }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Contributions" radius={[4, 4, 0, 0]}>
                    {amountClusters.map((e, i) => (
                      <Cell key={i} fill={e.amount === "$3,500" ? COLORS.accent : e.amount === "$5,000" ? COLORS.violet : COLORS.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Why This Matters">
              <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
                <p style={{margin: "0 0 12px"}}><strong style={{color: COLORS.white}}>Pattern:</strong> 269 of 769 positive contributions (35%) land at exactly $3,500 — the FEC individual-to-candidate limit for a single election. Another 29 hit the $5,000 PAC limit.</p>
                <p style={{margin: "0 0 12px"}}><strong style={{color: COLORS.white}}>Why it exists:</strong> The donor base skews affluent (CEOs, presidents, attorneys). Maxed-out donors suggest a well-connected fundraising operation reaching high-net-worth individuals willing to give the legal maximum.</p>
                <p style={{margin: "0 0 12px"}}><strong style={{color: COLORS.white}}>Hypothesis:</strong> Kingston's fundraising strategy prioritizes quality (max contributions) over breadth. Compare the ratio of max-outs to total donors vs. peer races.</p>
                <p style={{margin: 0, padding: "8px 12px", background: "#fef9c3", borderRadius: 8, borderLeft: `3px solid ${COLORS.accent}`, fontSize: 12 }}>
                  50 donors reached a $10,500 aggregate YTD — potentially maxing across primary + runoff + general.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* INSIGHT 2: HOUSEHOLD BUNDLING */}
        {active === "household" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Spousal ʻMirror Contributionsʼ"
              subtitle="15 homemaker donors match a spouse at the same address — 81% of all homemaker last names overlap with other donors. This doubles effective household giving.">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={spousalData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 45000]} tick={{ fontSize: 11, fill: COLORS.muted }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="homemaker" type="category" tick={{ fontSize: 10, fill: COLORS.muted }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hmTotal" name="Homemaker" stackId="a" fill={COLORS.rose} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="spTotal" name="Spouse" stackId="a" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Top Household Totals (Both Members Combined)"
              subtitle="Same last name + same address clusters. Many families contribute exactly 2× the individual max ($3,500 × 2 = $7,000 per election).">
              <div className="dk-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                      <th style={{ textAlign: "left", padding: "8px 6px", color: COLORS.muted, fontWeight: 600 }}>Family</th>
                      <th style={{ textAlign: "right", padding: "8px 6px", color: COLORS.muted, fontWeight: 600 }}>Combined $</th>
                      <th style={{ textAlign: "center", padding: "8px 6px", color: COLORS.muted, fontWeight: 600 }}>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyPairs.map((f, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid #f1f5f9` }}>
                        <td style={{ padding: "7px 6px", color: COLORS.white, fontWeight: 500 }}>{f.family}</td>
                        <td style={{ padding: "7px 6px", textAlign: "right", fontFamily: "'JetBrains Mono'", color: COLORS.accent }}>${f.total.toLocaleString()}</td>
                        <td style={{ padding: "7px 6px", width: "40%" }}>
                          <div style={{ background: "#f1f5f9", borderRadius: 3, height: 10, width: "100%" }}>
                            <div style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.rose})`, borderRadius: 3, height: 10, width: `${(f.total / 45500) * 100}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* INSIGHT 3: FILING TIMELINE */}
        {active === "timeline" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <Card title="Three Filing Batches — Sharply Different Profiles"
              subtitle="Contributions were filed in just 3 batches. The earliest has the highest average ($3,063) while the latest has the lowest ($1,572), yet brings in the most DC/VA donors.">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={batchData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: COLORS.muted }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: COLORS.muted }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: COLORS.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="total" name="Total $" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="donors" name="Unique Donors" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Batch Composition Shifts">
              <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
                <div style={{ padding: "10px 12px", background: "#fef9c3", borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: COLORS.accent, fontSize: 12 }}>JUL 2025 — "Whale" Filing</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>$943K · Avg $3,063 · 84% Georgia · 152 max-outs at $3,500</div>
                </div>
                <div style={{ padding: "10px 12px", background: "#dbeafe", borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: COLORS.blue, fontSize: 12 }}>DEC 2025 — Mid-Tier Expansion</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>$617K · Avg $2,412 · 90% Georgia · More $1K–$1.5K gifts</div>
                </div>
                <div style={{ padding: "10px 12px", background: "#ccfbf1", borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 12 }}>JAN 2026 — Small-Dollar + DC Surge</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>$322K · Avg $1,572 · Only 69% GA · DC/VA jumps to 19% of donors</div>
                </div>
                <p style={{ margin: "14px 0 0", fontSize: 12, color: COLORS.muted }}>
                  <strong style={{color: COLORS.white}}>Hypothesis:</strong> Early money came from Kingston's personal network (GA business elites). Later filings show broadening to DC political consultants — possibly after gaining national party attention.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* INSIGHT 4: DC/VA CORRIDOR */}
        {active === "dcva" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="The DC/Virginia Consultant & Lobbyist Cluster"
              subtitle="61 contributions totaling $130,900 from the DC/VA corridor — dominated by political consultants, lobbyists, and military officers. This signals national party infrastructure support.">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dcVaOccupations} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ name, value }) => `${name} (${value})`} labelLine={{ stroke: COLORS.muted }} style={{ fontSize: 11 }}>
                    {dcVaOccupations.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Key DC/VA Employers">
              <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
                {[
                  { name: "Tiberkreek Group", n: 8, desc: "Republican political consulting firm" },
                  { name: "USMC / US Navy", n: 7, desc: "Active military officers (JAG)" },
                  { name: "Garrison Management Group", n: 4, desc: "GOP campaign management" },
                  { name: "Squire Patton Boggs", n: 3, desc: "Major lobbying firm" },
                  { name: "Axiom Strategies", n: 2, desc: "Republican political strategy" },
                  { name: "InSession Strategies", n: 2, desc: "Government affairs consulting" },
                ].map(e => (
                  <div key={e.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid #f1f5f9` }}>
                    <div>
                      <div style={{ color: COLORS.white, fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{e.desc}</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono'", color: COLORS.violet, fontSize: 13, fontWeight: 600 }}>{e.n} donors</span>
                  </div>
                ))}
                <p style={{ margin: "14px 0 0", padding: "8px 12px", background: "#ede9fe", borderRadius: 8, borderLeft: `3px solid ${COLORS.violet}`, fontSize: 12 }}>
                  <strong>Hypothesis:</strong> These are not organic supporters — they represent national Republican infrastructure. Test whether the same DC consultants donate to other GA congressional races.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* INSIGHT 5: EMPLOYER NETWORKS */}
        {active === "employers" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <Card title="Employer-Linked Donor Clusters"
              subtitle="Multiple employees from the same company donating suggests workplace-organized fundraising or executive social networks. Critz Inc. leads with 4 donors and $51K.">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={employerNetwork} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.muted }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: COLORS.muted }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total $" fill={COLORS.teal} radius={[0, 4, 4, 0]}>
                    {employerNetwork.map((e, i) => (
                      <Cell key={i} fill={e.donors >= 3 ? COLORS.accent : COLORS.teal} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Network Interpretation">
              <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
                <p style={{margin: "0 0 12px"}}><strong style={{color: COLORS.white}}>Pattern:</strong> 15 companies have 2+ employee-donors. These are overwhelmingly Savannah-area businesses in construction, real estate, auto dealerships, and professional services.</p>
                <p style={{margin: "0 0 12px"}}><strong style={{color: COLORS.white}}>Why:</strong> This suggests Kingston has deep roots in Savannah's business community. Workplace bundling (where a business leader encourages employees to donate) is a common fundraising tactic.</p>
                <p style={{margin: "0 0 12px"}}><strong style={{color: COLORS.white}}>Key observation:</strong> <span style={{color: COLORS.accent}}>Gold bars</span> = 3+ donors from same firm. These clusters likely represent a direct relationship between Kingston and the firm's principal.</p>
                <p style={{margin: 0, padding: "8px 12px", background: "#ccfbf1", borderRadius: 8, borderLeft: `3px solid ${COLORS.teal}`, fontSize: 12 }}>
                  <strong>Test:</strong> Cross-reference these employer clusters with Kingston's professional history and board memberships for direct ties.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* INSIGHT 6: OCCUPATIONS */}
        {active === "occupations" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Contributions by Occupation — Total Dollars"
              subtitle="Attorneys lead in total giving, but Homemakers have the highest average ($2,873) among high-volume groups — nearly all give at the maximum.">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={occupationData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total $" fill={COLORS.blue} radius={[4, 4, 0, 0]}>
                    {occupationData.map((e, i) => (
                      <Cell key={i} fill={e.name === "Homemaker" ? COLORS.rose : COLORS.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Average Contribution by Occupation"
              subtitle="Higher-title donors give larger amounts, but the Homemaker average is inflated by spousal max-outs — nearly every Homemaker donation is exactly $3,500.">
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="donors" name="Unique Donors" tick={{ fontSize: 11, fill: COLORS.muted }} label={{ value: "Unique Donors", position: "insideBottom", offset: -5, fontSize: 11, fill: COLORS.muted }} />
                  <YAxis dataKey="avg" name="Avg $" tick={{ fontSize: 11, fill: COLORS.muted }} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#f1f5f9", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                        <div style={{ color: COLORS.white, fontWeight: 600 }}>{d.name}</div>
                        <div style={{ color: COLORS.textDim }}>{d.donors} donors · Avg ${d.avg.toLocaleString()}</div>
                        <div style={{ color: COLORS.accent }}>Total: ${d.total.toLocaleString()}</div>
                      </div>
                    );
                  }} />
                  <Scatter data={occupationData} fill={COLORS.accent}>
                    {occupationData.map((e, i) => (
                      <Cell key={i} fill={e.name === "Homemaker" ? COLORS.rose : e.name === "Consultant" ? COLORS.violet : COLORS.accent} r={Math.sqrt(e.total / 3000)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* INSIGHT 7: REFUNDS */}
        {active === "refunds" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="$158,000 in Refunds — All at Limit Amounts"
              subtitle="51 refund transactions totaling $158K. Every single refund is at a round limit amount ($3,500 or $1,500), suggesting systematic correction of over-limit contributions.">
              <div className="dk-refund-stat" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                {refundData.map(r => (
                  <div key={r.name} style={{ background: "#f1f5f9", borderRadius: 8, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.rose }}>{r.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{r.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textDim, marginTop: 4 }}>{`$${Math.abs(r.amount).toLocaleString()}`}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.6, padding: "10px 12px", background: "#ffe4e6", borderRadius: 8, borderLeft: `3px solid ${COLORS.rose}` }}>
                <strong style={{ color: COLORS.white }}>Key finding:</strong> All 41 refunds at $3,500 appear in the earliest filing (Jul 2025), applied to donors who also have positive contributions in later filings. This pattern is consistent with amended filings where contributions were re-allocated across election cycles (primary vs. runoff vs. general).
              </div>
            </Card>
            <Card title="Refunded Donors — Before and After"
              subtitle="Every refunded donor still has substantial net positive contributions. The refunds appear to be accounting corrections, not rescinded support.">
              <div className="dk-table-wrap" style={{ maxHeight: 300, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                      <th style={{ textAlign: "left", padding: "6px", color: COLORS.muted }}>Donor</th>
                      <th style={{ textAlign: "right", padding: "6px", color: COLORS.muted }}>Refund</th>
                      <th style={{ textAlign: "right", padding: "6px", color: COLORS.muted }}>Gross +</th>
                      <th style={{ textAlign: "right", padding: "6px", color: COLORS.muted }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: "Critz, Dale C. Jr.", r: -3500, g: 35000 },
                      { n: "Demere, Christian B.", r: -3500, g: 35000 },
                      { n: "Hollis, TJ", r: -3500, g: 35000 },
                      { n: "Dorsey, William S. III", r: -3500, g: 31500 },
                      { n: "Jackson, Richard K. Jr.", r: -3500, g: 21000 },
                      { n: "Jepson, Jeffrey", r: -3500, g: 21000 },
                      { n: "Kinsell, Brad", r: -3500, g: 21000 },
                      { n: "Mingledorff, Jeffrey", r: -3500, g: 21000 },
                      { n: "Miranda, Daniel", r: -3500, g: 21000 },
                      { n: "Myers, Trey", r: -3500, g: 21000 },
                      { n: "Porter, John Knox Jr.", r: -3500, g: 21000 },
                      { n: "Pattiz, James A.", r: -3500, g: 17500 },
                      { n: "Pattiz, William", r: -3500, g: 17500 },
                      { n: "Skeadas, John III", r: -3500, g: 17500 },
                      { n: "Waters, Don L.", r: -3500, g: 15000 },
                    ].map(d => (
                      <tr key={d.n} style={{ borderBottom: `1px solid #f1f5f9` }}>
                        <td style={{ padding: "5px 6px", color: COLORS.white }}>{d.n}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", color: COLORS.rose, fontFamily: "'JetBrains Mono'", fontSize: 11 }}>${Math.abs(d.r).toLocaleString()}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", color: COLORS.green, fontFamily: "'JetBrains Mono'", fontSize: 11 }}>${d.g.toLocaleString()}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", color: COLORS.accent, fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 700 }}>${(d.g + d.r).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* INSIGHT 8: GEOGRAPHY */}
        {active === "geography" && (
          <div className="dk-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="82% of Contributions Come from Georgia"
              subtitle="Hyper-local fundraising with Savannah as the epicenter: 342 contributions from Savannah alone represent 44% of all records.">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geoData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: COLORS.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Contributions" fill={COLORS.blue} radius={[4, 4, 0, 0]}>
                    {geoData.map((e, i) => (
                      <Cell key={i} fill={e.name === "GA" ? COLORS.accent : e.name === "DC" || e.name === "VA" ? COLORS.violet : COLORS.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Georgia ZIP Code Concentration"
              subtitle="The top 5 GA ZIP codes (all Savannah 314xx) account for a disproportionate share of total dollars. This is a geographically tight donor base.">
              <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
                {[
                  { zip: "31411", area: "Savannah (The Landings)", total: "$91K", note: "Affluent gated community" },
                  { zip: "31406", area: "Savannah (Southside)", total: "$88K", note: "Established residential" },
                  { zip: "31407", area: "Savannah (Georgetown)", total: "$42K", note: "Newer suburban" },
                  { zip: "31404", area: "Savannah (Midtown)", total: "$40K", note: "Mixed residential" },
                  { zip: "31401", area: "Savannah (Downtown/Historic)", total: "$25K", note: "Historic District core" },
                ].map(z => (
                  <div key={z.zip} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid #f1f5f9` }}>
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono'", color: COLORS.accent, fontSize: 12, marginRight: 8 }}>{z.zip}</span>
                      <span style={{ color: COLORS.white, fontWeight: 500 }}>{z.area}</span>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{z.note}</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono'", color: COLORS.green, fontWeight: 600 }}>{z.total}</span>
                  </div>
                ))}
                <p style={{ margin: "14px 0 0", padding: "8px 12px", background: "#dbeafe", borderRadius: 8, borderLeft: `3px solid ${COLORS.blue}`, fontSize: 12 }}>
                  <strong>Hypothesis:</strong> Kingston's core support tracks wealthy Savannah suburbs (especially The Landings at 31411). Map donor density against household income census data to confirm.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
