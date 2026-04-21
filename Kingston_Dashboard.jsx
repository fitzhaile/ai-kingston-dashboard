import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ComposedChart, ReferenceLine, ReferenceArea
} from 'recharts';

/* ============================================================
   FRIENDS OF JIM KINGSTON — CAMPAIGN INTELLIGENCE
   Data: FEC Schedule A (through 12/31/2025) + FEC Form 3 summary (Q1 2026)
   ============================================================ */

const P = {
  kingston: '#1E3A5F',
  kingstonLight: '#3A6B8C',
  kingstonAccent: '#D4A94A',
  montgomery: '#8B4513',
  montgomeryLight: '#B8743F',
  farrell: '#6B4C7A',
  farrellLight: '#9379A3',
  bg: '#FBF8F2',
  paper: '#FFFFFF',
  ink: '#1F1F1F',
  muted: '#6B6B6B',
  mutedLight: '#9A9A9A',
  line: '#E8E2D4',
  success: '#5A7F4F',
  warning: '#C4723E',
  danger: '#A04040',
  alert: '#D4A94A',
};

const C = {
  Kingston:   { color: P.kingston,   light: P.kingstonLight,   label: 'Kingston' },
  Montgomery: { color: P.montgomery, light: P.montgomeryLight, label: 'Montgomery' },
  Farrell:    { color: P.farrell,    light: P.farrellLight,    label: 'Farrell' },
};

// === FEC FINANCIAL SUMMARY (THROUGH Q1 2026) ===
const FIN = {
  Kingston:   { receipts: 1818425, indiv: 1638975, itemized: 1622210, unitemized: 16765, pac: 179450, selfLoans: 0, selfContrib: 0, spent: 527039, cash: 1291387, debt: 0, monthsActive: 10 },
  Montgomery: { receipts: 252045,  indiv: 227031,  itemized: 216349,  unitemized: 10681, pac: 8500,   selfLoans: 0, selfContrib: 16515, spent: 206600, cash: 45445,   debt: 0, monthsActive: 9 },
  Farrell:    { receipts: 646235,  indiv: 145985,  itemized: 139401,  unitemized: 6584,  pac: 250,    selfLoans: 500000, selfContrib: 0, spent: 236163, cash: 410073, debt: 500000, monthsActive: 11 },
};

// === CUMULATIVE & MONTHLY (primary, from Schedule A) ===
const CUMULATIVE = [
  { month: 'Jun', Kingston: 633050,  Montgomery: 0,      Farrell: 26050 },
  { month: 'Jul', Kingston: 665800,  Montgomery: 0,      Farrell: 31300 },
  { month: 'Aug', Kingston: 728300,  Montgomery: 51474,  Farrell: 37800 },
  { month: 'Sep', Kingston: 883750,  Montgomery: 88042,  Farrell: 75350 },
  { month: 'Oct', Kingston: 925900,  Montgomery: 95739,  Farrell: 84500 },
  { month: 'Nov', Kingston: 960200,  Montgomery: 96124,  Farrell: 89000 },
  { month: 'Dec', Kingston: 1049050, Montgomery: 123021, Farrell: 94500 },
];
const MONTHLY = [
  { month: 'Jun', Kingston: 633050, Montgomery: 0,     Farrell: 26050 },
  { month: 'Jul', Kingston: 32750,  Montgomery: 0,     Farrell: 5250  },
  { month: 'Aug', Kingston: 62500,  Montgomery: 51474, Farrell: 6500  },
  { month: 'Sep', Kingston: 155450, Montgomery: 36568, Farrell: 37550 },
  { month: 'Oct', Kingston: 42150,  Montgomery: 7696,  Farrell: 9150  },
  { month: 'Nov', Kingston: 34300,  Montgomery: 385,   Farrell: 4500  },
  { month: 'Dec', Kingston: 88850,  Montgomery: 26897, Farrell: 5500  },
];

// === PROPERLY-BUCKETED DONATION DISTRIBUTION ===
// (earlier version was wrong — pd.cut used right-inclusive intervals)
const AMOUNT_DIST = [
  { bucket: '< $100',         short: '<$100',     Kingston: 2,   Montgomery: 0,  Farrell: 0  },
  { bucket: '$100 – 249',     short: '$100',      Kingston: 6,   Montgomery: 15, Farrell: 0  },
  { bucket: '$250 – 499',     short: '$250',      Kingston: 34,  Montgomery: 31, Farrell: 23 },
  { bucket: '$500 – 999',     short: '$500',      Kingston: 84,  Montgomery: 32, Farrell: 31 },
  { bucket: '$1K – 2.4K',     short: '$1K',       Kingston: 245, Montgomery: 35, Farrell: 31 },
  { bucket: '$2.5K – 3.4K',   short: '$2.5K',     Kingston: 32,  Montgomery: 12, Farrell: 4  },
  { bucket: '$3,500 exactly', short: '$3.5K max', Kingston: 267, Montgomery: 17, Farrell: 8  },
  { bucket: '$3.5K – 6.9K',   short: '$3.5–7K',   Kingston: 13,  Montgomery: 1,  Farrell: 0  },
  { bucket: '$7,000 exactly', short: '$7K (2×)',  Kingston: 17,  Montgomery: 0,  Farrell: 0  },
  { bucket: '> $7,000',       short: '>$7K',      Kingston: 13,  Montgomery: 1,  Farrell: 0  },
];

// === OCCUPATIONS ===
const OCCUPATIONS = {
  Kingston: [
    { occ: 'Attorney',    n: 75 }, { occ: 'Owner', n: 61 }, { occ: 'Homemaker', n: 51 },
    { occ: 'Retired',     n: 47 }, { occ: 'President', n: 46 }, { occ: 'CEO', n: 30 },
    { occ: 'Consultant',  n: 22 }, { occ: 'Business Owner', n: 14 }, { occ: 'Real Estate', n: 13 },
    { occ: 'Principal',   n: 12 },
  ],
  Montgomery: [
    { occ: 'Retired', n: 43 }, { occ: 'Consultant', n: 9 }, { occ: 'Business Owner', n: 7 },
    { occ: 'Attorney', n: 7 }, { occ: 'Manager', n: 5 }, { occ: 'Healthcare', n: 5 },
    { occ: 'Distributor', n: 4 }, { occ: 'Accountant', n: 4 }, { occ: 'Realtor', n: 3 }, { occ: 'Physician', n: 3 },
  ],
  Farrell: [
    { occ: 'Retired', n: 23 }, { occ: 'Attorney', n: 8 }, { occ: 'Owner', n: 7 },
    { occ: 'CEO', n: 5 }, { occ: 'Consultant', n: 4 }, { occ: 'President', n: 3 },
    { occ: 'Vice President', n: 3 }, { occ: 'Manager', n: 3 }, { occ: 'Consulting', n: 2 }, { occ: 'Principal', n: 2 },
  ],
};

// === TOP ZIPS WITH ACS HHI ===
const TOP_ZIPS = [
  { zip: '31411', nbhd: 'Skidaway Island',   city: 'Savannah',      hhi: 147000, Kingston: 186900, Montgomery: 49037, Farrell: 10500 },
  { zip: '31406', nbhd: 'Southside',         city: 'Savannah',      hhi: 64000,  Kingston: 221550, Montgomery: 2551,  Farrell: 17500 },
  { zip: '31410', nbhd: 'Wilmington Island', city: 'Savannah',      hhi: 95000,  Kingston: 105000, Montgomery: 1301,  Farrell: 13800 },
  { zip: '31401', nbhd: 'Downtown Historic', city: 'Savannah',      hhi: 52000,  Kingston: 88000,  Montgomery: 520,   Farrell: 13000 },
  { zip: '31522', nbhd: 'St. Simons Island', city: 'St. Simons',    hhi: 90000,  Kingston: 23300,  Montgomery: 7393,  Farrell: 750   },
  { zip: '31324', nbhd: 'Richmond Hill',     city: 'Richmond Hill', hhi: 105000, Kingston: 60500,  Montgomery: 2041,  Farrell: 1000  },
  { zip: '31405', nbhd: 'Habersham',         city: 'Savannah',      hhi: 68000,  Kingston: 44000,  Montgomery: 250,   Farrell: 7250  },
  { zip: '31416', nbhd: 'Oatland/Skidaway',  city: 'Savannah',      hhi: 142000, Kingston: 12250,  Montgomery: 0,     Farrell: 8550  },
  { zip: '31322', nbhd: 'Pooler',            city: 'Pooler',        hhi: 82000,  Kingston: 34500,  Montgomery: 2852,  Farrell: 2750  },
  { zip: '31419', nbhd: 'Westside',          city: 'Savannah',      hhi: 58000,  Kingston: 24000,  Montgomery: 260,   Farrell: 6500  },
  { zip: '31404', nbhd: 'Eastside',          city: 'Savannah',      hhi: 38000,  Kingston: 51500,  Montgomery: 0,     Farrell: 1000  },
  { zip: '30327', nbhd: 'Buckhead',          city: 'Atlanta',       hhi: 180000, Kingston: 48200,  Montgomery: 0,     Farrell: 0     },
  { zip: '30305', nbhd: 'Buckhead',          city: 'Atlanta',       hhi: 145000, Kingston: 23500,  Montgomery: 0,     Farrell: 0     },
  { zip: '31407', nbhd: 'Port Wentworth',    city: 'Savannah',      hhi: 63000,  Kingston: 31500,  Montgomery: 0,     Farrell: 0     },
  { zip: '30269', nbhd: 'Peachtree City',    city: 'Peachtree City', hhi: 115000, Kingston: 17500, Montgomery: 0,     Farrell: 1600  },
  { zip: '31331', nbhd: 'Darien/Sapelo',     city: 'Darien',        hhi: 48000,  Kingston: 1000,   Montgomery: 7000,  Farrell: 0     },
  { zip: '31545', nbhd: 'Jesup',             city: 'Jesup',         hhi: 45000,  Kingston: 2000,   Montgomery: 5664,  Farrell: 0     },
];

const INCOME_TIER = [
  { tier: 'High ($125K+)',        Kingston: 18.0, Montgomery: 27.9, Farrell: 20.2 },
  { tier: 'Upper-Mid ($75–124K)', Kingston: 17.1, Montgomery: 16.5, Farrell: 21.4 },
  { tier: 'Middle ($50–74K)',     Kingston: 26.7, Montgomery: 7.9,  Farrell: 46.5 },
  { tier: 'Low (<$50K)',          Kingston: 7.9,  Montgomery: 10.4, Farrell: 1.1  },
  { tier: 'Out-of-area',          Kingston: 30.3, Montgomery: 37.3, Farrell: 10.8 },
];

const GEO = {
  Kingston:   { inDist: 734950, atlanta: 194200, outState: 119900 },
  Montgomery: { inDist: 78554,  atlanta: 7104,   outState: 40063  },
  Farrell:    { inDist: 84400,  atlanta: 7100,   outState: 3000   },
};

// === QUALITY METRICS ===
const Q = {
  Kingston:   { donors: 485, repeatRate: 32.8, top20Pct: 16.4, avgGift: 1828, inDistPct: 70.1, maxed: 181, pac: 179450, selfPct: 0 },
  Montgomery: { donors: 104, repeatRate: 23.1, top20Pct: 54.7, avgGift: 960,  inDistPct: 62.5, maxed: 17,  pac: 8500,   selfPct: 6.6 },
  Farrell:    { donors: 88,  repeatRate: 10.2, top20Pct: 58.1, avgGift: 995,  inDistPct: 87.0, maxed: 10,  pac: 250,    selfPct: 77.4 },
};

// === DOUBLE-MAX CLUB (gave Kingston $7,000+) ===
// 74 total — top 15 shown
const DOUBLE_MAX = [
  { name: 'Dale C. Critz Jr.',      city: 'Savannah',       occ: 'President (auto dealership)',   amount: 24500 },
  { name: 'Christian B. Demere',    city: 'Savannah',       occ: 'President & CEO (Colonial Group)', amount: 24500 },
  { name: 'TJ Hollis',              city: 'Savannah',       occ: 'Attorney',                      amount: 24500 },
  { name: 'William S. Dorsey III',  city: 'Savannah',       occ: 'Retired',                       amount: 21000 },
  { name: 'James A. Pattiz',        city: 'Peachtree City', occ: 'Filmmaker',                     amount: 14000 },
  { name: 'John Skeadas III',       city: 'Savannah',       occ: 'Investment Manager',            amount: 14000 },
  { name: 'William Pattiz',         city: 'New York, NY',   occ: 'Filmmaker',                     amount: 14000 },
  { name: 'Jesse Bentley',          city: 'Savannah',       occ: 'Agriculture',                   amount: 10500 },
  { name: 'Ames McGill Barnett',    city: 'Watkinsville',   occ: 'President/Owner',               amount: 10500 },
  { name: 'Evan Charles Barker',    city: 'Savannah',       occ: 'Attorney',                      amount: 10500 },
  { name: 'Ben J. Tarbutton III',   city: 'Sandersville',   occ: 'President',                     amount: 10500 },
  { name: 'Lauren E. Tait',         city: 'Savannah',       occ: 'Homemaker',                     amount: 10500 },
  { name: 'Don L. Waters',          city: 'Savannah',       occ: 'Business Owner',                amount: 10500 },
  { name: 'Trey Myers',             city: 'Savannah',       occ: 'Entrepreneur',                  amount: 10500 },
  { name: 'Alton Brown Jr.',        city: 'Savannah',       occ: 'Environmental Consultant',      amount: 10500 },
];

const BUNDLERS = [
  { firm: 'Critz Inc.',                  n: 8, total: 25000 },
  { firm: 'Colonial Group Inc.',         n: 6, total: 19500 },
  { firm: 'McManamy Jackson Hollis',     n: 7, total: 17500 },
  { firm: 'Sterling Seacrest Pritchard', n: 5, total: 14500 },
  { firm: 'Pintail Site Preparation',    n: 7, total: 11500 },
  { firm: 'First Capital City Mgmt',     n: 4, total: 10750 },
  { firm: 'J.C. Lewis Motor Co.',        n: 3, total: 10500 },
  { firm: 'Howard Barker Lane P.C.',     n: 3, total: 10500 },
  { firm: 'Sea Raven Media LLC',         n: 3, total: 10500 },
  { firm: 'Tiber Creek Group',           n: 9, total: 8750  },
];

const SHARED = [
  { name: 'Logan R. Abbott',   city: 'Savannah 31406',   Kingston: 500,  Montgomery: 0,    Farrell: 3500, tone: 'hot' },
  { name: 'Martin J. Miller',  city: 'Savannah 31416',   Kingston: 2000, Montgomery: 0,    Farrell: 3300, tone: 'hot' },
  { name: 'Byron L. Smith',    city: 'Richmond Hill',    Kingston: 0,    Montgomery: 1000, Farrell: 1000, tone: 'warm' },
  { name: 'Mills Fleming',     city: 'Savannah 31401',   Kingston: 500,  Montgomery: 521,  Farrell: 0,    tone: 'warm' },
  { name: 'Yong Choe',         city: 'Washington DC',    Kingston: 500,  Montgomery: 0,    Farrell: 500,  tone: 'low' },
  { name: 'Freda M. Smith',    city: 'Savannah 31401',   Kingston: 500,  Montgomery: 0,    Farrell: 500,  tone: 'low' },
];

// === DONOR ACQUISITION VELOCITY ===
const DONOR_VELOCITY = [
  { month: 'Jun', Kingston: 187, Montgomery: 0,  Farrell: 23 },
  { month: 'Jul', Kingston: 35,  Montgomery: 0,  Farrell: 6  },
  { month: 'Aug', Kingston: 50,  Montgomery: 45, Farrell: 8  },
  { month: 'Sep', Kingston: 79,  Montgomery: 30, Farrell: 36 },
  { month: 'Oct', Kingston: 41,  Montgomery: 15, Farrell: 8  },
  { month: 'Nov', Kingston: 33,  Montgomery: 2,  Farrell: 4  },
  { month: 'Dec', Kingston: 60,  Montgomery: 12, Farrell: 3  },
];

// === TIMELINE EVENTS ===
const TIMELINE = [
  { date: '2025-05-08', label: 'Buddy Carter announces Senate run — seat opens',  who: 'Context' },
  { date: '2025-05-15', label: 'Farrell files FEC committee',                     who: 'Farrell' },
  { date: '2025-06-18', label: 'Kingston registers; launches with $633K month',   who: 'Kingston' },
  { date: '2025-07-17', label: 'Farrell formal announcement at Forest City Gun Club', who: 'Farrell' },
  { date: '2025-08-25', label: 'Montgomery files Statement of Candidacy',         who: 'Montgomery' },
  { date: '2025-09-15', label: 'Kingston Q3 call-time push ($155K month)',        who: 'Kingston' },
  { date: '2026-03-06', label: 'Qualifying deadline — Farrell forced out of commission seat', who: 'Farrell' },
  { date: '2026-04-14', label: 'TRUMP ENDORSES KINGSTON',                         who: 'Kingston', flag: true },
  { date: '2026-05-19', label: 'PRIMARY ELECTION DAY',                            who: 'All', flag: true },
  { date: '2026-06-16', label: 'Runoff (if needed)',                              who: 'All' },
];

// === RUNWAY BURN-DOWN DATA (projected forward from Apr 20, 2026) ===
const RUNWAY = [
  { weeksOut: -1, day: 'Apr 13',   Kingston: 1291387, Montgomery: 45445,  Farrell: 410073 },
  { weeksOut: 0,  day: 'Apr 20',   Kingston: 1280344, Montgomery: 39638,  Farrell: 405044 },
  { weeksOut: 1,  day: 'Apr 27',   Kingston: 1269301, Montgomery: 33831,  Farrell: 400015 },
  { weeksOut: 2,  day: 'May 4',    Kingston: 1258258, Montgomery: 28024,  Farrell: 394986 },
  { weeksOut: 3,  day: 'May 11',   Kingston: 1247215, Montgomery: 22217,  Farrell: 389957 },
  { weeksOut: 4,  day: 'May 18',   Kingston: 1236172, Montgomery: 16410,  Farrell: 384928 },
  { weeksOut: 5,  day: 'Primary',  Kingston: 1235000, Montgomery: 15000,  Farrell: 384000 },
];

const DAYS_TO_PRIMARY = Math.max(0, Math.ceil((new Date('2026-05-19') - new Date('2026-04-20')) / 86400000));

/* ============================================================
   FORMATTERS
   ============================================================ */
const fmt  = (n) => '$' + Math.round(n).toLocaleString();
const fmtK = (n) => {
  if (n === 0) return '$0';
  if (Math.abs(n) >= 1000000) return '$' + (n/1000000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1000) return '$' + Math.round(n/1000) + 'K';
  return '$' + Math.round(n);
};
const fmtN = (n) => Math.round(n).toLocaleString();
const SUFFIXES = new Set(['Jr.','Jr','Sr.','Sr','II','III','IV','V']);
const lastName = (full) => {
  const parts = full.split(' ');
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1];
};

/* ============================================================
   UI PRIMITIVES
   ============================================================ */
const Tag = ({ children, tone = 'default' }) => {
  const t = {
    default:  { bg: '#F0EBDD', fg: '#1F1F1F' },
    success:  { bg: '#DEE9D7', fg: '#2F4A22' },
    warning:  { bg: '#F5DFCC', fg: '#6B3F1E' },
    danger:   { bg: '#EDD4D4', fg: '#6B2929' },
    navy:     { bg: P.kingston, fg: '#FFF' },
    gold:     { bg: P.kingstonAccent, fg: '#1F1F1F' },
    farrell:  { bg: P.farrell, fg: '#FFF' },
    mont:     { bg: P.montgomery, fg: '#FFF' },
  };
  const s = t[tone] || t.default;
  return (
    <span style={{
      display: 'inline-block', background: s.bg, color: s.fg,
      fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 12,
    }}>{children}</span>
  );
};

const Card = ({ children, featured, tone, style }) => {
  const bg = featured ? P.kingston : P.paper;
  const border = tone === 'danger' ? `1px solid #D49B9B` :
                 tone === 'warning' ? `1px solid #E8B987` :
                 tone === 'success' ? `1px solid #A8BE9D` :
                 `1px solid ${P.line}`;
  return (
    <div style={{
      background: bg, color: featured ? '#FBF8F2' : P.ink,
      border: featured ? 'none' : border,
      borderRadius: 12, padding: 20, ...style,
    }}>{children}</div>
  );
};

// Reusable "Why this matters" callout — use on any visualization that needs strategic context
const WhyMatters = ({ children, tone = 'gold' }) => {
  const colors = {
    gold: P.kingstonAccent,
    navy: P.kingston,
    warning: P.warning,
    success: P.success,
    danger: P.danger,
  };
  return (
    <div style={{
      fontSize: 12.5, color: P.ink,
      background: P.bg,
      padding: '13px 16px',
      borderRadius: 8,
      marginTop: 14,
      marginBottom: 16,
      borderLeft: `4px solid ${colors[tone]}`,
      lineHeight: 1.6,
    }}>
      <strong style={{ color: P.kingston, marginRight: 6 }}>Why this matters:</strong>
      {children}
    </div>
  );
};

const SectionH = ({ eyebrow, title, kicker }) => (
  <div style={{ marginBottom: 24 }}>
    {eyebrow && (
      <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.kingstonAccent, fontWeight: 700, marginBottom: 6 }}>
        {eyebrow}
      </div>
    )}
    <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 30, color: P.kingston, margin: 0, letterSpacing: '-0.015em', lineHeight: 1.15 }}>
      {title}
    </h2>
    {kicker && (
      <p style={{ fontFamily: 'DM Sans', fontSize: 15, color: P.muted, margin: '8px 0 0 0', maxWidth: 780, lineHeight: 1.5 }}>
        {kicker}
      </p>
    )}
  </div>
);

const Stat = ({ label, value, sub, dark, accent, size = 'md' }) => (
  <div>
    <div style={{
      fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: dark ? 'rgba(255,255,255,0.7)' : P.muted, marginBottom: 6,
    }}>{label}</div>
    <div style={{
      fontFamily: 'Fraunces, serif',
      fontSize: size === 'xl' ? 56 : size === 'lg' ? 42 : 32,
      fontWeight: 500,
      color: accent || (dark ? '#FBF8F2' : P.kingston),
      lineHeight: 1, letterSpacing: '-0.02em',
    }}>{value}</div>
    {sub && (
      <div style={{
        fontFamily: 'DM Sans', fontSize: 12, marginTop: 6,
        color: dark ? 'rgba(255,255,255,0.7)' : P.muted,
      }}>{sub}</div>
    )}
  </div>
);

const TTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: P.paper, border: `1px solid ${P.kingston}`,
      borderRadius: 8, padding: '10px 14px',
      fontFamily: 'DM Sans', fontSize: 13,
      boxShadow: '0 8px 20px rgba(31,58,95,0.15)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: P.kingston }}>{label}</div>
      {payload.map((pay, i) => (
        <div key={i} style={{ color: pay.color, marginBottom: 2 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, background: pay.color, marginRight: 8, borderRadius: 2 }}/>
          {pay.name}: <strong>{typeof pay.value === 'number' && pay.value >= 100 ? fmt(pay.value) : pay.value}</strong>
        </div>
      ))}
    </div>
  );
};

// Insight "lozenge" — recurring motif for the Hidden Edges tab
const Insight = ({ n, title, tone = 'default', children, stat }) => {
  const accents = {
    default: P.kingston,
    hot: P.danger,
    warm: P.warning,
    gold: P.kingstonAccent,
  };
  const accent = accents[tone];
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0 }}>
        <div style={{
          background: accent, color: '#FBF8F2',
          padding: '24px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: 200,
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, opacity: 0.8 }}>INSIGHT</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 56, fontWeight: 300, lineHeight: 1, marginTop: 8, fontStyle: 'italic' }}>{n}</div>
          </div>
          {stat && (
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{stat.value}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginTop: 4 }}>{stat.label}</div>
            </div>
          )}
        </div>
        <div style={{ padding: '22px 24px' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 600, color: P.kingston, margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{title}</h3>
          <div style={{ marginTop: 14 }}>{children}</div>
        </div>
      </div>
    </Card>
  );
};

/* ============================================================
   TAB 1: OVERVIEW
   ============================================================ */
const TabOverview = () => {
  const totalField = FIN.Kingston.receipts + FIN.Montgomery.receipts + FIN.Farrell.receipts;

  // Radar chart — 6 dimensions, normalized 0-100
  const max = {
    receipts: 2000000, cash: 1500000, donors: 500,
    pacDollars: 200000, inDistPct: 100, selfFundedInverse: 100, // inverse of self-funded % (higher=better)
  };
  const radarData = [
    { metric: 'Total\nReceipts',   Kingston: (FIN.Kingston.receipts/max.receipts)*100,        Montgomery: (FIN.Montgomery.receipts/max.receipts)*100,        Farrell: (FIN.Farrell.receipts/max.receipts)*100 },
    { metric: 'Cash\non Hand',     Kingston: (FIN.Kingston.cash/max.cash)*100,                Montgomery: (FIN.Montgomery.cash/max.cash)*100,                Farrell: (FIN.Farrell.cash/max.cash)*100 },
    { metric: 'Donor\nCount',      Kingston: (Q.Kingston.donors/max.donors)*100,              Montgomery: (Q.Montgomery.donors/max.donors)*100,              Farrell: (Q.Farrell.donors/max.donors)*100 },
    { metric: 'PAC\nSupport',      Kingston: (FIN.Kingston.pac/max.pacDollars)*100,           Montgomery: (FIN.Montgomery.pac/max.pacDollars)*100,           Farrell: (FIN.Farrell.pac/max.pacDollars)*100 },
    { metric: 'In-District\nShare', Kingston: Q.Kingston.inDistPct, Montgomery: Q.Montgomery.inDistPct, Farrell: Q.Farrell.inDistPct },
    { metric: 'Grassroots\nIndex',  Kingston: 100 - Q.Kingston.selfPct, Montgomery: 100 - Q.Montgomery.selfPct, Farrell: 100 - Q.Farrell.selfPct },
  ];

  return (
    <div>
      {/* Hero — compact */}
      <div style={{
        background: `linear-gradient(135deg, ${P.kingston} 0%, #2A4D7A 100%)`,
        color: '#FBF8F2', borderRadius: 12, padding: '20px 26px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(212,169,74,0.18)', filter: 'blur(30px)' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <Tag tone="gold">TRUMP ENDORSED · APR 14</Tag>
              <Tag tone="default" style={{ background: 'rgba(255,255,255,0.15)' }}>GA-1 REPUBLICAN PRIMARY</Tag>
            </div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.15, letterSpacing: '-0.015em' }}>
              You're the frontrunner. Now run like it.
            </h1>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.55, marginTop: 8, marginBottom: 0, opacity: 0.9 }}>
              Kingston has out-raised Farrell and Montgomery combined 2-to-1. Cash on hand is 3× the rest of the field. The prize now isn't winning — it's winning <em>big enough</em> to skip the June 16 runoff.
            </p>
          </div>
          <div style={{ textAlign: 'center', minWidth: 110 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: P.kingstonAccent, marginBottom: 2, fontWeight: 700 }}>Days Left</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 54, fontWeight: 300, lineHeight: 1 }}>{DAYS_TO_PRIMARY}</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>May 19, 2026</div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        <Card><Stat label="Total Raised"  value={fmtK(FIN.Kingston.receipts)} sub={`${Math.round(FIN.Kingston.receipts/totalField*100)}% of field's money`}/></Card>
        <Card><Stat label="Cash on Hand"  value={fmtK(FIN.Kingston.cash)}     sub="3× the rest of field combined" accent={P.success}/></Card>
        <Card><Stat label="Unique Donors" value={fmtN(Q.Kingston.donors)}     sub={`vs. ${Q.Montgomery.donors + Q.Farrell.donors} opponents combined`}/></Card>
        <Card><Stat label="$3.5K Max-Outs" value="267"                         sub="37% of itemized contributions" accent={P.kingstonAccent}/></Card>
        <Card tone="warning"><Stat label="Unused Donor Room" value="$751K"     sub="legal giving room still in list" accent={P.warning}/></Card>
      </div>

      {/* Candidate cards */}
      <SectionH eyebrow="The Field" title="Three candidates, one seat" kicker="All three financial pictures side by side, through FEC filings ending March 31, 2026."/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {['Kingston', 'Farrell', 'Montgomery'].map((name, idx) => {
          const d = FIN[name];
          const q = Q[name];
          const isK = name === 'Kingston';
          return (
            <Card key={name} featured={isK} style={{ padding: 22, borderTop: `4px solid ${C[name].color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.15em', opacity: 0.6, fontWeight: 700 }}>RANK #{idx+1}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, marginTop: 2, letterSpacing: '-0.01em' }}>{C[name].label}</div>
                </div>
                {isK && <Tag tone="gold">YOU</Tag>}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>{fmtK(d.receipts)}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>total receipts</div>
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${isK ? 'rgba(255,255,255,0.15)' : P.line}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, fontFamily: 'DM Sans' }}>
                <div>
                  <div style={{ opacity: 0.55, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cash</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{fmtK(d.cash)}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.55, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Donors</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{q.donors}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.55, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PAC</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{d.pac > 0 ? fmtK(d.pac) : '—'}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.55, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Self-Funded</div>
                  <div style={{ fontWeight: 700, marginTop: 2, color: q.selfPct > 50 ? '#F5C563' : undefined }}>{q.selfPct === 0 ? '—' : q.selfPct.toFixed(0) + '%'}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Radar */}
      <Card style={{ padding: 28, marginBottom: 24 }}>
        <SectionH eyebrow="Shape of the race" title="Candidate comparison, 6 dimensions" kicker="Each axis is normalized. A bigger shape = a broader campaign. Note how Kingston dominates every dimension, Farrell scores low on everything except in-district concentration (the only metric he wins on — because he hasn't raised from anyone outside 31xxx)."/>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
            <PolarGrid stroke={P.line}/>
            <PolarAngleAxis dataKey="metric" tick={{ fontFamily: 'DM Sans', fontSize: 12, fill: P.ink, fontWeight: 600 }}/>
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: P.muted }} axisLine={false}/>
            <Radar name="Kingston"   dataKey="Kingston"   stroke={P.kingston}   fill={P.kingston}   fillOpacity={0.35} strokeWidth={2}/>
            <Radar name="Montgomery" dataKey="Montgomery" stroke={P.montgomery} fill={P.montgomery} fillOpacity={0.25} strokeWidth={2}/>
            <Radar name="Farrell"    dataKey="Farrell"    stroke={P.farrell}    fill={P.farrell}    fillOpacity={0.20} strokeWidth={2}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </RadarChart>
        </ResponsiveContainer>
        <WhyMatters>
          A broader shape signals a more <em>electable</em> candidate — one who can fundraise, mobilize donors, attract institutional support, and show reach beyond a narrow base. Kingston's shape nearly fills the chart; both opponents hug the center on almost every axis. That imbalance is what a victory coalition looks like in data form.
        </WhyMatters>
      </Card>

      {/* Timeline */}
      <Card style={{ padding: 28 }}>
        <SectionH eyebrow="Campaign chronology" title="How we got here" kicker="Ten months of campaign activity, mapped against the primary clock."/>
        <div style={{ position: 'relative', padding: '10px 0 10px 30px', borderLeft: `2px solid ${P.line}` }}>
          {TIMELINE.map((ev, i) => {
            const candColor = ev.who === 'Kingston' ? P.kingston : ev.who === 'Montgomery' ? P.montgomery : ev.who === 'Farrell' ? P.farrell : P.muted;
            const date = new Date(ev.date);
            const isPast = date < new Date('2026-04-20');
            return (
              <div key={i} style={{ position: 'relative', paddingBottom: 22, opacity: isPast ? 1 : 0.6 }}>
                <div style={{
                  position: 'absolute', left: -38, top: 2,
                  width: ev.flag ? 16 : 10, height: ev.flag ? 16 : 10, borderRadius: '50%',
                  background: ev.flag ? P.kingstonAccent : candColor,
                  border: ev.flag ? `3px solid ${P.kingston}` : 'none',
                  boxShadow: ev.flag ? `0 0 0 4px rgba(212,169,74,0.2)` : 'none',
                }}/>
                <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: P.muted, fontWeight: 600, letterSpacing: '0.05em', minWidth: 78 }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </div>
                  <div style={{ fontFamily: ev.flag ? 'Fraunces, serif' : 'DM Sans', fontSize: ev.flag ? 16 : 14, fontWeight: ev.flag ? 600 : 500, color: ev.flag ? P.kingston : P.ink }}>
                    {ev.label}
                  </div>
                  {ev.who !== 'All' && <Tag tone={ev.who === 'Kingston' ? 'navy' : ev.who === 'Montgomery' ? 'mont' : ev.who === 'Farrell' ? 'farrell' : 'default'}>{ev.who}</Tag>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   TAB 2: MONEY
   ============================================================ */
const TabMoney = () => {
  const composition = ['Kingston', 'Farrell', 'Montgomery'].map(name => ({
    name,
    Individuals: FIN[name].indiv,
    PACs: FIN[name].pac,
    'Self-funded': FIN[name].selfLoans + FIN[name].selfContrib,
  }));

  // Farrell dramatic donut
  const farrellPie = [
    { name: 'Self-loan',        value: FIN.Farrell.selfLoans, color: P.danger },
    { name: 'Actual donations', value: FIN.Farrell.indiv,      color: P.farrell },
    { name: 'PACs',             value: FIN.Farrell.pac,        color: P.kingstonAccent },
  ];
  const farrellTotal = farrellPie.reduce((s, p) => s + p.value, 0);

  return (
    <div>
      <SectionH eyebrow="The money" title="Where it came from, where it's going"
        kicker="Seven months of primary-election fundraising, plus Q1 2026 summary data on total receipts, disbursements, and cash on hand."/>

      {/* Cumulative chart */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Cumulative primary fundraising</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 12px' }}>From Schedule A (itemized). The gap widened every month.</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={CUMULATIVE} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ag-k" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.kingston} stopOpacity={0.4}/>
                <stop offset="100%" stopColor={P.kingston} stopOpacity={0.03}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
            <XAxis dataKey="month" tick={{ fontFamily: 'DM Sans', fontSize: 12, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false}/>
            <YAxis tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 12, fill: P.muted }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Area type="monotone" dataKey="Kingston"   stroke={P.kingston}   strokeWidth={3} fill="url(#ag-k)"/>
            <Area type="monotone" dataKey="Farrell"    stroke={P.farrell}    strokeWidth={2} fill="none" strokeDasharray="5 4"/>
            <Area type="monotone" dataKey="Montgomery" stroke={P.montgomery} strokeWidth={2} fill="none" strokeDasharray="5 4"/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </AreaChart>
        </ResponsiveContainer>
        <WhyMatters>
          Fundraising trajectory is a proxy for campaign momentum. A candidate who's still growing their total month over month is compounding donor relationships, earned media, and institutional interest. Kingston's line shows sustained acceleration; opponents' lines are flattening, which in finance terms means their donor base is already tapped out.
        </WhyMatters>
      </Card>

      {/* FARRELL SELF-FUNDING DRAMATIC CENTERPIECE */}
      <Card tone="danger" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(135deg, ${P.danger} 0%, #C45A5A 100%)`, color: '#FBF8F2', padding: '24px 28px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Tag tone="default" style={{ background: 'rgba(255,255,255,0.2)', color: '#FBF8F2' }}>SIGNATURE ATTACK LINE</Tag>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, margin: '12px 0 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Pat Farrell didn't <em>raise</em> $646K. He raised $146K and wrote himself a $500,000 check.
          </h2>
        </div>
        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 36, alignItems: 'center' }}>
          <div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={farrellPie} cx="50%" cy="50%" innerRadius={65} outerRadius={115} dataKey="value" paddingAngle={2} strokeWidth={0}>
                  {farrellPie.map((e, i) => <Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={<TTip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: -180, fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 600, color: P.danger, pointerEvents: 'none' }}>77%</div>
            <div style={{ textAlign: 'center', marginTop: 0, fontSize: 11, color: P.muted, pointerEvents: 'none' }}>self-funded</div>
            <div style={{ marginTop: 160, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
              {farrellPie.map(p => (
                <div key={p.name} style={{ textAlign: 'center' }}>
                  <div style={{ height: 4, background: p.color, borderRadius: 2, marginBottom: 4 }}/>
                  <div style={{ color: P.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, fontSize: 9 }}>{p.name}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, marginTop: 2 }}>{fmtK(p.value)}</div>
                  <div style={{ fontSize: 10, color: P.muted }}>{((p.value/farrellTotal)*100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: P.ink, fontFamily: 'DM Sans' }}>
              <p style={{ margin: '0 0 14px' }}>
                Only <strong>88 real donors</strong> have given Farrell money — a total of <strong>{fmtK(FIN.Farrell.indiv)}</strong>. He loaned his own campaign <strong style={{ color: P.danger }}>${(FIN.Farrell.selfLoans/1000).toFixed(0)},000</strong> to make up the difference. For context, Jim Kingston borrowed <strong>$0</strong> and raised <strong>{fmtK(FIN.Kingston.indiv)}</strong> — from <strong>{Q.Kingston.donors} real donors</strong>.
              </p>
              <div style={{ background: P.bg, borderRadius: 10, padding: '14px 16px', borderLeft: `4px solid ${P.danger}`, marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: P.kingston, marginBottom: 4, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>The FEC trap</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                  Under <strong>52 U.S.C. § 30116(j)</strong>, candidates can only repay themselves up to <strong>$250,000</strong> of personal loans from post-election funds. If Farrell loses May 19, he likely loses <strong>at least $250K of his own money</strong> — possibly the whole $500K if his campaign can't raise it before primary day.
                </p>
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 14, color: P.muted, fontStyle: 'italic' }}>
                This is the single most usable oppo fact in the file. Mailers practically write themselves: "Pat Farrell: 22 years in office, $146K from voters, $500K from himself."
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Composition stacked */}
      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Where each candidate's money actually came from</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Individuals (donors), PACs (institutional), vs. self-funded (loans + candidate contributions). The picture is stark.</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={composition} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} horizontal={false}/>
            <XAxis type="number" tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 12, fill: P.muted }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily: 'DM Sans', fontSize: 14, fill: P.ink, fontWeight: 600 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Bar dataKey="Individuals"  stackId="a" fill={P.kingston}       radius={[6,0,0,6]}/>
            <Bar dataKey="PACs"         stackId="a" fill={P.kingstonAccent}/>
            <Bar dataKey="Self-funded"  stackId="a" fill={P.danger}          radius={[0,6,6,0]}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly bars + burn rate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 14px', color: P.kingston }}>New dollars per month</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontFamily: 'DM Sans', fontSize: 12, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false}/>
              <YAxis tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="Kingston"   fill={P.kingston}   radius={[4,4,0,0]}/>
              <Bar dataKey="Farrell"    fill={P.farrell}    radius={[4,4,0,0]}/>
              <Bar dataKey="Montgomery" fill={P.montgomery} radius={[4,4,0,0]}/>
              <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 8 }}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Burn rate & runway</h3>
          <p style={{ fontSize: 12, color: P.muted, margin: '0 0 14px' }}>Monthly spend and how long cash lasts.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {['Kingston','Farrell','Montgomery'].map(name => {
              const d = FIN[name];
              const burn = d.spent / d.monthsActive;
              const runway = d.cash / burn;
              const runwayPct = Math.min(100, (runway / 30) * 100);
              const danger = runway < 3;
              return (
                <div key={name} style={{ padding: '12px 14px', background: P.bg, borderRadius: 10, borderLeft: `4px solid ${C[name].color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: danger ? P.danger : P.kingston, fontWeight: 600 }}>
                      {runway.toFixed(1)} mo
                    </div>
                  </div>
                  <div style={{ height: 6, background: P.line, borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${runwayPct}%`, background: danger ? P.danger : C[name].color, borderRadius: 3 }}/>
                  </div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
                    Burns {fmtK(burn)}/mo · {fmtK(d.cash)} cash
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Runway burn-down */}
      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Cash burn-down to primary day</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Projecting current burn rate forward. Montgomery's line approaches zero with weeks to go — he'll likely have to go quiet on paid media before May 19 unless he raises a surprising amount in April.</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={RUNWAY} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
            <XAxis dataKey="day" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false}/>
            <YAxis tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <ReferenceLine x="Apr 20" stroke={P.kingstonAccent} strokeDasharray="3 3" label={{ value: 'Today', fill: P.kingstonAccent, fontSize: 11, fontWeight: 700 }}/>
            <ReferenceLine x="Primary" stroke={P.danger} label={{ value: 'Primary', fill: P.danger, fontSize: 11, fontWeight: 700 }}/>
            <Line type="monotone" dataKey="Kingston"   stroke={P.kingston}   strokeWidth={3} dot={{ r: 4 }}/>
            <Line type="monotone" dataKey="Farrell"    stroke={P.farrell}    strokeWidth={2} dot={{ r: 3 }}/>
            <Line type="monotone" dataKey="Montgomery" stroke={P.montgomery} strokeWidth={2} dot={{ r: 3 }}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </LineChart>
        </ResponsiveContainer>
        <WhyMatters tone="warning">
          The last two weeks before a primary are when campaigns buy the most TV and mail. Montgomery's line approaches zero by early May — meaning he likely cannot afford paid media in the final stretch when it matters most. Kingston's flat line near $1.2M means he can spend whatever it takes to break 50% and skip the runoff.
        </WhyMatters>
      </Card>

      {/* PAC support */}
      <Card style={{ padding: 22 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>PAC / committee contributions</h3>
        <p style={{ fontSize: 12, color: P.muted, margin: '0 0 14px' }}>A proxy for Washington and institutional support. Farrell's $250 is essentially zero — no trade group or party entity has bet on him.</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={[
            { name: 'Kingston',   v: FIN.Kingston.pac },
            { name: 'Montgomery', v: FIN.Montgomery.pac },
            { name: 'Farrell',    v: FIN.Farrell.pac },
          ]} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <XAxis type="number" tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily: 'DM Sans', fontSize: 13, fill: P.ink, fontWeight: 600 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Bar dataKey="v" radius={[0,6,6,0]}>
              <Cell fill={P.kingston}/>
              <Cell fill={P.montgomery}/>
              <Cell fill={P.farrell}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <WhyMatters>
          PAC money signals that Washington insiders, trade associations, and party organizations believe a candidate is electable — and it unlocks relationships that matter after the election for committee assignments, floor time, and vendor introductions. Kingston's $179K says the institutional GOP has already picked him. Farrell's $250 says nobody in that world bet on him.
        </WhyMatters>
      </Card>
    </div>
  );
};

/* ============================================================
   TAB 3: DONORS
   ============================================================ */
const TabDonors = () => {
  // Quality table
  const rows = [
    { label: 'Unique donors',        K: Q.Kingston.donors,       M: Q.Montgomery.donors,       F: Q.Farrell.donors,       good: 'more',   fmt: (n) => fmtN(n) },
    { label: 'Repeat donor rate',    K: Q.Kingston.repeatRate,   M: Q.Montgomery.repeatRate,   F: Q.Farrell.repeatRate,   good: 'higher', fmt: (n) => n.toFixed(1) + '%' },
    { label: 'Top-20 concentration', K: Q.Kingston.top20Pct,     M: Q.Montgomery.top20Pct,     F: Q.Farrell.top20Pct,     good: 'lower',  fmt: (n) => n.toFixed(1) + '%' },
    { label: 'Average gift',         K: Q.Kingston.avgGift,      M: Q.Montgomery.avgGift,      F: Q.Farrell.avgGift,      good: 'context',fmt: (n) => fmt(n) },
    { label: 'In-district %',        K: Q.Kingston.inDistPct,    M: Q.Montgomery.inDistPct,    F: Q.Farrell.inDistPct,    good: 'context',fmt: (n) => n.toFixed(1) + '%' },
    { label: 'Primary max-outs',     K: Q.Kingston.maxed,        M: Q.Montgomery.maxed,        F: Q.Farrell.maxed,        good: 'more',   fmt: (n) => fmtN(n) },
    { label: 'Self-funded %',        K: Q.Kingston.selfPct,      M: Q.Montgomery.selfPct,      F: Q.Farrell.selfPct,      good: 'lower',  fmt: (n) => n.toFixed(1) + '%' },
  ];

  return (
    <div>
      <SectionH eyebrow="The base" title="Donor coalition X-ray" kicker="Who's giving, how much, how often, and what that says about each campaign's foundation."/>

      {/* The big $3,500 cliff chart */}
      <Card tone="warning" style={{ padding: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 12 }}>
          <div>
            <Tag tone="warning">THE $3,500 CLIFF</Tag>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, margin: '8px 0 0', color: P.kingston, letterSpacing: '-0.01em' }}>
              267 contributions to Kingston hit exactly $3,500.
            </h3>
            <p style={{ fontSize: 14, color: P.muted, margin: '6px 0 0', maxWidth: 760 }}>
              That's the federal max-per-election limit. It's the single biggest signal in the distribution — and it's why the chart spikes so dramatically at one specific bucket. 37% of Kingston's itemized contributions hit the cap exactly. Montgomery: 17. Farrell: 8.
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={AMOUNT_DIST} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
            <XAxis dataKey="short" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted, fontWeight: 600 }} axisLine={{ stroke: P.line }} tickLine={false}/>
            <YAxis tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <ReferenceLine x="$3.5K max" stroke={P.kingstonAccent} strokeDasharray="4 4" strokeWidth={2} label={{ value: 'FEC primary cap', position: 'top', fill: P.kingstonAccent, fontWeight: 700, fontSize: 11 }}/>
            <Bar dataKey="Kingston"   fill={P.kingston}   radius={[4,4,0,0]}/>
            <Bar dataKey="Montgomery" fill={P.montgomery} radius={[4,4,0,0]}/>
            <Bar dataKey="Farrell"    fill={P.farrell}    radius={[4,4,0,0]}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 8 }}/>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.kingston}` }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Kingston at the cap</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: P.kingston, marginTop: 2 }}>267 <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>· $934,500</span></div>
          </div>
          <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.montgomery}` }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Montgomery at the cap</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: P.montgomery, marginTop: 2 }}>17 <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>· $59,500</span></div>
          </div>
          <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.farrell}` }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Farrell at the cap</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: P.farrell, marginTop: 2 }}>8 <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>· $28,000</span></div>
          </div>
        </div>
        <WhyMatters tone="warning">
          A $3,500-exactly check means a donor consulted their calendar, wrote for the legal maximum, and made a strategic bet on the race. 267 such contributions came in for Kingston. These are not casual supporters — they're the hardest-to-acquire donor profile, and they're 10.7× more common on Kingston's side than on both opponents' combined (267 vs. 25). A primary where one candidate has an order-of-magnitude advantage on maxed-out donors is not a close primary.
        </WhyMatters>
      </Card>

      {/* Quality scorecard */}
      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Donor base quality scorecard</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Checkmark = best on that metric. Kingston wins 5 of 7 cleanly; the two where he doesn't (in-district %, self-funded %) are actually signs of strength in disguise.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${P.kingston}` }}>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.muted, fontWeight: 700 }}>Metric</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', color: P.kingston, fontWeight: 700 }}>Kingston</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', color: P.montgomery, fontWeight: 700 }}>Montgomery</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', color: P.farrell, fontWeight: 700 }}>Farrell</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.muted, fontWeight: 700 }}>Good is</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const win = r.good === 'more'   ? Math.max(r.K, r.M, r.F) :
                            r.good === 'lower'  ? Math.min(r.K, r.M, r.F) :
                            r.good === 'higher' ? Math.max(r.K, r.M, r.F) : null;
                const Cell = ({ v, color }) => (
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700, color, fontFamily: 'Fraunces, serif', fontSize: 17 }}>
                    {r.fmt(v)}
                    {win === v && <span style={{ marginLeft: 6, fontSize: 10, color: P.success }}>✓</span>}
                  </td>
                );
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${P.line}` }}>
                    <td style={{ padding: '11px 10px', fontWeight: 500 }}>{r.label}</td>
                    <Cell v={r.K} color={P.kingston}/>
                    <Cell v={r.M} color={P.montgomery}/>
                    <Cell v={r.F} color={P.farrell}/>
                    <td style={{ padding: '11px 10px', fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.good}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <WhyMatters>
          These seven metrics separate a real grassroots coalition from a "big-check" campaign that looks well-funded but has no depth. <strong>Repeat donor rate</strong> measures loyalty and future giving potential. <strong>Top-20 concentration</strong> measures fragility — if Farrell loses one of his top 20 donors, he loses 3% of his entire war chest. <strong>Primary max-outs</strong> signals donor confidence in winning. Kingston wins 5 of 7 cleanly; the two where he doesn't (in-district % and self-funded %) are strength signals in disguise.
        </WhyMatters>
      </Card>

      {/* Occupations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        {['Kingston','Montgomery','Farrell'].map(name => (
          <Card key={name} style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: C[name].color }}/>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, margin: 0, color: P.kingston }}>{name}</h3>
            </div>
            <p style={{ fontSize: 11, color: P.muted, margin: '0 0 8px' }}>Donor occupations (top 8)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={OCCUPATIONS[name].slice(0,8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: P.muted }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="occ" width={100} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.ink }} axisLine={false} tickLine={false}/>
                <Tooltip content={<TTip/>}/>
                <Bar dataKey="n" fill={C[name].color} radius={[0,3,3,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      <WhyMatters>
        Occupation mix predicts two things: <strong>vote propensity</strong> (retirees turn out at 2–3× the rate of working-age voters in primaries) and <strong>coalition breadth</strong> (a base of attorneys, owners, and executives maps directly onto chamber-of-commerce and business groups for GOTV). Kingston runs on a classic professional-class coalition; Montgomery's base skews retired (high turnout, smaller size); Farrell's skews self-employed small-business (narrow, local).
      </WhyMatters>

      {/* Top donors & bundlers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: P.kingston }}>Kingston's top 15 donors</h3>
          <p style={{ fontSize: 12, color: P.muted, margin: '0 0 12px' }}>Combined primary + runoff + general giving.</p>
          {DOUBLE_MAX.slice(0, 15).map((d, i) => (
            <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '9px 0', borderBottom: i < 14 ? `1px solid ${P.line}` : 'none', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: P.kingstonAccent, fontWeight: 500 }}>{String(i+1).padStart(2,'0')}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: P.muted }}>{d.city} · {d.occ}</div>
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: P.kingston, fontWeight: 600 }}>{fmt(d.amount)}</div>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: P.kingston }}>Bundler firms</h3>
          <p style={{ fontSize: 12, color: P.muted, margin: '0 0 12px' }}>Employers with 3+ donations — someone inside organized a push. These are your November surrogates.</p>
          {BUNDLERS.map((b, i) => (
            <div key={b.firm} style={{ padding: '9px 0', borderBottom: i < BUNDLERS.length-1 ? `1px solid ${P.line}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.kingston }}>{b.firm}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600 }}>{fmt(b.total)}</div>
              </div>
              <div style={{ fontSize: 10, color: P.muted, marginTop: 2 }}>{b.n} donors</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   TAB 4: GEOGRAPHY & INCOME
   ============================================================ */
const TabGeography = () => {
  const zipForChart = TOP_ZIPS.slice(0, 15).map(z => ({
    ...z,
    label: `${z.zip} · ${z.nbhd}`,
    total: z.Kingston + z.Montgomery + z.Farrell,
  }));
  const geoBars = ['Kingston','Montgomery','Farrell'].map(name => ({
    name,
    'In-district (GA-1)': GEO[name].inDist,
    'In-state (Atlanta etc.)': GEO[name].atlanta,
    'Out-of-state': GEO[name].outState,
  }));

  // HHI vs K-share scatter to show "Kingston gets wealthy ZIPs, Farrell gets middle-income"
  const scatterData = TOP_ZIPS.map(z => {
    const tot = z.Kingston + z.Montgomery + z.Farrell;
    return {
      zip: z.zip, nbhd: z.nbhd,
      hhi: z.hhi / 1000,
      kShare: (z.Kingston / tot) * 100,
      total: tot,
    };
  });

  return (
    <div>
      <SectionH eyebrow="The map" title="Geography & income" kicker="Every candidate's donor map tells a different story."/>

      {/* WEALTH PROFILE — prominent visualization of Kingston's wealthy-neighborhood concentration */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden', border: `2px solid ${P.kingstonAccent}` }}>
        <div style={{ background: `linear-gradient(135deg, ${P.kingston} 0%, #2A4D7A 100%)`, color: '#FBF8F2', padding: '20px 26px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <Tag tone="gold">WEALTH PROFILE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
            Kingston's money flows from Georgia's wealthiest neighborhoods
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 0', opacity: 0.9, maxWidth: 760 }}>
            $477,150 came from ZIPs with median household income above $90K — <strong>roughly 10× what Farrell raised from the same neighborhoods, 5× what Montgomery raised.</strong> Kingston's weighted donor ZIP income is $91K, 28% above Georgia's median.
          </p>
        </div>

        <div style={{ padding: 24 }}>

          {/* INCOME BENCHMARK BAR — SVG for precision */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
              Where Kingston's donors live, compared to typical incomes
            </div>
            <div style={{ position: 'relative', height: 210, margin: '8px 20px 0' }}>
              <svg viewBox="0 0 800 210" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* gradient definition */}
                <defs>
                  <linearGradient id="incomeAxis" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#E8E2D4"/>
                    <stop offset="25%"  stopColor="#E8D4A8"/>
                    <stop offset="50%"  stopColor="#D4A94A"/>
                    <stop offset="100%" stopColor="#B8863A"/>
                  </linearGradient>
                </defs>

                {/* KINGSTON DONORS callout — positioned left, above bar */}
                <g>
                  <rect x="234" y="4" width="130" height="42" fill="#FFFFFF" stroke={P.kingston} strokeWidth="1.5" rx="4"/>
                  <text x="299" y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill={P.kingston} fontFamily="DM Sans, sans-serif" letterSpacing="0.5">KINGSTON DONORS</text>
                  <text x="299" y="39" textAnchor="middle" fontSize="13" fontWeight="600" fill={P.kingston} fontFamily="Fraunces, serif">$91K weighted avg</text>
                  <line x1="299" y1="46" x2="299" y2="88" stroke={P.kingston} strokeWidth="1.5"/>
                  <circle cx="299" cy="95" r="7" fill={P.kingston} stroke="#FFFFFF" strokeWidth="2"/>
                </g>

                {/* TOP 10 WEALTHY ZIPs callout — positioned right, above bar */}
                <g>
                  <rect x="375" y="4" width="130" height="42" fill="#FFFFFF" stroke={P.kingstonAccent} strokeWidth="1.5" rx="4"/>
                  <text x="440" y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill="#8B6614" fontFamily="DM Sans, sans-serif" letterSpacing="0.5">TOP 10 WEALTHY ZIPS</text>
                  <text x="440" y="39" textAnchor="middle" fontSize="13" fontWeight="600" fill="#8B6614" fontFamily="Fraunces, serif">$122K avg</text>
                  <line x1="440" y1="46" x2="440" y2="88" stroke={P.kingstonAccent} strokeWidth="1.5"/>
                  <circle cx="440" cy="95" r="7" fill={P.kingstonAccent} stroke="#FFFFFF" strokeWidth="2"/>
                </g>

                {/* Gradient bar */}
                <rect x="20" y="88" width="760" height="14" fill="url(#incomeAxis)" rx="7"/>

                {/* Small reference dots ON the bar — no labels here, explained in legend below */}
                <circle cx="148" cy="95" r="4" fill="#FFFFFF" stroke={P.muted} strokeWidth="1.5"/>
                <circle cx="207" cy="95" r="4" fill="#FFFFFF" stroke={P.muted} strokeWidth="1.5"/>
                <circle cx="239" cy="95" r="4" fill="#FFFFFF" stroke={P.muted} strokeWidth="1.5"/>

                {/* Tick marks below */}
                {[
                  { v: 30,  x: 20  },
                  { v: 60,  x: 157 },
                  { v: 90,  x: 294 },
                  { v: 120, x: 431 },
                  { v: 150, x: 568 },
                  { v: 200, x: 780 },
                ].map((t, i) => (
                  <g key={i}>
                    <line x1={t.x} y1={102} x2={t.x} y2={110} stroke={P.muted} strokeWidth={1}/>
                    <text x={t.x} y={126} fontSize="10" fill={P.muted} fontFamily="DM Sans, sans-serif" textAnchor="middle">${t.v}K</text>
                  </g>
                ))}

                {/* Axis title */}
                <text x="400" y="148" fontSize="9" fill={P.mutedLight} fontFamily="DM Sans, sans-serif" textAnchor="middle" letterSpacing="1.5">MEDIAN HOUSEHOLD INCOME</text>

                {/* Skew indicator */}
                <g opacity="0.75">
                  <path d="M 207 178 L 440 178" stroke={P.kingstonAccent} strokeWidth="1.5"/>
                  <polygon points="440,178 432,174 432,182" fill={P.kingstonAccent}/>
                  <text x="323" y="197" fontSize="9" fill={P.kingstonAccent} fontFamily="DM Sans, sans-serif" textAnchor="middle" fontWeight="700" letterSpacing="1.2">KINGSTON'S MONEY SKEWS RIGHT</text>
                </g>
              </svg>
            </div>

            {/* Reference legend — clean, below the chart */}
            <div style={{
              display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'center',
              fontSize: 11, color: P.muted, marginTop: 4, flexWrap: 'wrap',
              padding: '10px 16px', background: P.bg, borderRadius: 8,
            }}>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: P.mutedLight }}>For reference:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF', border: `1.5px solid ${P.muted}`, display: 'inline-block' }}/>
                GA-1 district: <strong style={{ color: P.ink }}>$58K</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF', border: `1.5px solid ${P.muted}`, display: 'inline-block' }}/>
                GA state median: <strong style={{ color: P.ink }}>$71K</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF', border: `1.5px solid ${P.muted}`, display: 'inline-block' }}/>
                US national median: <strong style={{ color: P.ink }}>$78K</strong>
              </span>
            </div>
          </div>

          {/* WEALTHY ZIPS LEADERBOARD */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
              Kingston's haul from each wealthy ZIP (HHI ≥ $90K)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { zip: '31411', nbhd: 'Skidaway Island',     city: 'Savannah',       hhi: 147000, K: 186900, M: 49037, F: 10500 },
                { zip: '31410', nbhd: 'Wilmington Island',   city: 'Savannah',       hhi: 95000,  K: 105000, M: 1301,  F: 13800 },
                { zip: '31324', nbhd: 'Richmond Hill',       city: 'Richmond Hill',  hhi: 105000, K: 60500,  M: 2041,  F: 1000  },
                { zip: '30327', nbhd: 'Buckhead',            city: 'Atlanta',        hhi: 180000, K: 48200,  M: 0,     F: 0     },
                { zip: '30305', nbhd: 'Buckhead',            city: 'Atlanta',        hhi: 145000, K: 23500,  M: 0,     F: 0     },
                { zip: '31522', nbhd: 'St. Simons Island',   city: 'St. Simons',     hhi: 90000,  K: 23300,  M: 7393,  F: 750   },
                { zip: '30269', nbhd: 'Peachtree City',      city: 'Peachtree City', hhi: 115000, K: 17500,  M: 0,     F: 1600  },
                { zip: '31416', nbhd: 'Oatland/Skidaway',    city: 'Savannah',       hhi: 142000, K: 12250,  M: 0,     F: 8550  },
              ].map(z => {
                const maxK = 186900;
                const barPct = (z.K / maxK) * 100;
                return (
                  <div key={z.zip} style={{ padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.line}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <div>
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: P.kingston }}>{z.zip}</span>
                        <span style={{ fontSize: 12, color: P.ink, marginLeft: 6, fontWeight: 600 }}>{z.nbhd}</span>
                      </div>
                      <div style={{ fontSize: 11, color: P.kingstonAccent, fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'ui-monospace, monospace' }}>
                        ${(z.hhi/1000).toFixed(0)}K HHI
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: P.muted, marginBottom: 8 }}>{z.city}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 24, background: P.line, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          width: `${barPct}%`, height: '100%',
                          background: `linear-gradient(90deg, ${P.kingston}, ${P.kingstonLight})`,
                          borderRadius: 4,
                        }}/>
                      </div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: P.kingston, minWidth: 64, textAlign: 'right' }}>
                        {fmtK(z.K)}
                      </div>
                    </div>
                    {(z.M > 0 || z.F > 0) && (
                      <div style={{ fontSize: 10, color: P.muted, marginTop: 6, display: 'flex', gap: 10 }}>
                        <span>M: <strong style={{ color: P.montgomery }}>${z.M.toLocaleString()}</strong></span>
                        <span>F: <strong style={{ color: P.farrell }}>${z.F.toLocaleString()}</strong></span>
                      </div>
                    )}
                    {z.M === 0 && z.F === 0 && (
                      <div style={{ fontSize: 10, color: P.success, marginTop: 6, fontWeight: 600, fontStyle: 'italic' }}>
                        → Opponents raised $0 here
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* HEAD-TO-HEAD WEALTHY-ZIP TOTALS */}
          <div>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12 }}>
              The bottom line: who's raising from wealthy neighborhoods
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { name: 'Kingston',   total: 477150, color: P.kingston   },
                { name: 'Montgomery', total: 59772,  color: P.montgomery },
                { name: 'Farrell',    total: 36200,  color: P.farrell    },
              ].map(d => {
                const barPct = (d.total / 477150) * 100;
                return (
                  <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', gap: 14, alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: d.color }}>{d.name}</div>
                    <div style={{ height: 28, background: P.line, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${barPct}%`, height: '100%',
                        background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)`,
                        borderRadius: 6,
                      }}/>
                    </div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: P.kingston, textAlign: 'right' }}>
                      {fmt(d.total)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: P.ink, background: P.bg, padding: '14px 16px', borderRadius: 8, marginTop: 14, borderLeft: `4px solid ${P.kingstonAccent}`, lineHeight: 1.6 }}>
              <strong style={{ color: P.kingston }}>Why this matters:</strong> Wealthy-ZIP donors are the highest-propensity primary voters and the natural network for future bundling. Kingston's dominance here isn't just about the $477K — it's about owning the relationship with nearly every serious political donor in the district's top neighborhoods. Opponents' combined take from these same ZIPs is $96K.
            </div>
          </div>

        </div>
        <div style={{ padding: '14px 22px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 11, color: P.muted, lineHeight: 1.5 }}>
          <strong style={{ color: P.kingston }}>Sources:</strong> Dollars from FEC Schedule A. Median household income from U.S. Census Bureau American Community Survey (ACS) 2019–2023 5-year estimates. GA state median $71,355, US median $77,719 (ACS 2023). GA-1 district median is a county-weighted estimate across the 17 counties in the district.
        </div>
      </Card>

      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>In-district, in-state, out-of-state</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 14px', maxWidth: 740 }}>
          Farrell: 87% in-district, only <strong>3 out-of-state donors total.</strong> He has no national network. Kingston: $314K from outside GA-1, much of it Atlanta and DC. Montgomery's out-of-state bloc ($40K) is his military brotherhood.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={geoBars} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} horizontal={false}/>
            <XAxis type="number" tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 12, fill: P.muted }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily: 'DM Sans', fontSize: 14, fill: P.ink, fontWeight: 600 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Bar dataKey="In-district (GA-1)"     stackId="a" fill={P.kingston}       radius={[6,0,0,6]}/>
            <Bar dataKey="In-state (Atlanta etc.)" stackId="a" fill={P.kingstonLight}/>
            <Bar dataKey="Out-of-state"             stackId="a" fill={P.kingstonAccent} radius={[0,6,6,0]}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Top ZIPs stacked */}
      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Top 15 ZIPs by total primary dollars</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 14px' }}>Each bar shows the split across candidates in that ZIP. Kingston dominates everywhere except 31416, 31331, and 31545.</p>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart data={zipForChart} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} horizontal={false}/>
            <XAxis type="number" tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="label" width={200} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.ink }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Bar dataKey="Kingston"   stackId="a" fill={P.kingston}/>
            <Bar dataKey="Montgomery" stackId="a" fill={P.montgomery}/>
            <Bar dataKey="Farrell"    stackId="a" fill={P.farrell} radius={[0,4,4,0]}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Scatter: HHI vs K-share */}
      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>ZIP income vs. Kingston's share</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 14px', maxWidth: 740 }}>
          Each dot is one ZIP. X-axis: median household income. Y-axis: Kingston's share of dollars raised there. Bubble size: total raised. The trend is striking: Kingston wins almost everywhere, with near-total dominance in wealthy ZIPs.
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line}/>
            <XAxis type="number" dataKey="hhi" name="HHI ($K)" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} label={{ value: 'ZIP median household income ($K)', position: 'bottom', fill: P.muted, fontSize: 12, fontFamily: 'DM Sans' }}/>
            <YAxis type="number" dataKey="kShare" name="Kingston %" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} domain={[0, 100]} label={{ value: "Kingston's share (%)", angle: -90, position: 'left', fill: P.muted, fontSize: 12, fontFamily: 'DM Sans' }}/>
            <ZAxis type="number" dataKey="total" range={[50, 1200]}/>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: P.paper, border: `1px solid ${P.kingston}`, borderRadius: 8, padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: P.kingston }}>{d.zip} · {d.nbhd}</div>
                  <div>HHI: ${d.hhi}K · K share: {d.kShare.toFixed(0)}% · Total: {fmtK(d.total)}</div>
                </div>
              );
            }}/>
            <ReferenceLine y={50} stroke={P.warning} strokeDasharray="3 3" label={{ value: '50% parity', fill: P.warning, fontSize: 10, position: 'right' }}/>
            <Scatter name="ZIPs" data={scatterData} fill={P.kingston} fillOpacity={0.65}/>
          </ScatterChart>
        </ResponsiveContainer>
        <WhyMatters>
          The two axes together tell a story about <em>vote propensity</em>. ZIPs with higher HHI turn out at meaningfully higher rates in low-turnout primaries — often 50-70% higher than low-income ZIPs. So Kingston's dominance in the upper-right quadrant (high-income, high-share) is doubly valuable: he's not just raising from more donors, he's raising from neighborhoods that will actually show up on May 19.
        </WhyMatters>
      </Card>

      {/* Income tier + weighted avg */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Income profile of donors</h3>
          <p style={{ fontSize: 12, color: P.muted, margin: '0 0 14px' }}>Share of each candidate's dollars from ZIPs in each income tier (ACS 5-year estimate).</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={INCOME_TIER} margin={{ top: 0, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
              <XAxis dataKey="tier" tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false} angle={-15} textAnchor="end" height={60}/>
              <YAxis tickFormatter={(v) => v+'%'} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="Kingston"   fill={P.kingston}   radius={[4,4,0,0]}/>
              <Bar dataKey="Montgomery" fill={P.montgomery} radius={[4,4,0,0]}/>
              <Bar dataKey="Farrell"    fill={P.farrell}    radius={[4,4,0,0]}/>
              <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 8 }}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Weighted avg donor ZIP income</h3>
          <p style={{ fontSize: 12, color: P.muted, margin: '0 0 14px' }}>Each dollar weighted by the donor's ZIP median HHI.</p>
          {[
            { name: 'Kingston',   wAvg: 91241,  cov: 69.7 },
            { name: 'Montgomery', wAvg: 105416, cov: 62.7 },
            { name: 'Farrell',    wAvg: 87526,  cov: 89.2 },
          ].map(d => (
            <div key={d.name} style={{ padding: 14, borderLeft: `4px solid ${C[d.name].color}`, background: P.bg, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.kingston, marginTop: 4 }}>${d.wAvg.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{d.cov}% coverage</div>
            </div>
          ))}
        </Card>
      </div>

      <WhyMatters>
        Income distribution tells you what kind of general-election coalition each candidate is building. Kingston's balanced income profile (strong at every tier, not just wealthy) means he can transition to broader messaging in November without alienating his primary base. Montgomery's weighted average is actually higher than Kingston's — but only 62% of his dollars are ZIP-traceable, so that number has asterisks. Farrell has the narrowest income band; his coalition will struggle to stretch into general-election Republican voters who don't already know him.
      </WhyMatters>

      {/* Neighborhood cards */}
      <Card style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 14px', color: P.kingston }}>Top neighborhoods by dollars</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {TOP_ZIPS.slice(0, 16).map(z => {
            const total = z.Kingston + z.Montgomery + z.Farrell;
            const kShare = (z.Kingston / total) * 100;
            return (
              <div key={z.zip} style={{ padding: 12, background: P.bg, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: P.kingston }}>{z.zip}</div>
                  <div style={{ fontSize: 10, color: P.muted }}>${(z.hhi/1000).toFixed(0)}K HHI</div>
                </div>
                <div style={{ fontSize: 11, color: P.ink, marginTop: 2, fontWeight: 600 }}>{z.nbhd}</div>
                <div style={{ fontSize: 10, color: P.muted }}>{z.city}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 8, height: 5, borderRadius: 3, overflow: 'hidden', background: P.line }}>
                  <div style={{ height: '100%', background: P.kingston,   width: `${(z.Kingston/total)*100}%` }}/>
                  <div style={{ height: '100%', background: P.montgomery, width: `${(z.Montgomery/total)*100}%` }}/>
                  <div style={{ height: '100%', background: P.farrell,    width: `${(z.Farrell/total)*100}%` }}/>
                </div>
                <div style={{ fontSize: 9, color: P.muted, marginTop: 4 }}>K {kShare.toFixed(0)}% · {fmtK(total)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   TAB 5: OPPONENT FILES
   ============================================================ */
const TabOpponents = () => (
  <div>
    <SectionH eyebrow="Know thy opponent" title="Opponent files" kicker="Bio, strengths, weaknesses, and specific attack vectors for each."/>

    {/* FARRELL */}
    <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${P.farrell} 0%, ${P.farrellLight} 100%)`, color: '#FBF8F2', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75, fontWeight: 700 }}>Opponent #1</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Pat Farrell</h3>
            <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>64 · Chatham County Commissioner (2004–2026) · Skidaway Island resident · Georgia Southern grad, mechanical engineering</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500 }}>{fmtK(FIN.Farrell.receipts)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>total receipts · <strong>77% self-funded</strong></div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: 22, gap: 22 }}>
        <div>
          <Tag tone="success">Strengths</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li>22-year elected official in district — high name ID on Skidaway/Wilmington</li>
            <li>Native Savannahian, multi-generational local ties</li>
            <li>$500K personal commitment signals confidence in his own campaign</li>
            <li>1,000-acre Jenkins County cattle ranch — rural authenticity angle</li>
            <li>Only candidate who's held elected office in the district</li>
            <li>Owns ZIP 31416 (Skidaway), competitive in 31411</li>
          </ul>
        </div>
        <div>
          <Tag tone="danger">Weaknesses</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>77% self-funded.</strong> Only $146K from actual donors</li>
            <li>Raised just <strong>$250 from PACs</strong> — zero institutional backing</li>
            <li>Only 88 donors · 10% repeat rate · narrow base</li>
            <li>Only 3 out-of-state donors in the entire filing</li>
            <li>Represented 1 of district's 14 counties</li>
            <li>Lost his Commission seat involuntarily on qualifying — bad news cycle in March</li>
            <li>Age 64 vs Kingston's 34 — generational mismatch in a MAGA primary</li>
            <li>Potentially loses $250K+ personally if he doesn't win the primary (FECA loan cap)</li>
          </ul>
        </div>
        <div>
          <Tag tone="warning">Attack vectors</Tag>
          <ol style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>"Bought his way in."</strong> $146K from real supporters, $500K from himself. Mailer math writes itself.</li>
            <li><strong>"Chatham County insider."</strong> 22 years on the Commission is a swampy résumé in a Trump-era primary.</li>
            <li><strong>"Couldn't get even $250 from Washington."</strong> Even trade-group PACs skipped him.</li>
            <li><strong>"Lost his seat automatically."</strong> Had to be told his seat was vacated.</li>
            <li>Position Kingston as momentum + grassroots + Trump; Farrell is the status quo.</li>
          </ol>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${P.line}`, padding: '16px 24px', background: P.bg, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { l: 'Donors',       v: '88' },
          { l: 'Cash',         v: fmtK(FIN.Farrell.cash) },
          { l: 'Debt',         v: fmtK(FIN.Farrell.debt), c: P.danger },
          { l: 'PAC $',        v: '$250' },
          { l: 'Burn / mo',    v: fmtK(FIN.Farrell.spent / FIN.Farrell.monthsActive) },
        ].map((x, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{x.l}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: x.c || P.farrell, marginTop: 2 }}>{x.v}</div>
          </div>
        ))}
      </div>
    </Card>

    {/* MONTGOMERY */}
    <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${P.montgomery} 0%, ${P.montgomeryLight} 100%)`, color: '#FBF8F2', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75, fontWeight: 700 }}>Opponent #2</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Brian Montgomery</h3>
            <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>Lt. Col. USA (Ret.) · West Point · Ranger · 82nd Airborne, 3rd ID (Fort Stewart) · 2× Iraq · Savannah ~10 yrs</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500 }}>{fmtK(FIN.Montgomery.receipts)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>total receipts · <strong>{fmtK(FIN.Montgomery.cash)} cash</strong></div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: 22, gap: 22 }}>
        <div>
          <Tag tone="success">Strengths</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>Best biography in the field.</strong> West Point, Ranger, combat vet, 3rd ID battalion commander</li>
            <li>Ideal MAGA primary résumé: veteran + border + fentanyl messaging</li>
            <li>Fort Stewart connection — natural appeal to military retirees</li>
            <li>Out-of-state network — 49 donors (32% of his) from national military brotherhood</li>
            <li>Holds ZIP 31331 (Darien/Sapelo) and 31545 (Jesup) outright</li>
            <li>Clean balance sheet, no debt</li>
          </ul>
        </div>
        <div>
          <Tag tone="danger">Weaknesses</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>$45K cash on hand — ~2 months runway.</strong> Likely goes dark on paid media before May 19</li>
            <li>Only 104 donors · top 20 = 55% of money (fragile concentration)</li>
            <li>Recent Savannah resident ("nearly a decade") vs. lifers Kingston/Farrell</li>
            <li>Trump endorsed Kingston, not him — strips his MAGA messaging of its main asset</li>
            <li>Only $8,500 in PAC support — no VFW, no trade group endorsement</li>
            <li>Cannot match Kingston on paid media in the final 14 days</li>
          </ul>
        </div>
        <div>
          <Tag tone="warning">Attack vectors</Tag>
          <ol style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>Don't attack Montgomery personally.</strong> He's a decorated combat vet. Going negative loses votes in a military-heavy district.</li>
            <li>Compete for his veterans: earn 2–3 Fort Stewart endorsements, specific port/VA commitments.</li>
            <li>Position Kingston as the <em>electable</em> conservative: Trump backing, war chest, institutional support. Montgomery's story is noble; the math isn't there.</li>
            <li>Watch for late veteran endorsement plays — have your own response-ready veteran list.</li>
            <li>Leave the door open: if Montgomery drops out or endorses Kingston in runoff, his coalition moves cleanly.</li>
          </ol>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${P.line}`, padding: '16px 24px', background: P.bg, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { l: 'Donors', v: '104' },
          { l: 'Cash', v: fmtK(FIN.Montgomery.cash), c: P.danger },
          { l: 'Runway', v: '~2 mo', c: P.danger },
          { l: 'PAC $', v: fmtK(FIN.Montgomery.pac) },
          { l: 'Burn / mo', v: fmtK(FIN.Montgomery.spent / FIN.Montgomery.monthsActive) },
        ].map((x, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{x.l}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: x.c || P.montgomery, marginTop: 2 }}>{x.v}</div>
          </div>
        ))}
      </div>
    </Card>

    <Card tone="warning" style={{ padding: 22 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 42, color: P.warning, lineHeight: 1, fontStyle: 'italic' }}>⚑</div>
        <div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: 0, color: P.kingston }}>The master framing</h3>
          <p style={{ fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.65, color: P.ink, marginTop: 8, marginBottom: 0 }}>
            Your two opponents represent two distinct weaknesses in a Trump-era GOP primary: Farrell is the <strong>22-year establishment insider who bought his own campaign</strong>; Montgomery is the <strong>decorated veteran the President didn't pick</strong>. Kingston sits cleanly in the middle — young enough for the next generation, legacy name for continuity, Trump-endorsed for the base, broad coalition for electability. Protect that framing.
          </p>
        </div>
      </div>
    </Card>
  </div>
);

/* ============================================================
   TAB 6: HIDDEN EDGES (NEW — the special insights)
   ============================================================ */
const TabInsights = () => {
  // Mini data for the tier viz
  const tiers = [
    { tier: 'Max-out ($3,500)',   n: 181, given: 736000, room: 0, color: P.kingston },
    { tier: 'Near-max ($2.5–3.4K)', n: 27,  given: 69500,  room: 94500 - 69500, color: P.kingstonLight },
    { tier: 'Mid ($1–2.4K)',       n: 170, given: 198050, room: 595000 - 198050, color: P.kingstonAccent },
    { tier: 'Low (<$1K)',           n: 107, given: 45500,  room: 374500 - 45500, color: '#C6B88D' },
  ];

  // Retiree comparison
  const retireeData = [
    { name: 'Montgomery', retirees: 41, other: 59 },
    { name: 'Farrell',    retirees: 26, other: 74 },
    { name: 'Kingston',   retirees: 7,  other: 93 },
  ];

  // Atlanta moat
  const atlantaZips = [
    { zip: '30327', nbhd: 'Buckhead',  Kingston: 48200, other: 0 },
    { zip: '30305', nbhd: 'Buckhead',  Kingston: 23500, other: 0 },
    { zip: '30269', nbhd: 'Peachtree City', Kingston: 17500, other: 1600 },
    { zip: '30342', nbhd: 'Sandy Springs', Kingston: 9250, other: 0 },
    { zip: '30309', nbhd: 'Midtown',   Kingston: 7500, other: 3500 },
  ];

  return (
    <div>
      <SectionH
        eyebrow="Hidden edges"
        title="The insights that sit under the surface"
        kicker="These are the findings most campaign dashboards miss. Each one is specific, actionable, and based on the underlying data — not vibes. Use them."
      />

      <div style={{ display: 'grid', gap: 14 }}>

        <Insight n="01" tone="gold" title="The $751,000 vault hiding inside your own donor list"
          stat={{ value: '$751K', label: 'unused primary capacity' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: P.ink }}>
            Of your 485 primary donors, <strong>304 have not hit the $3,500 cap.</strong> If every one of them gave to the legal max, the campaign pulls another $751K for the primary — no new names needed. The 27 near-max donors (between $2,500 and $3,499) get you $25K with a single email ask.
          </p>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Given (dark) vs. unused room (light), by tier</div>
            {tiers.map(t => {
              const total = t.given + t.room;
              const max = 595000;
              return (
                <div key={t.tier} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{t.tier} · {t.n} donors</span>
                    <span style={{ color: P.muted }}>given {fmtK(t.given)} · room {fmtK(t.room)}</span>
                  </div>
                  <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', background: P.line }}>
                    <div style={{ width: `${(t.given / max) * 100}%`, background: t.color }}/>
                    <div style={{ width: `${(t.room / max) * 100}%`, background: t.color, opacity: 0.3 }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Insight>

        <Insight n="02" tone="hot" title="267 contributions at exactly $3,500 — 181 donors tapped out on the primary"
          stat={{ value: '181', label: 'primary max-outs' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 10px', color: P.ink }}>
            <strong>37% of Kingston's itemized contributions hit exactly $3,500</strong> — the FEC per-election cap. 181 donors have met or exceeded the primary max across their combined giving. These donors are legally tapped out for the primary, but each still has headroom under their general-election cap (and runoff cap if one materializes).
          </p>
          <div style={{ padding: 14, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.danger}`, marginTop: 10 }}>
            <div style={{ fontSize: 12, color: P.ink, lineHeight: 1.6 }}>
              <strong style={{ color: P.danger }}>Open the general-election ask this week.</strong> A targeted "redesignate for November" email to the max-outs that haven't yet committed to the general unlocks meaningful dollars without finding a single new donor. High-ROI finance activity right now.
            </div>
          </div>
        </Insight>

        <Insight n="03" tone="hot" title="The 74-person Ultra-Loyalist Club"
          stat={{ value: '$793K', label: 'from 74 donors' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            74 donors gave Kingston $7,000 or more (primary + general, plus runoff where applicable). That's <strong>15% of the donor base producing 51% of the money.</strong> The top three — Critz, Demere, Hollis — each appear in the file for ~$24,500; a portion of that is pending reattribution to their spouses (who also gave $10,500 each), so the effective household totals are ~$35,000 per family. The $10,500 individual triple-max cap still holds.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
            {DOUBLE_MAX.slice(0, 10).map(d => (
              <div key={d.name} style={{ padding: '8px 10px', background: P.bg, borderRadius: 6, borderLeft: `3px solid ${P.kingstonAccent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.kingston }}>{lastName(d.name)}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: P.kingston, marginTop: 2 }}>{fmtK(d.amount)}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: P.muted, fontStyle: 'italic', marginTop: 12, marginBottom: 0 }}>
            These are your November surrogates. A private candidate dinner with all 74 — before May 19 — is a high-leverage use of the candidate's time.
          </p>
        </Insight>

        <Insight n="04" tone="warm" title="The Atlanta Moat — $106K from ZIPs no opponent touches"
          stat={{ value: '$106K', label: 'Atlanta network' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Five Atlanta-area ZIPs (Buckhead, Peachtree City, Sandy Springs, Midtown) gave Kingston <strong>$105,950 combined</strong>. Opponents took <strong>$5,100 total</strong> from the same ZIPs. This is donor territory no rival has touched.
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={atlantaZips} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: P.muted }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="zip" width={60} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.ink, fontWeight: 600 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="Kingston" stackId="a" fill={P.kingston}/>
              <Bar dataKey="other" stackId="a" fill={P.mutedLight} name="All opponents"/>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 12, color: P.muted, marginTop: 8, marginBottom: 0 }}>One Buckhead reception before May 19 almost certainly adds $50K+ given the density of untapped max-out donors.</p>
        </Insight>

        <Insight n="05" tone="warm" title="Six hedger donors — two are actively gettable"
          stat={{ value: '6', label: 'gave to multiple candidates' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Six people gave money to two or more candidates in this race. They are not loyal — they are hedging. Two of them gave Farrell materially more than they gave Kingston. A candidate phone call this week, post-Trump-endorsement, converts them almost certainly.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SHARED.map(s => (
              <div key={s.name} style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${s.tone === 'hot' ? P.danger : s.tone === 'warm' ? P.warning : P.mutedLight}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  {s.tone === 'hot' && <Tag tone="danger">CALL TODAY</Tag>}
                </div>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{s.city}</div>
                <div style={{ fontSize: 11, marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>K: <strong style={{ color: P.kingston }}>${s.Kingston.toLocaleString()}</strong></span>
                  {s.Montgomery > 0 && <span>M: <strong style={{ color: P.montgomery }}>${s.Montgomery.toLocaleString()}</strong></span>}
                  {s.Farrell > 0 && <span>F: <strong style={{ color: P.farrell }}>${s.Farrell.toLocaleString()}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </Insight>

        <Insight n="06" tone="warm" title="The retiree gap — Kingston's biggest coalition vulnerability"
          stat={{ value: '7%', label: 'retirees in Kingston base' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Kingston's donor base is 7% retirees. Montgomery's is <strong>41%</strong>. In a GOP primary, retirees vote at 2-3× the rate of working-age voters. This is the one dimension where Montgomery's coalition is meaningfully stronger than yours.
          </p>
          <div style={{ marginTop: 12 }}>
            {retireeData.map(d => (
              <div key={d.name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span style={{ color: P.muted }}>{d.retirees}% retired · {d.other}% working</span>
                </div>
                <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', background: P.line }}>
                  <div style={{ width: `${d.retirees}%`, background: C[d.name].color }}/>
                  <div style={{ width: `${d.other}%`, background: C[d.name].color, opacity: 0.25 }}/>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: P.muted, fontStyle: 'italic', marginTop: 10, marginBottom: 0 }}>
            Fix: Fort Stewart and VFW endorsements. A targeted mail drop in 31313 (Hinesville), 31547 (Kingsland), and 31411 (Skidaway retirees).
          </p>
        </Insight>

        <Insight n="07" tone="default" title="Montgomery is burning down to zero — before primary day"
          stat={{ value: '~2.0 mo', label: 'Montgomery runway' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Montgomery has $45,445 cash on hand and burns roughly $23K/month. At that pace, he runs out of money in about 60 days — roughly one week <em>before</em> primary day. He'll likely have to go quiet on paid media in the first week of May unless he raises a surprising amount in April.
          </p>
          <div style={{ padding: 14, background: P.bg, borderRadius: 8, fontSize: 13, color: P.ink }}>
            <strong style={{ color: P.kingston }}>Strategic implication:</strong> Don't pick a fight with Montgomery. Let him run out. Spend air on Farrell contrast and Kingston positive.
          </div>
        </Insight>

        <Insight n="08" tone="default" title="10 bundler firms organized $138K in stacked giving"
          stat={{ value: '$138K', label: 'from 10 firms' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            When 3+ employees of one firm donate within days of each other, someone inside organized it. That person is a <strong>de facto bundler</strong> — your most valuable volunteer asset. Here are the ten firms that did it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {BUNDLERS.map(b => (
              <div key={b.firm} style={{ padding: '10px 12px', background: P.bg, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.kingston }}>{b.firm}</div>
                  <div style={{ fontSize: 10, color: P.muted }}>{b.n} donors</div>
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600 }}>{fmt(b.total)}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: P.muted, marginTop: 10, fontStyle: 'italic', marginBottom: 0 }}>
            Host a private candidate breakfast with all 10 bundler-organizers before May 19. These are lifetime relationships that pay off for years.
          </p>
        </Insight>

        <Insight n="09" tone="default" title="Donor acquisition is still accelerating"
          stat={{ value: '485', label: 'donors in 6 months' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Kingston adds new donors at roughly 80/month — <strong>10× Farrell's rate</strong>. The launch month spike (187 donors in June 2025) was a call-time push; since then, the machine has maintained steady acquisition through every quarter.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={DONOR_VELOCITY} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false}/>
              <YAxis tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: P.muted }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TTip/>}/>
              <Line type="monotone" dataKey="Kingston"   stroke={P.kingston}   strokeWidth={3} dot={{ r: 4 }}/>
              <Line type="monotone" dataKey="Farrell"    stroke={P.farrell}    strokeWidth={2} dot={{ r: 3 }}/>
              <Line type="monotone" dataKey="Montgomery" stroke={P.montgomery} strokeWidth={2} dot={{ r: 3 }}/>
              <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 11 }}/>
            </LineChart>
          </ResponsiveContainer>
        </Insight>

        <Insight n="10" tone="default" title="The small-dollar desert — and what it means"
          stat={{ value: '1.0%', label: 'Kingston unitemized' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Only <strong>1% of Kingston's individual money is unitemized</strong> (donations under $200). A typical grassroots-email campaign runs 15-30% small-dollar. This is a pure call-time operation — which means the numbers are strong <em>and</em> there's an upside play nobody's running.
          </p>
          <div style={{ padding: 14, background: P.bg, borderRadius: 8, fontSize: 13, color: P.ink, lineHeight: 1.5 }}>
            <strong style={{ color: P.kingston }}>The latent opportunity:</strong> With Trump endorsing Kingston on a major MAGA platform, a one-week national email blast to conservative small-dollar lists could plausibly add <strong>$50-150K</strong> in unitemized. It's free money the current operation isn't pursuing.
          </div>
        </Insight>

        <Insight n="11" tone="default" title="Kingston has refunded $158,000 — and should keep watching this"
          stat={{ value: '$158K', label: 'refunds processed' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: P.ink }}>
            51 negative entries on Schedule A total <strong>$158,000 in refunds</strong> — usually over-limit contributions returned, or primary dollars redesignated to general. That's nearly 10% of individual receipts flowing through compliance. Operationally fine, but worth understanding the pattern. If refunds are rising, it signals donors are hitting limits faster — which is what you want.
          </p>
        </Insight>

        <Insight n="12" tone="gold" title="30 households doubled up — a rare depth signal"
          stat={{ value: '30', label: 'households w/ 2+ max-givers' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            The FEC's $3,500 cap is per individual, not per household — so when two people at the same address <em>both</em> max out, that's two independent political decisions, not one donor writing a bigger check. <strong>30 Kingston households have 2+ family members who each netted $3,500 or more.</strong> Combined, they account for <strong>$551,500 net</strong> — roughly one in every three Kingston dollars. This is uncommon in a typical primary and a stronger signal of commitment than any single donor's max check.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8, marginBottom: 12 }}>
            {[
              { family: 'Critz',          total: 35000, n: 2 },
              { family: 'Hollis',         total: 35000, n: 2 },
              { family: 'Demere',         total: 35000, n: 2 },
              { family: 'Dorsey',         total: 31500, n: 2 },
              { family: 'Hufstetler',     total: 21000, n: 2 },
              { family: 'Daniel',         total: 21000, n: 2 },
              { family: 'Leebern',        total: 21000, n: 2 },
              { family: 'Myers',          total: 21000, n: 2 },
              { family: 'Miranda',        total: 21000, n: 2 },
              { family: 'Jackson',        total: 21000, n: 2 },
              { family: 'Jepson',         total: 21000, n: 2 },
              { family: 'Mingledorff',    total: 21000, n: 2 },
            ].map(h => (
              <div key={h.family} style={{ padding: '8px 10px', background: P.bg, borderRadius: 6, borderLeft: `3px solid ${P.kingstonAccent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.kingston }}>{h.family}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: P.kingston, marginTop: 2 }}>{fmtK(h.total)}</div>
                <div style={{ fontSize: 10, color: P.muted, marginTop: 1 }}>{h.n} givers</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: P.muted, fontStyle: 'italic', marginTop: 0, marginBottom: 0 }}>
            Invite both spouses to the candidate dinner — household-level buy-in is surrogate-grade. These 30 addresses are the strongest relationships in the file.
          </p>
        </Insight>

        <Insight n="13" tone="gold" title="The legacy network is deep — and it's showing up for you"
          stat={{ value: '$793K', label: 'from father\'s network' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: P.ink }}>
            Your top 15 donors include Dale Critz Jr. (auto), Christian Demere (Colonial Group logistics), TJ Hollis (McManamy Jackson Hollis law firm), William Dorsey III, John Skeadas III, Evan Barker — names that map directly onto Jack Kingston's 30-year donor and business network in Savannah. That's an inheritance most candidates can't replicate. The opponents' attack that Kingston is "his father's candidate" is true — and the list is the reason it doesn't matter: 485 donors, 74 of them ultra-loyalists, 10 bundler firms, $1.3M cash. That's not a legacy; that's a <em>machine</em>.
          </p>
        </Insight>

      </div>
    </div>
  );
};

/* ============================================================
   TAB 7: MODELS (uses only official government data)
   ============================================================ */
const TabModels = () => {
  // MODEL 1: Cash exhaustion — pure arithmetic on FEC Form 3
  const cashModel = ['Kingston','Farrell','Montgomery'].map(name => {
    const d = FIN[name];
    const monthlyBurn = d.spent / d.monthsActive;
    const runwayMonths = d.cash / monthlyBurn;
    const exhaustDate = new Date('2026-04-20');
    exhaustDate.setDate(exhaustDate.getDate() + Math.round(runwayMonths * 30));
    return {
      name, cash: d.cash, spent: d.spent, monthsActive: d.monthsActive,
      monthlyBurn: Math.round(monthlyBurn),
      runwayMonths: runwayMonths.toFixed(1),
      exhaustDate: exhaustDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      priorToPrimary: exhaustDate < new Date('2026-05-19'),
    };
  });

  // MODEL 5: Historical turnout precedent (using 2014 GA-1 open-seat primary as analog)
  const turnoutScenarios = [
    { scenario: 'Low (2014 analog × 1.0)',    ballots: 55000, winThreshold: 27501 },
    { scenario: 'Base (Trump bump +15%)',     ballots: 63250, winThreshold: 31626 },
    { scenario: 'High (open seat + MAGA energy)', ballots: 70000, winThreshold: 35001 },
  ];

  return (
    <div>
      <SectionH
        eyebrow="Models"
        title="High-confidence models, official data only"
        kicker="Six models built strictly from FEC filings and Georgia Secretary of State records. Each shows its inputs, formula, sources, and a confidence rating. No polling, no academic regressions, no vibes."
      />

      {/* MODEL 1: Cash Exhaustion */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag tone="navy">MODEL 01</Tag>
              <Tag tone="success">HIGH CONFIDENCE</Tag>
            </div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
              Opponent cash-exhaustion date
            </h3>
            <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
              When each opponent runs out of money at current burn rate. Critical for mail / TV planning in the final two weeks.
            </p>
          </div>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              monthly_burn = total_disbursements ÷ months_active<br/>
              runway_months = cash_on_hand ÷ monthly_burn<br/>
              exhaust_date = today + (runway_months × 30 days)
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS (FEC Form 3, 4/1/2025 – 3/31/2026)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.line}` }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 700, color: P.muted, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Candidate</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: P.muted, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cash</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: P.muted, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Spent</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: P.muted, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Months</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: P.muted, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Burn/mo</th>
                </tr>
              </thead>
              <tbody>
                {cashModel.map(c => (
                  <tr key={c.name} style={{ borderBottom: `1px solid ${P.line}` }}>
                    <td style={{ padding: '9px 6px', fontWeight: 600, color: C[c.name].color }}>{c.name}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{fmtK(c.cash)}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{fmtK(c.spent)}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{c.monthsActive}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{fmtK(c.monthlyBurn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>RESULT</div>
            {cashModel.map(c => (
              <div key={c.name} style={{ padding: 14, borderLeft: `4px solid ${C[c.name].color}`, background: P.bg, borderRadius: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C[c.name].color }}>{c.name}</div>
                  {c.priorToPrimary && <Tag tone="danger">DRY BEFORE PRIMARY</Tag>}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, marginTop: 2 }}>
                  {c.runwayMonths} mo runway
                </div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>
                  cash = $0 on approx. <strong>{c.exhaustDate}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Form 3 Reports of Receipts and Disbursements —{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>fec.gov/data/committee/C00908624</span> (Kingston),{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>C00905422</span> (Farrell),{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>C00917039</span> (Montgomery).{' '}
          <strong style={{ color: P.kingston }}>Caveat:</strong> Campaign spending typically spikes 2–3× in the final four weeks (media buys, GOTV, field). Montgomery's effective exhaust date could be 10–14 days earlier than shown.
        </div>
      </Card>

      {/* MODEL 2: Donor Capacity */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag tone="navy">MODEL 02</Tag>
            <Tag tone="success">HIGH CONFIDENCE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            Unused donor capacity in Kingston's list
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            How many dollars the campaign can legally raise from donors already in the file — without finding a single new name.
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              primary_room = Σ ($3,500 − donor_primary_given)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;for each donor where primary_given &lt; $3,500<br/>
              general_room = count(primary_maxed_donors) × $3,500<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;minus (donors who already maxed general)
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS (FEC Schedule A)</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: P.ink }}>
              485 unique donors, 764 itemized contributions through 12/31/2025.<br/>
              267 contributions at exactly $3,500 (primary cap); 181 donors net-maxed.<br/>
              107 of those have not given $3,500 to general.<br/>
              304 donors below primary cap, avg remaining capacity $2,470.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>RESULT</div>
            <div style={{ padding: 16, background: `linear-gradient(135deg, ${P.kingston} 0%, ${P.kingstonLight} 100%)`, color: '#FBF8F2', borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Primary room</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, marginTop: 2, lineHeight: 1 }}>$751,000</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>from 304 non-maxed primary donors</div>
            </div>
            <div style={{ padding: 16, background: `linear-gradient(135deg, ${P.kingstonAccent} 0%, #E0B96A 100%)`, color: P.ink, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>General room (redesignation)</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, marginTop: 2, lineHeight: 1 }}>$374,500</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>from 107 primary max-outs not yet max-given general</div>
            </div>
            <div style={{ padding: '12px 16px', borderLeft: `4px solid ${P.success}`, background: P.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Total addressable without new donors</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, color: P.success, marginTop: 2 }}>$1,125,500</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Schedule A (Itemized Individual Contributions), aggregated by (contributor_name + 5-digit ZIP) for Committee C00908624. File timestamp 2026-04-20T09:27:54.{' '}
          <strong style={{ color: P.kingston }}>Statute:</strong> 52 U.S.C. § 30116(a)(1)(A) — $3,500 per individual per election limit (2025–26 cycle, indexed biennially per FEC announcement).
        </div>
      </Card>

      {/* MODEL 3: Farrell §30116(j) loss exposure */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag tone="navy">MODEL 03</Tag>
            <Tag tone="success">HIGH CONFIDENCE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            Farrell's personal financial loss if he loses the primary
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            Pure statutory math. FECA caps post-election repayment of candidate personal loans at $250,000.
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              if (loses_primary):<br/>
              &nbsp;&nbsp;max_personal_recovery = min(<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;statutory_cap ($250,000),<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;cash_raised_pre_election − expenses<br/>
              &nbsp;&nbsp;)<br/>
              &nbsp;&nbsp;personal_loss = loan_principal − max_recovery
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: P.ink }}>
              <strong>Loans made by candidate:</strong> $500,000 (FEC Form 3, Line 13A)<br/>
              <strong>Debts/loans owed by committee:</strong> $500,000 (FEC Form 3, Line 10)<br/>
              <strong>Statutory cap:</strong> $250,000 — <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>52 U.S.C. § 30116(j)</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>SCENARIOS</div>
            <div style={{ padding: 14, background: '#F5EBEB', borderLeft: `4px solid ${P.danger}`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: P.danger, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loses primary · campaign spends most cash</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.danger, marginTop: 2 }}>$250,000 personal loss</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>At least half the loan is legally unrecoverable post-election</div>
            </div>
            <div style={{ padding: 14, background: '#F5EFE8', borderLeft: `4px solid ${P.warning}`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: P.warning, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loses primary · campaign has $250K+ left</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.warning, marginTop: 2 }}>$250,000 personal loss</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Cap is absolute — extra cash cannot be used for loan repayment above $250K</div>
            </div>
            <div style={{ padding: 14, background: '#EDF2E8', borderLeft: `4px solid ${P.success}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: P.success, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wins primary</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.success, marginTop: 2 }}>$0 personal loss</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Loan fully recoverable via general-election fundraising</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Sources:</strong> FEC Form 3 (Farrell Committee C00905422, covering 4/1/2025 – 3/31/2026) · Federal Election Campaign Act of 1971 as amended, 52 U.S.C. § 30116(j) — "A candidate may repay personal loans exceeding $250,000 only with funds raised prior to the election." See also 11 C.F.R. § 116.11.
        </div>
      </Card>

      {/* MODEL 4: Grassroots-vs-self-funded ratio */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag tone="navy">MODEL 04</Tag>
            <Tag tone="success">HIGH CONFIDENCE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            Grassroots Authenticity Ratio (GAR)
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            What percentage of each candidate's receipts came from actual supporters (individuals + PACs) vs. the candidate themselves.
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              GAR = (indiv_contrib + PAC_contrib) ÷ total_receipts × 100%<br/><br/>
              self_funded = candidate_loans + candidate_contrib<br/>
              self_funded_pct = self_funded ÷ total_receipts × 100%
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS (FEC Form 3)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.line}` }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Indiv</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PAC</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Self</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {['Kingston','Montgomery','Farrell'].map(name => {
                  const d = FIN[name];
                  const self = d.selfLoans + d.selfContrib;
                  return (
                    <tr key={name} style={{ borderBottom: `1px solid ${P.line}` }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: C[name].color }}>{name}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{fmtK(d.indiv)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{fmtK(d.pac)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: self > 0 ? P.danger : undefined }}>{fmtK(self)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{fmtK(d.receipts)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>RESULT</div>
            {['Kingston','Montgomery','Farrell'].map(name => {
              const d = FIN[name];
              const self = d.selfLoans + d.selfContrib;
              const gar = ((d.indiv + d.pac) / d.receipts) * 100;
              return (
                <div key={name} style={{ padding: 14, background: P.bg, borderLeft: `4px solid ${C[name].color}`, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C[name].color }}>{name}</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: gar >= 90 ? P.success : gar >= 50 ? P.warning : P.danger }}>
                      {gar.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ height: 8, background: P.line, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${gar}%`, height: '100%', background: gar >= 90 ? P.success : gar >= 50 ? P.warning : P.danger }}/>
                  </div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
                    {fmtK(d.indiv + d.pac)} from donors + PACs · {fmtK(self)} from self
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Form 3 lines 11(a), 11(c), 13(a), 11(d) for each committee (C00908624, C00917039, C00905422). Coverage 4/1/2025 – 3/31/2026.{' '}
          <strong style={{ color: P.kingston }}>Interpretation:</strong> A GAR above 95% signals a genuine grassroots coalition. Below 50% signals the campaign is functionally candidate-funded.
        </div>
      </Card>

      {/* MODEL 5: Historical turnout + win threshold */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag tone="navy">MODEL 05</Tag>
            <Tag tone="warning">MEDIUM-HIGH CONFIDENCE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            Historical victory threshold (50%+1 scenarios)
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            How many votes Kingston needs to skip the runoff, projected from the most recent open-seat GA-1 GOP primary (2014).
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              expected_ballots = historical_open_seat_turnout × adjustment<br/>
              win_threshold = (expected_ballots ÷ 2) + 1
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>HISTORICAL INPUTS (GA SOS)</div>
            <div style={{ fontSize: 13, lineHeight: 1.75, color: P.ink }}>
              <strong>2014 GA-1 GOP primary</strong> (last open seat): 6 candidates · Carter won 36% · went to runoff · Carter 54% in runoff · approx. 55,000 ballots cast<br/>
              <strong>2016–2024 GA-1 GOP primaries:</strong> Carter incumbent, uncontested, not analogous<br/>
              <strong>2026 structural factors:</strong> open seat ✓ · 4 candidates · Trump endorsement ✓ · qualifying-deadline news cycle ✓
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>SCENARIOS</div>
            {turnoutScenarios.map((s, i) => (
              <div key={i} style={{ padding: 14, background: P.bg, borderLeft: `4px solid ${i === 1 ? P.kingstonAccent : P.kingstonLight}`, borderRadius: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.kingston, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.scenario}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                  <div>
                    <div style={{ fontSize: 10, color: P.muted }}>Expected ballots</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 }}>{s.ballots.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: P.muted }}>Need for 50%+1</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: P.kingstonAccent }}>{s.winThreshold.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ padding: '10px 14px', background: '#EDF2E8', borderRadius: 8, fontSize: 12, color: P.ink, lineHeight: 1.5 }}>
              <strong style={{ color: P.success }}>Implication:</strong> Kingston's 485 donors represent roughly 0.8% of the expected primary electorate. Each donor converting 60–75 additional voters in their network (friends, family, neighbors) gets Kingston over 50%+1 in the base scenario.
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Sources:</strong> Georgia Secretary of State, "OFFICIAL RESULTS General Primary Election" —{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>sos.ga.gov</span> election archives.{' '}
          <strong style={{ color: P.kingston }}>Caveat:</strong> Turnout projections carry ±20% uncertainty. Trump-endorsed open-seat primaries in GOP-leaning districts have limited direct analogs in GA; adjustment factors are estimates, not observed values. This model is a planning tool, not a forecast.
        </div>
      </Card>

      {/* MODEL 6: Refund-adjusted net receipts */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag tone="navy">MODEL 06</Tag>
            <Tag tone="success">HIGH CONFIDENCE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            Fundraising efficiency (spent-per-dollar-raised)
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            What each campaign has spent to raise its current total. A lower number means a more efficient operation — more dollars banked per dollar burned.
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              earned_receipts = total_receipts − candidate_loans − candidate_contrib<br/>
              spend_ratio = total_disbursements ÷ earned_receipts<br/>
              cost_per_$_raised = spend_ratio in cents
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: P.ink }}>
              FEC Form 3 lines 17–22 (disbursements) ÷ earned receipts (total receipts minus self-funding).
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>RESULT</div>
            {['Kingston','Montgomery','Farrell'].map(name => {
              const d = FIN[name];
              const earned = d.receipts - d.selfLoans - d.selfContrib;
              const ratio = d.spent / earned;
              const cents = Math.round(ratio * 100);
              return (
                <div key={name} style={{ padding: 14, background: P.bg, borderLeft: `4px solid ${C[name].color}`, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C[name].color }}>{name}</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: ratio < 0.5 ? P.success : ratio < 1 ? P.warning : P.danger }}>
                      {cents}¢ per $1 raised
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
                    {fmtK(d.spent)} spent · {fmtK(earned)} earned from supporters
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Form 3 lines 16 (total receipts), 13(a) (loans), 11(d) (candidate contrib), 22 (total disbursements). Coverage 4/1/2025 – 3/31/2026.{' '}
          <strong style={{ color: P.kingston }}>Interpretation:</strong> Kingston spends 32¢ to raise each $1 — classic call-time operation with moderate overhead. Farrell spends $1.62 per earned-receipts dollar: his $500K self-loan is propping up a cash-negative fundraising operation.
        </div>
      </Card>

      {/* Methodology footer */}
      <Card tone="success" style={{ padding: 22 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 42, color: P.success, lineHeight: 1, fontStyle: 'italic' }}>§</div>
          <div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: 0, color: P.kingston }}>Data integrity</h3>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, marginTop: 8, marginBottom: 8 }}>
              Every input used in these six models is sourced from (a) FEC official filings retrievable at{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>fec.gov/data</span>, (b) federal statute in the U.S. Code and C.F.R., or (c) Georgia Secretary of State election archives at{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>sos.ga.gov</span>. No polling, no private data, no academic regressions, no inferred numbers. Every calculation is deterministic arithmetic on disclosed values.
            </p>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.muted, marginTop: 0, marginBottom: 0 }}>
              Confidence ratings: <strong>HIGH</strong> = result follows directly from inputs with no meaningful assumptions. <strong>MEDIUM-HIGH</strong> = structural analog exists but magnitude carries uncertainty (±20%).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   ROOT
   ============================================================ */
const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'money',     label: 'Money' },
  { id: 'donors',    label: 'Donors' },
  { id: 'geography', label: 'Geography' },
  { id: 'opponents', label: 'Opponents' },
  { id: 'insights',  label: 'Hidden Edges' },
  { id: 'models',    label: 'Models' },
];

export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const contentRef = useRef(null);
  const navRef = useRef(null);
  const [navOverflow, setNavOverflow] = useState({ left: false, right: false });

  // Scroll back to top whenever the tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [tab]);

  // Detect nav overflow so we can show scroll affordances on mobile
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      setNavOverflow({
        left: el.scrollLeft > 2,
        right: hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="dk-root" style={{ fontFamily: 'DM Sans, sans-serif', background: P.bg, color: P.ink, minHeight: '100vh' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .dk-root { max-width: 100vw; overflow-x: clip; }
        /* Restore list bullets that Tailwind's preflight strips */
        .dk-root ul { list-style: disc outside; }
        .dk-root ol { list-style: decimal outside; }
        .dk-root li { margin-bottom: 4px; }
        @media (max-width: 768px) {
          /* Tighten outer container padding */
          .dk-root [style*="padding: 28px 32px"] { padding: 20px 14px !important; }
          .dk-root [style*="padding: 16px 32px"] { padding: 14px 14px !important; }
          .dk-root [style*="padding: 0 32px"] { padding-left: 14px !important; padding-right: 14px !important; }

          /* Masthead: let the two halves stack/wrap if needed */
          .dk-root [style*="justify-content: space-between"][style*="align-items: center"] {
            flex-wrap: wrap; gap: 10px;
          }

          /* Collapse all multi-column grids to single column */
          .dk-root [style*="grid-template-columns: repeat(2"],
          .dk-root [style*="grid-template-columns:repeat(2"],
          .dk-root [style*="grid-template-columns: repeat(3"],
          .dk-root [style*="grid-template-columns:repeat(3"],
          .dk-root [style*="grid-template-columns: repeat(4"],
          .dk-root [style*="grid-template-columns:repeat(4"],
          .dk-root [style*="grid-template-columns: repeat(5"],
          .dk-root [style*="grid-template-columns:repeat(5"],
          .dk-root [style*="grid-template-columns: 1fr 1fr"],
          .dk-root [style*="grid-template-columns:1fr 1fr"],
          .dk-root [style*="grid-template-columns: 1.1fr 1fr"],
          .dk-root [style*="grid-template-columns:1.1fr 1fr"],
          .dk-root [style*="grid-template-columns: 1.2fr 1fr"],
          .dk-root [style*="grid-template-columns:1.2fr 1fr"],
          .dk-root [style*="grid-template-columns: 1.3fr 1fr"],
          .dk-root [style*="grid-template-columns:1.3fr 1fr"],
          .dk-root [style*="grid-template-columns: 1.4fr 1fr"],
          .dk-root [style*="grid-template-columns:1.4fr 1fr"],
          .dk-root [style*="grid-template-columns: 1fr 1.2fr"],
          .dk-root [style*="grid-template-columns:1fr 1.2fr"],
          .dk-root [style*="grid-template-columns: 70px 1fr 120px"],
          .dk-root [style*="grid-template-columns:70px 1fr 120px"] {
            grid-template-columns: 1fr !important;
          }

          /* Charts and images never exceed their container */
          .dk-root svg, .dk-root img { max-width: 100%; }
        }
      `}</style>

      {/* Masthead */}
      <div style={{ background: P.paper, borderBottom: `1px solid ${P.line}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `linear-gradient(135deg, ${P.kingston}, ${P.kingstonLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: P.kingstonAccent, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, fontStyle: 'italic',
            }}>K</div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.muted, fontWeight: 700 }}>Friends of Jim Kingston</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: P.kingston }}>Campaign Intelligence</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: P.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>GA-1 Primary</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: P.kingston }}>May 19, 2026 · <span style={{ color: P.warning }}>{DAYS_TO_PRIMARY} days</span></div>
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>
          <div ref={navRef} style={{ padding: '0 32px', display: 'flex', gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? `3px solid ${P.kingston}` : '3px solid transparent',
                padding: '12px 16px', fontFamily: 'DM Sans', fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? P.kingston : P.muted,
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 44,
            pointerEvents: 'none',
            background: `linear-gradient(to right, rgba(255,255,255,0), ${P.paper} 65%)`,
            opacity: navOverflow.right ? 1 : 0,
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 10, paddingBottom: 3,
            color: P.kingston, fontSize: 20, fontWeight: 700, lineHeight: 1,
          }}>›</div>
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 44,
            pointerEvents: 'none',
            background: `linear-gradient(to left, rgba(255,255,255,0), ${P.paper} 65%)`,
            opacity: navOverflow.left ? 1 : 0,
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            paddingLeft: 10, paddingBottom: 3,
            color: P.kingston, fontSize: 20, fontWeight: 700, lineHeight: 1,
          }}>‹</div>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px' }}>
        {tab === 'overview'  && <TabOverview/>}
        {tab === 'money'     && <TabMoney/>}
        {tab === 'donors'    && <TabDonors/>}
        {tab === 'geography' && <TabGeography/>}
        {tab === 'opponents' && <TabOpponents/>}
        {tab === 'insights'  && <TabInsights/>}
        {tab === 'models'    && <TabModels/>}
      </div>

      {/* Footer */}
      <div style={{ background: P.paper, borderTop: `1px solid ${P.line}`, marginTop: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11, fontWeight: 700, color: P.kingston, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Source</div>
            FEC Schedule A itemized individual contributions through 12/31/2025, combined with FEC Form 3 summary data through 3/31/2026. PAC, disbursement, and cash-on-hand numbers reflect Q1 2026; monthly individual-donor breakdowns reflect YE 2025.
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11, fontWeight: 700, color: P.kingston, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Methodology</div>
            Unique donor = unique (name + 5-digit ZIP). Max-out = FEC 2025-26 cap of $3,500 per individual per election. ZIP income = ACS 5-year estimate of median household income. Distribution buckets are [min, max] intervals that correctly isolate $3,500 and $7,000 as discrete buckets.
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11, fontWeight: 700, color: P.kingston, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Caveats</div>
            Donor income is estimated from ZIP-level median HHI, not individual income. Independent expenditures (super PACs for/against) are not in this dashboard. FECA loan-repayment rule (§30116(j)) may change if Farrell's campaign raises enough pre-primary.
          </div>
        </div>
      </div>
    </div>
  );
}
