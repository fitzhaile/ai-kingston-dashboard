import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ComposedChart, ReferenceLine, ReferenceArea
} from 'recharts';
import { geoMercator, geoPath } from 'd3-geo';
import GEO_ZIPS from './geo_zips.json';

/* ============================================================
   GA-1 REPUBLICAN PRIMARY — FUNDRAISING ANALYSIS
   Data: FEC Schedule A (through 4/29/2026) + FEC Form 3 summary (pre-primary)
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

// === FEC FINANCIAL SUMMARY (THROUGH THE 4/29/2026 PRE-PRIMARY REPORT) ===
const FIN = {
  Kingston:   { receipts: 1862606, indiv: 1681156, itemized: 1659885, unitemized: 21270, pac: 181450, selfLoans: 0, selfContrib: 0, spent: 913390, cash: 949215, debt: 0, monthsActive: 11 },
  Montgomery: { receipts: 267832,  indiv: 238518,  itemized: 225957,  unitemized: 12561, pac: 8500,   selfLoans: 0, selfContrib: 20815, spent: 222692, cash: 45140,   debt: 0, monthsActive: 10 },
  Farrell:    { receipts: 656764,  indiv: 156514,  itemized: 149276,  unitemized: 7238,  pac: 250,    selfLoans: 500000, selfContrib: 0, spent: 593932, cash: 62832, debt: 500000, monthsActive: 12 },
};

// === CUMULATIVE & MONTHLY (primary, from Schedule A) ===
const CUMULATIVE = [
  { month: 'Jun', Kingston: 523550,  Montgomery: 0,      Farrell: 25050 },
  { month: 'Jul', Kingston: 556300,  Montgomery: 0,      Farrell: 30300 },
  { month: 'Aug', Kingston: 618800,  Montgomery: 51474,  Farrell: 36800 },
  { month: 'Sep', Kingston: 774250,  Montgomery: 88042,  Farrell: 74350 },
  { month: 'Oct', Kingston: 816400,  Montgomery: 95738,  Farrell: 83500 },
  { month: 'Nov', Kingston: 850700,  Montgomery: 96123,  Farrell: 88000 },
  { month: 'Dec', Kingston: 939550,  Montgomery: 125935, Farrell: 93500 },
  { month: 'Jan', Kingston: 948700,  Montgomery: 126299, Farrell: 116900 },
  { month: 'Feb', Kingston: 969850,  Montgomery: 153899, Farrell: 120660 },
  { month: 'Mar', Kingston: 1060710, Montgomery: 176027, Farrell: 128751 },
  { month: 'Apr', Kingston: 1088444, Montgomery: 185284, Farrell: 138626 },
];
const MONTHLY = [
  { month: 'Jun', Kingston: 523550, Montgomery: 0,     Farrell: 25050 },
  { month: 'Jul', Kingston: 32750,  Montgomery: 0,     Farrell: 5250  },
  { month: 'Aug', Kingston: 62500,  Montgomery: 51474, Farrell: 6500  },
  { month: 'Sep', Kingston: 155450, Montgomery: 36568, Farrell: 37550 },
  { month: 'Oct', Kingston: 42150,  Montgomery: 7696,  Farrell: 9150  },
  { month: 'Nov', Kingston: 34300,  Montgomery: 385,   Farrell: 4500  },
  { month: 'Dec', Kingston: 88850,  Montgomery: 29812, Farrell: 5500  },
  { month: 'Jan', Kingston: 9150,   Montgomery: 364,   Farrell: 23400 },
  { month: 'Feb', Kingston: 21150,  Montgomery: 27600, Farrell: 3760  },
  { month: 'Mar', Kingston: 90860,  Montgomery: 22128, Farrell: 8091  },
  { month: 'Apr', Kingston: 27734,  Montgomery: 9257,  Farrell: 9875  },
];

// === PROPERLY-BUCKETED DONATION DISTRIBUTION ===
// (earlier version was wrong — pd.cut used right-inclusive intervals)
const AMOUNT_DIST = [
  { bucket: '< $100',         short: '<$100',     Kingston: 16,  Montgomery: 3,  Farrell: 0  },
  { bucket: '$100 – 249',     short: '$100',      Kingston: 21,  Montgomery: 24, Farrell: 1  },
  { bucket: '$250 – 499',     short: '$250',      Kingston: 57,  Montgomery: 51, Farrell: 49 },
  { bucket: '$500 – 999',     short: '$500',      Kingston: 138, Montgomery: 43, Farrell: 50 },
  { bucket: '$1K – 2.4K',     short: '$1K',       Kingston: 305, Montgomery: 48, Farrell: 45 },
  { bucket: '$2.5K – 3.4K',   short: '$2.5K',     Kingston: 45,  Montgomery: 12, Farrell: 6  },
  { bucket: '$3,500 exactly', short: '$3.5K max', Kingston: 281, Montgomery: 24, Farrell: 9  },
  { bucket: '$3.5K – 6.9K',   short: '$3.5–7K',   Kingston: 10,  Montgomery: 1,  Farrell: 0  },
  { bucket: '$7,000 exactly', short: '$7K (2×)',  Kingston: 9,   Montgomery: 0,  Farrell: 0  },
  { bucket: '> $7,000',       short: '>$7K',      Kingston: 10,  Montgomery: 1,  Farrell: 0  },
];

// === OCCUPATIONS (unique donors with net > 0 — counts people, not checks) ===
const OCCUPATIONS = {
  Kingston: [
    { occ: 'Attorney',    n: 58 }, { occ: 'Retired', n: 45 }, { occ: 'Owner', n: 43 },
    { occ: 'Homemaker',   n: 37 }, { occ: 'President', n: 24 }, { occ: 'CEO', n: 24 },
    { occ: 'Physician',   n: 22 }, { occ: 'Consultant', n: 21 }, { occ: 'Real Estate', n: 14 },
    { occ: 'Partner',     n: 11 },
  ],
  Montgomery: [
    { occ: 'Retired', n: 42 }, { occ: 'Business Owner', n: 12 }, { occ: 'Attorney', n: 7 },
    { occ: 'Consultant', n: 4 }, { occ: 'CEO', n: 3 }, { occ: 'Manager', n: 3 },
    { occ: 'Registered Agent', n: 3 }, { occ: 'Officer', n: 2 }, { occ: 'Physician', n: 2 }, { occ: 'Real Estate', n: 2 },
  ],
  Farrell: [
    { occ: 'Retired', n: 35 }, { occ: 'Owner', n: 10 }, { occ: 'Attorney', n: 9 },
    { occ: 'Consultant', n: 4 }, { occ: 'Clerk', n: 3 }, { occ: 'Vice President', n: 3 },
    { occ: 'CEO', n: 3 }, { occ: 'President', n: 3 }, { occ: 'Longshoreman', n: 3 }, { occ: 'Dockworker', n: 3 },
  ],
};

// === TOP ZIPS WITH ACS HHI ===
// hhi = ZCTA median household income, ACS 2019–2023 5-year (B19013) — the same
// source the income-tier and weighted-average math uses, so the displayed
// numbers always match the computed ones. 31416 has no published ACS estimate;
// it carries null and is excluded from all income-based math and charts.
const TOP_ZIPS = [
  { zip: '31411', nbhd: 'Skidaway Island',   city: 'Savannah',      hhi: 122723, Kingston: 182750, Montgomery: 54077, Farrell: 12800 },
  { zip: '31406', nbhd: 'Southside',         city: 'Savannah',      hhi: 66084,  Kingston: 193600, Montgomery: 2551,  Farrell: 29930 },
  { zip: '31410', nbhd: 'Wilmington Island', city: 'Savannah',      hhi: 97225,  Kingston: 111325, Montgomery: 3151,  Farrell: 22010 },
  { zip: '31401', nbhd: 'Downtown Historic', city: 'Savannah',      hhi: 50182,  Kingston: 88250,  Montgomery: 520,   Farrell: 13500 },
  { zip: '31522', nbhd: 'St. Simons Island', city: 'St. Simons',    hhi: 106413, Kingston: 26300,  Montgomery: 14268, Farrell: 750   },
  { zip: '31324', nbhd: 'Richmond Hill',     city: 'Richmond Hill', hhi: 110767, Kingston: 66310,  Montgomery: 12960, Farrell: 2104  },
  { zip: '31405', nbhd: 'Habersham',         city: 'Savannah',      hhi: 62123,  Kingston: 57500,  Montgomery: 450,   Farrell: 8650  },
  { zip: '31416', nbhd: 'Isle of Hope/Oatland', city: 'Savannah',   hhi: null,   Kingston: 12250,  Montgomery: 0,     Farrell: 10050 },
  { zip: '31322', nbhd: 'Pooler',            city: 'Pooler',        hhi: 91293,  Kingston: 34750,  Montgomery: 4510,  Farrell: 3750  },
  { zip: '31419', nbhd: 'Westside',          city: 'Savannah',      hhi: 70734,  Kingston: 25775,  Montgomery: 898,   Farrell: 7520  },
  { zip: '31404', nbhd: 'Eastside',          city: 'Savannah',      hhi: 49805,  Kingston: 57500,  Montgomery: 0,     Farrell: 4750  },
  { zip: '30327', nbhd: 'Buckhead',          city: 'Atlanta',       hhi: 182317, Kingston: 53950,  Montgomery: 0,     Farrell: 0     },
  { zip: '30305', nbhd: 'Buckhead',          city: 'Atlanta',       hhi: 107836, Kingston: 28500,  Montgomery: 0,     Farrell: 0     },
  { zip: '31407', nbhd: 'Port Wentworth',    city: 'Savannah',      hhi: 83954,  Kingston: 21000,  Montgomery: 0,     Farrell: 1000  },
  { zip: '30269', nbhd: 'Peachtree City',    city: 'Peachtree City', hhi: 111093, Kingston: 10500, Montgomery: 0,     Farrell: 1600  },
  { zip: '31331', nbhd: 'Darien/Sapelo',     city: 'Darien',        hhi: 60669,  Kingston: 1000,   Montgomery: 8528,  Farrell: 0     },
  { zip: '31545', nbhd: 'Jesup',             city: 'Jesup',         hhi: 44260,  Kingston: 2000,   Montgomery: 8184,  Farrell: 0     },
];

const INCOME_TIER = [
  { tier: 'High ($125K+)',        Kingston: 4.5,  Montgomery: 0.6,  Farrell: 0.4  },
  { tier: 'Upper-Mid ($75–124K)', Kingston: 40.7, Montgomery: 46.6, Farrell: 36.6 },
  { tier: 'Middle ($50–74K)',     Kingston: 34.7, Montgomery: 20.8, Farrell: 53.5 },
  { tier: 'Low (<$50K)',          Kingston: 8.1,  Montgomery: 4.1,  Farrell: 6.6  },
  { tier: 'Out-of-state',         Kingston: 12.0, Montgomery: 27.9, Farrell: 2.8  },
];

const GEO = {
  Kingston:   { inDist: 727535, atlanta: 238859, outState: 122050 },
  Montgomery: { inDist: 124504, atlanta: 12783,  outState: 47998  },
  Farrell:    { inDist: 125966, atlanta: 9110,   outState: 3550   },
};

// === WEIGHTED-AVG DONOR ZIP INCOME + ACS COVERAGE ===
// wAvg = each donor's dollars weighted by their ZIP median HHI; cov = the share
// of the candidate's itemized dollars that fall in a ZIP with a published ACS
// estimate (the rest land in ZIPs with no estimate, e.g. 31416). Used by both
// the Geography tab and the Data Quality tab; verified by derive_dashboard_data.py --check.
const ZIP_INCOME = [
  { name: 'Kingston',   wAvg: 89384,  cov: 96.0 },
  { name: 'Montgomery', wAvg: 100616, cov: 92.8 },
  { name: 'Farrell',    wAvg: 78493,  cov: 88.5 },
];

// === QUALITY METRICS ===
const Q = {
  Kingston:   { donors: 609, repeatRate: 31.4, top20Pct: 12.6, avgGift: 2036, inDistPct: 66.8, maxed: 192, pac: 181450, selfPct: 0 },
  Montgomery: { donors: 150, repeatRate: 21.3, top20Pct: 48.0, avgGift: 1121, inDistPct: 67.2, maxed: 26,  pac: 8500,   selfPct: 7.8 },
  Farrell:    { donors: 137, repeatRate: 14.6, top20Pct: 46.1, avgGift: 885,  inDistPct: 90.9, maxed: 12,  pac: 250,    selfPct: 76.1 },
};

// === TRIPLE-MAX CLUB (gave Kingston $7,000+, primary+general+runoff) ===
// 77 total — top 15 shown. $10,500 = the legal per-cycle maximum (3 elections × $3,500)
const DOUBLE_MAX = [
  { name: 'Dale C. Critz Jr.',      city: 'Savannah',       occ: 'President (Critz Inc.)',               amount: 10500 },
  { name: 'TJ Hollis',              city: 'Savannah',       occ: 'Attorney (McManamy Jackson Hollis)',   amount: 10500 },
  { name: 'Christian B. Demere',    city: 'Savannah',       occ: 'President & CEO (Colonial Group)',     amount: 10500 },
  { name: 'William S. Dorsey III',  city: 'Savannah',       occ: 'President (Bridgeport Tire)',           amount: 10500 },
  { name: 'Olivia Molando',         city: 'Atlanta',        occ: 'Executive (Capital Development Partners)', amount: 10500 },
  { name: 'John Knox Porter Jr.',   city: 'Atlanta',        occ: 'CEO (Capital Development Partners)',   amount: 10500 },
  { name: 'Don L. Waters',          city: 'Savannah',       occ: 'Business Owner',                       amount: 10500 },
  { name: 'Byron L. Smith',         city: 'Richmond Hill',  occ: 'Owner (Smith Family Homes)',           amount: 10500 },
  { name: 'Teresa Hufstetler',      city: 'Thomasville',    occ: 'Homemaker',                            amount: 10500 },
  { name: 'Steve Hufstetler',       city: 'Thomasville',    occ: 'Real Estate Developer (Teramore)',     amount: 10500 },
  { name: 'F. Reed Dulany III',     city: 'Savannah',       occ: 'Chairman/CEO (Dulany Industries)',     amount: 10500 },
  { name: 'Marvin Daniel',          city: 'Richmond Hill',  occ: 'Founder/Chairman (Daniel Defense)',    amount: 10500 },
  { name: 'William Pattiz',         city: 'New York, NY',   occ: 'Filmmaker (Sea Raven Media)',          amount: 7000  },
  { name: 'James A. Pattiz',        city: 'Peachtree City', occ: 'Filmmaker (Sea Raven)',                amount: 7000  },
  { name: 'John Skeadas III',       city: 'Savannah',       occ: 'Investment Manager (First Capital City)', amount: 7000  },
];

// Every employer cluster with 3+ donors (OrthoAtlanta and Bernard Williams
// arrived in the March refresh; HunterMaclean reached 3 donors in April).
const BUNDLERS = [
  { firm: 'Pintail Site Preparation',    n: 4,  total: 27000 },
  { firm: 'Critz Inc.',                  n: 4,  total: 26500 },
  { firm: "Mingledorff's Inc.",          n: 4,  total: 22250 },
  { firm: 'Sterling Seacrest Pritchard', n: 3,  total: 13000 },
  { firm: 'OrthoAtlanta',                n: 12, total: 10500 },
  { firm: 'Oliver Maner LLP',            n: 5,  total: 10500 },
  { firm: 'Weiner Shearouse Weitz Greenberg & Shawe', n: 5, total: 9500 },
  { firm: 'Tiber Creek Group',           n: 9,  total: 8750  },
  { firm: 'HunterMaclean',               n: 3,  total: 6500  },
  { firm: 'Osteen Law Group',            n: 3,  total: 3500  },
  { firm: 'Bernard Williams & Company',  n: 3,  total: 1350  },
];

// Cross-candidate totals join donors on punctuation-normalized names — the
// committees punctuate the same person differently ('WATERS, DON L.' vs
// 'WATERS, DON L'), which previously hid Waters, Byron Smith, and Mark Smith.
const SHARED = [
  { name: 'Don L. Waters',     city: 'Savannah 31401',      Kingston: 10500, Montgomery: 0,    Farrell: 5000, tone: 'warm' },
  { name: 'Byron L. Smith',    city: 'Richmond Hill 31324', Kingston: 10500, Montgomery: 1000, Farrell: 1000, tone: 'warm' },
  { name: 'Ben B. Wall',       city: 'Pooler 31322',     Kingston: 3500, Montgomery: 0,    Farrell: 2500, tone: 'warm' },
  { name: 'Martin J. Miller',  city: 'Savannah 31416',   Kingston: 2000, Montgomery: 0,    Farrell: 3300, tone: 'hot' },
  { name: 'Logan R. Abbott',   city: 'Savannah 31406',   Kingston: 500,  Montgomery: 0,    Farrell: 3500, tone: 'hot' },
  { name: 'Mark V. Smith',     city: 'Savannah',         Kingston: 1000, Montgomery: 0,    Farrell: 1000, tone: 'warm' },
  { name: 'Ryan Schneider',    city: 'Savannah 31405',   Kingston: 1000, Montgomery: 0,    Farrell: 500,  tone: 'warm' },
  { name: 'Mills Fleming',     city: 'Savannah 31401',   Kingston: 500,  Montgomery: 520,  Farrell: 0,    tone: 'warm' },
  { name: 'Freda M. Smith',    city: 'Savannah 31401',   Kingston: 500,  Montgomery: 0,    Farrell: 500,  tone: 'low' },
  { name: 'Yong Choe',         city: 'Washington DC',    Kingston: 500,  Montgomery: 0,    Farrell: 500,  tone: 'low' },
  { name: 'Jacob Lee Nolan',   city: 'Screven 31560',    Kingston: 0,    Montgomery: 300,  Farrell: 300,  tone: 'low' },
];

// === TIMELINE EVENTS ===
const TIMELINE = [
  { date: '2025-05-08', label: 'Buddy Carter announces Senate run — seat opens',  who: 'Context' },
  { date: '2025-05-15', label: 'Farrell files FEC committee',                     who: 'Farrell' },
  { date: '2025-06-18', label: 'Kingston registers; launches with $524K month',   who: 'Kingston' },
  { date: '2025-07-17', label: 'Farrell formal announcement at Forest City Gun Club', who: 'Farrell' },
  { date: '2025-08-25', label: 'Montgomery files Statement of Candidacy',         who: 'Montgomery' },
  { date: '2025-09-15', label: 'Kingston Q3 surge ($155K month)',                 who: 'Kingston' },
  { date: '2026-03-06', label: 'Qualifying deadline — Farrell forced out of commission seat', who: 'Farrell' },
  { date: '2026-04-14', label: 'TRUMP ENDORSES KINGSTON',                         who: 'Kingston', flag: true },
  { date: '2026-05-19', label: 'PRIMARY ELECTION DAY',                            who: 'All', flag: true },
  { date: '2026-06-16', label: 'Runoff (if needed)',                              who: 'All' },
];

// === RUNWAY BURN-DOWN DATA (projected forward from Apr 20, 2026) ===
// Actual cash on hand at the two FEC report dates — the Q1 close and the
// pre-primary report. The real April drawdown, not a projection (FEC Form 3).
const RUNWAY = [
  { day: 'Mar 31', Kingston: 1291387, Montgomery: 45445, Farrell: 410073 },
  { day: 'Apr 29', Kingston: 949215,  Montgomery: 45140, Farrell: 62832  },
];

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
      <div className="dk-insight-grid" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0 }}>
        <div className="dk-insight-accent" style={{
          background: accent, color: '#FBF8F2',
          padding: '24px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: 200,
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, opacity: 0.8 }}>INSIGHT</div>
            <div className="dk-insight-num" style={{ fontFamily: 'Fraunces, serif', fontSize: 56, fontWeight: 300, lineHeight: 1, marginTop: 8, fontStyle: 'italic' }}>{n}</div>
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

// Track mobile viewport so charts get responsive props (Recharts sizes by prop, not CSS)
const useIsMobile = () => {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return m;
};

/* ============================================================
   TAB 1: OVERVIEW
   ============================================================ */
const TabOverview = () => {
  const isMobile = useIsMobile();
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
  // Custom 2-line radar tick (Recharts ignores the \n). The top label (Total Receipts)
  // renders above its vertex and the bottom one (PAC Support) below it, so neither
  // collides with the grid/radius numbers; the four side labels stay vertically centered.
  const radarTick = ({ x, y, textAnchor, payload }) => {
    const lines = String(payload.value).split('\n');
    const n = lines.length, L = 1.1;
    const head = lines[0];
    const dy0 = head === 'Total' ? -(n - 1) * L - 0.2   // top vertex → sit above the point
              : head === 'PAC'   ? 1.0                   // bottom vertex → sit below the point
              : 0.32 - (n - 1) / 2 * L;                  // sides → vertically centered
    return (
      <text x={x} y={y} textAnchor={textAnchor} fontFamily="DM Sans" fontSize={isMobile ? 10 : 12} fontWeight={600} fill={P.ink}>
        {lines.map((l, i) => <tspan key={i} x={x} dy={`${i === 0 ? dy0 : L}em`}>{l}</tspan>)}
      </text>
    );
  };

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
              A frontrunner built on big checks and a legacy network.
            </h1>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.55, marginTop: 8, marginBottom: 0, opacity: 0.9 }}>
              Kingston has out-raised Farrell and Montgomery combined roughly 2-to-1, with about 9× the field's cash on hand by late April — enough to contest a first-round majority on May 19 and avoid the June 16 runoff.
            </p>
          </div>
          <div className="dk-hero-date" style={{ textAlign: 'center', minWidth: 110 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: P.kingstonAccent, marginBottom: 2, fontWeight: 700 }}>Data Through</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 54, fontWeight: 300, lineHeight: 1 }}>Apr 29</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Pre-primary filing</div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="dk-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        <Card><Stat label="Total Raised"  value={fmtK(FIN.Kingston.receipts)} sub={`${Math.round(FIN.Kingston.receipts/totalField*100)}% of field's money`}/></Card>
        <Card><Stat label="Cash on Hand"  value={fmtK(FIN.Kingston.cash)}     sub="9× the rest of field combined" accent={P.success}/></Card>
        <Card><Stat label="Unique Donors" value={fmtN(Q.Kingston.donors)}     sub={`vs. ${Q.Montgomery.donors + Q.Farrell.donors} for the rest of the field`}/></Card>
        <Card><Stat label="$3.5K Max-Outs" value="281"                         sub="32% of itemized contributions" accent={P.kingstonAccent}/></Card>
        <Card tone="warning"><Stat label="Unused Donor Room" value="$1.04M"    sub="legal giving room among existing donors" accent={P.warning}/></Card>
      </div>

      {/* Candidate cards */}
      <SectionH eyebrow="The Field" title="Three candidates, one seat" kicker="All three financial pictures side by side, through FEC filings ending April 29, 2026."/>
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
                {isK && <Tag tone="gold">SUBJECT</Tag>}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>{fmtK(d.receipts)}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>total receipts</div>
              <div className="dk-rank-stats" style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${isK ? 'rgba(255,255,255,0.15)' : P.line}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, fontFamily: 'DM Sans' }}>
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
        <SectionH eyebrow="Shape of the race" title="Candidate comparison, 6 dimensions" kicker="Each axis is normalized. A bigger shape = a broader campaign. Kingston leads on every dimension; Farrell registers only on in-district concentration — a function of raising almost entirely within 31xxx ZIPs."/>
        <ResponsiveContainer width="100%" height={isMobile ? 290 : 470}>
          <RadarChart data={radarData} margin={isMobile ? { top: 24, right: 46, bottom: 24, left: 46 } : { top: 36, right: 40, bottom: 36, left: 40 }}>
            <PolarGrid stroke={P.line}/>
            <PolarAngleAxis dataKey="metric" tick={radarTick}/>
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: P.muted }} axisLine={false}/>
            <Radar name="Kingston"   dataKey="Kingston"   stroke={P.kingston}   fill={P.kingston}   fillOpacity={0.35} strokeWidth={2}/>
            <Radar name="Montgomery" dataKey="Montgomery" stroke={P.montgomery} fill={P.montgomery} fillOpacity={0.25} strokeWidth={2}/>
            <Radar name="Farrell"    dataKey="Farrell"    stroke={P.farrell}    fill={P.farrell}    fillOpacity={0.20} strokeWidth={2}/>
            {!isMobile && <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>}
          </RadarChart>
        </ResponsiveContainer>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, paddingTop: 6, fontFamily: 'DM Sans', fontSize: 12 }}>
            {['Kingston', 'Montgomery', 'Farrell'].map(n => (
              <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: C[n].color }}/>{n}
              </span>
            ))}
          </div>
        )}
        <WhyMatters>
          A broader shape signals a campaign with more ways to raise — individual donors, institutional money, reach beyond a narrow base. Kingston's shape nearly fills the chart; both challengers hug the center on almost every axis. That imbalance is what a broad fundraising coalition looks like in data form.
        </WhyMatters>
      </Card>

      {/* Timeline */}
      <Card style={{ padding: 28 }}>
        <SectionH eyebrow="Campaign chronology" title="How the race took shape" kicker="Ten months of campaign activity, mapped against the primary clock."/>
        <div style={{ position: 'relative', padding: '10px 0 10px 30px', borderLeft: `2px solid ${P.line}` }}>
          {TIMELINE.map((ev, i) => {
            const candColor = ev.who === 'Kingston' ? P.kingston : ev.who === 'Montgomery' ? P.montgomery : ev.who === 'Farrell' ? P.farrell : P.muted;
            const date = new Date(ev.date);
            const isPast = date < new Date('2026-04-29');
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
    { name: 'Donor contributions', value: FIN.Farrell.indiv,      color: P.farrell },
    { name: 'PACs',             value: FIN.Farrell.pac,        color: P.kingstonAccent },
  ];
  const farrellTotal = farrellPie.reduce((s, p) => s + p.value, 0);

  return (
    <div>
      <SectionH eyebrow="The money" title="Where it came from, where it's going"
        kicker="Eleven months of primary-election fundraising, plus pre-primary (through April 29) summary data on total receipts, disbursements, and cash on hand."/>

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
            <Tag tone="default" style={{ background: 'rgba(255,255,255,0.2)', color: '#FBF8F2' }}>KEY FINDING</Tag>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, margin: '12px 0 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Pat Farrell's $657K is mostly his own money — $157K from donors, plus a $500,000 personal loan.
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
            <div style={{ textAlign: 'center', marginTop: -180, fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 600, color: P.danger, pointerEvents: 'none' }}>76%</div>
            <div style={{ textAlign: 'center', marginTop: 0, fontSize: 11, color: P.muted, pointerEvents: 'none' }}>self-funded</div>
            <div className="dk-farrell-legend" style={{ marginTop: 160, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
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
                Only <strong>137 individual donors</strong> have given Farrell money — a total of <strong>{fmtK(FIN.Farrell.indiv)}</strong>. He loaned his own campaign <strong style={{ color: P.danger }}>${(FIN.Farrell.selfLoans/1000).toFixed(0)},000</strong> to make up the difference. For context, Jim Kingston borrowed <strong>$0</strong> and raised <strong>{fmtK(FIN.Kingston.indiv)}</strong> — from <strong>{Q.Kingston.donors} individual donors</strong>.
              </p>
              <div style={{ background: P.bg, borderRadius: 10, padding: '14px 16px', borderLeft: `4px solid ${P.danger}`, marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: P.kingston, marginBottom: 4, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>What happens to the $500K?</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                  Federal law once capped post-election repayment of candidate loans at $250,000, but the Supreme Court struck that cap down in <strong><em>FEC v. Cruz</em> (2022)</strong>. Farrell's constraint is practical, not legal: a loan can only be repaid with money the campaign actually raises, and campaigns that lose a primary rarely raise much afterward. If he loses on May 19, <strong>most of the $500,000 likely stays unrecovered</strong>.
                </p>
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 14, color: P.muted, fontStyle: 'italic' }}>
                It is the clearest single signal in Farrell's filing: a campaign financed largely by the candidate rather than by donors — 22 years in office, $157K from voters, $500K from himself.
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
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Cash drawn down into the final stretch</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Actual cash on hand at the two FEC report dates. Between March 31 and April 29, Kingston spent $386K (holding $949K) and Farrell spent $358K (draining to $63K), while Montgomery spent only the ~$16K he raised and stayed flat at $45K. The two candidates with money to spend both emptied a war chest into the close — but only Kingston could do it without denting his lead.</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={RUNWAY} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
            <XAxis dataKey="day" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false}/>
            <YAxis tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Line type="monotone" dataKey="Kingston"   stroke={P.kingston}   strokeWidth={3} dot={{ r: 4 }}/>
            <Line type="monotone" dataKey="Farrell"    stroke={P.farrell}    strokeWidth={2} dot={{ r: 3 }}/>
            <Line type="monotone" dataKey="Montgomery" stroke={P.montgomery} strokeWidth={2} dot={{ r: 3 }}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </LineChart>
        </ResponsiveContainer>
        <WhyMatters tone="warning">
          The pre-primary report covers through April 29 — all but the final three weeks before the May 19 vote. Going into that stretch Kingston still held ~$949K, against Farrell's $63K and Montgomery's $45K. Cash on hand is what buys closing TV and mail, and only Kingston had the reserves to keep spending through primary day; the challengers had effectively spent out.
        </WhyMatters>
      </Card>

      {/* PAC support */}
      <Card style={{ padding: 22 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>PAC / committee contributions</h3>
        <p style={{ fontSize: 12, color: P.muted, margin: '0 0 14px' }}>A proxy for Washington and institutional support. Farrell's $250 is essentially zero — no trade group or party entity has contributed.</p>
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
          PAC money signals that Washington insiders, trade associations, and party organizations believe a candidate is electable — and it unlocks relationships that matter after the election for committee assignments, floor time, and vendor introductions. Kingston's $181K signals institutional GOP support; Farrell's $250 signals essentially none.
        </WhyMatters>
      </Card>
    </div>
  );
};

/* ============================================================
   TAB 3: DONORS
   ============================================================ */
const TabDonors = () => {
  const isMobile = useIsMobile();
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
              281 contributions to Kingston hit exactly $3,500.
            </h3>
            <p style={{ fontSize: 14, color: P.muted, margin: '6px 0 0', maxWidth: 760 }}>
              That's the federal max-per-election limit. It's the single biggest signal in the distribution — and it's why the chart spikes so dramatically at one specific bucket. 32% of Kingston's itemized contributions hit the cap exactly. Montgomery: 24. Farrell: 9.
            </p>
          </div>
        </div>
        <div className="dk-cliff-wrap">
        <ResponsiveContainer width="100%" height={isMobile ? 240 : 340}>
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
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.kingston}` }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Kingston at the cap</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: P.kingston, marginTop: 2 }}>281 <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>· $983,500</span></div>
          </div>
          <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.montgomery}` }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Montgomery at the cap</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: P.montgomery, marginTop: 2 }}>24 <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>· $84,000</span></div>
          </div>
          <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.farrell}` }}>
            <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Farrell at the cap</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: P.farrell, marginTop: 2 }}>9 <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>· $31,500</span></div>
          </div>
        </div>
        <WhyMatters tone="warning">
          A $3,500-exactly check means a donor consulted their calendar, wrote for the legal maximum, and made a strategic bet on the race. 281 such contributions came in for Kingston. These are not casual supporters — they're the hardest-to-acquire donor profile, and they're 8.5× more common on Kingston's side than on both opponents' combined (281 vs. 33). A primary where one candidate has an order-of-magnitude advantage on maxed-out donors is not a close primary.
        </WhyMatters>
      </Card>

      {/* Quality scorecard */}
      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>Donor base quality scorecard</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Checkmark = best on that metric. Kingston leads on five of seven. The two without a winner (average gift, in-district %) are context metrics — his average gift is the field's largest, and his in-district share is the lowest because a third of his money comes from Atlanta and out of state.</p>
        <div className="dk-scroll-hint" style={{ display: 'none', fontSize: 11, color: P.kingston, fontWeight: 700, marginBottom: 8, letterSpacing: '0.03em' }}>← swipe to compare all three candidates →</div>
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
          These seven metrics separate a real grassroots coalition from a "big-check" campaign that looks well-funded but has no depth. <strong>Repeat donor rate</strong> measures loyalty and future giving potential. <strong>Top-20 concentration</strong> measures fragility — if Farrell loses one of his top 20 donors, he loses over 2% of his entire war chest. <strong>Primary max-outs</strong> signals donor confidence in winning. Kingston leads on five of seven; the two without a winner (average gift, in-district %) reflect the shape of his coalition — the field's largest average gift, and the lowest in-district share because a third of his money comes from Atlanta and out of state.
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
        Occupation mix is a read on <strong>coalition breadth</strong>: a base of attorneys, owners, and executives overlaps heavily with chamber-of-commerce and business networks. Kingston runs on a classic professional-class coalition; Montgomery's base skews retired (smaller base); Farrell's skews self-employed small-business (narrower, more local). It is not a turnout measure — occupation says nothing about who actually votes, and this dataset carries no voter-file or turnout data.
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
          <p style={{ fontSize: 12, color: P.muted, margin: '0 0 12px' }}>Employers with 3+ donors — someone inside likely organized it, a marker of employer-linked donor networks.</p>
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
/* ============================================================
   GEOGRAPHIC MAPS — real GA ZCTA boundaries (geo_zips.json, built by
   derive_geo_data.py from Census TIGER ZCTAs). Choropleth + bubble,
   per candidate, bubbles colored by neighborhood income. d3-geo projection.
   ============================================================ */
const GEO_TIERS = [
  { key: 'High',     label: 'High · $125K+',       min: 125000, color: '#1E3A5F' },
  { key: 'UpperMid', label: 'Upper-mid · $75–124K', min: 75000,  color: '#3A6B8C' },
  { key: 'Middle',   label: 'Middle · $50–74K',     min: 50000,  color: '#D4A94A' },
  { key: 'Low',      label: 'Low · <$50K',          min: 0,      color: '#C4723E' },
];
const tierOf = (hhi) => (hhi == null ? null : GEO_TIERS.find(t => hhi >= t.min));

const GeoMaps = () => {
  const [cand, setCand] = useState('Kingston');
  const [hover, setHover] = useState(null);
  const key = cand[0];                       // 'K' | 'M' | 'F'
  const W = 330, H = 420, pad = 12;
  const feats = GEO_ZIPS.features;
  const district = useMemo(() => ({ type: 'Feature', geometry: GEO_ZIPS.district }), []);
  const candColor = C[cand].color;
  const usd = (n) => '$' + Math.round(n).toLocaleString();
  // Single projection fit to the real GA-1 boundary, so the district frames the map.
  const proj = useMemo(() => geoMercator().fitExtent([[pad, pad], [W - pad, H - pad]], district), [district]);
  const path = useMemo(() => geoPath(proj), [proj]);
  const districtPath = useMemo(() => path(district), [path, district]);
  const maxAmt = useMemo(() => Math.max(1, ...feats.map(f => f.properties[key])), [key, feats]);
  const rowRef = useRef(null);
  const onMove = (p) => (e) => {
    const r = rowRef.current.getBoundingClientRect();
    setHover({ p, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };
  const off = () => setHover(null);
  const choro = (f) => {
    const v = f.properties[key]; const op = v > 0 ? 0.14 + 0.86 * Math.sqrt(v / maxAmt) : 0.05;
    return <path key={f.properties.zip} d={path(f)} fill={candColor} fillOpacity={op} stroke="#fff" strokeWidth={0.4}
      onMouseMove={onMove(f.properties)} onMouseLeave={off} />;
  };
  const bubble = (f) => {
    const p = proj([f.properties.lon, f.properties.lat]); if (!p) return null;
    const r = 2 + Math.sqrt(f.properties[key] / maxAmt) * 26; const tier = tierOf(f.properties.hhi);
    return <circle key={f.properties.zip} cx={p[0]} cy={p[1]} r={r} fill={tier ? tier.color : '#9A9A9A'} fillOpacity={0.74} stroke="#fff" strokeWidth={0.7}
      onMouseMove={onMove(f.properties)} onMouseLeave={off} />;
  };
  const bubbleFeats = feats.filter(f => f.properties[key] > 0).sort((a, b) => b.properties[key] - a.properties[key]);

  const Frame = ({ title, children }) => (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: P.bg, borderRadius: 10, border: `1px solid ${P.line}` }}>
        {children}
      </svg>
    </div>
  );

  return (
    <Card style={{ padding: 22, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: 0, color: P.kingston }}>Where the money is — inside GA-1</h3>
          <p style={{ fontSize: 12, color: P.muted, margin: '4px 0 0', maxWidth: 580 }}>The real 1st Congressional District (current 119th-Congress lines). The choropleth shades each in-district ZIP by <strong style={{ color: candColor }}>{cand}'s</strong> dollars; the bubbles size by dollars and color by neighborhood income. Out-of-district money (Atlanta, out-of-state) sits in the breakdown below.</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Kingston', 'Montgomery', 'Farrell'].map(c => (
            <button key={c} onClick={() => setCand(c)} style={{
              border: `1px solid ${cand === c ? C[c].color : P.line}`, background: cand === c ? C[c].color : P.paper,
              color: cand === c ? '#fff' : P.muted, borderRadius: 8, padding: '6px 12px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans',
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div ref={rowRef} style={{ position: 'relative', display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        <Frame title="Choropleth — dollars by ZIP">
          <path d={districtPath} fill="none" stroke={P.kingston} strokeWidth={1.2} strokeOpacity={0.5} />
          {feats.map(choro)}
        </Frame>
        <Frame title="Bubbles — size = dollars · color = income">
          <path d={districtPath} fill={P.paper} stroke={P.kingston} strokeWidth={1.2} strokeOpacity={0.5} />
          {feats.map(f => <path key={'g' + f.properties.zip} d={path(f)} fill={P.line} fillOpacity={0.35} stroke="#fff" strokeWidth={0.3}
            onMouseMove={onMove(f.properties)} onMouseLeave={off} />)}
          {bubbleFeats.map(bubble)}
        </Frame>
        {hover && (
          <div style={{
            position: 'absolute', top: Math.max(2, hover.y - 6),
            left: hover.x < hover.w - 190 ? hover.x + 14 : undefined,
            right: hover.x < hover.w - 190 ? undefined : hover.w - hover.x + 14,
            pointerEvents: 'none', zIndex: 10, background: P.paper,
            border: `1px solid ${P.kingston}`, borderRadius: 8, boxShadow: '0 8px 20px rgba(31,58,95,0.18)',
            padding: '8px 11px', fontFamily: 'DM Sans', fontSize: 12, whiteSpace: 'nowrap',
          }}>
            <div style={{ fontWeight: 700, color: P.kingston }}>{hover.p.zip}{hover.p.city ? ' · ' + hover.p.city : ''}</div>
            <div style={{ color: P.ink, marginTop: 2 }}><strong style={{ color: candColor }}>{usd(hover.p[key])}</strong> to {cand}</div>
            <div style={{ color: P.muted, marginTop: 1 }}>{hover.p.hhi != null ? '$' + (hover.p.hhi / 1000).toFixed(0) + 'K median income' : 'income n/a'}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {GEO_TIERS.map(t => (
            <span key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: P.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, display: 'inline-block' }} />{t.label}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: P.mutedLight, minHeight: 18 }}>
          Hover any ZIP or bubble for its dollars &amp; income · {feats.length} in-district ZIPs
        </div>
      </div>
    </Card>
  );
};

const TabGeography = () => {
  const isMobile = useIsMobile();
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

  return (
    <div>
      <SectionH eyebrow="The map" title="Geography & income" kicker="Every candidate's donor map tells a different story."/>
      <GeoMaps/>

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
            $639,819 came from Georgia ZIPs with median household income of $90K or more — <strong>roughly 14× what Farrell raised from the same neighborhoods, 6.2× what Montgomery raised.</strong> Kingston's weighted donor ZIP income is $89K, 20% above Georgia's median.
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

                {/* KINGSTON DONORS callout — $89,563 weighted avg → x = 20 + (89.563−30)×4.5667 ≈ 292 */}
                <g>
                  <rect x="215" y="4" width="130" height="42" fill="#FFFFFF" stroke={P.kingston} strokeWidth="1.5" rx="4"/>
                  <text x="280" y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill={P.kingston} fontFamily="DM Sans, sans-serif" letterSpacing="0.5">KINGSTON DONORS</text>
                  <text x="280" y="39" textAnchor="middle" fontSize="13" fontWeight="600" fill={P.kingston} fontFamily="Fraunces, serif">$89K weighted avg</text>
                  <line x1="280" y1="46" x2="292" y2="88" stroke={P.kingston} strokeWidth="1.5"/>
                  <circle cx="292" cy="95" r="7" fill={P.kingston} stroke="#FFFFFF" strokeWidth="2"/>
                </g>

                {/* TOP 8 WEALTHY ZIPs callout — $114,678 avg ACS HHI → x ≈ 407 */}
                <g>
                  <rect x="355" y="4" width="130" height="42" fill="#FFFFFF" stroke={P.kingstonAccent} strokeWidth="1.5" rx="4"/>
                  <text x="420" y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill="#8B6614" fontFamily="DM Sans, sans-serif" letterSpacing="0.5">TOP 8 WEALTHY ZIPS</text>
                  <text x="420" y="39" textAnchor="middle" fontSize="13" fontWeight="600" fill="#8B6614" fontFamily="Fraunces, serif">$115K avg</text>
                  <line x1="420" y1="46" x2="407" y2="88" stroke={P.kingstonAccent} strokeWidth="1.5"/>
                  <circle cx="407" cy="95" r="7" fill={P.kingstonAccent} stroke="#FFFFFF" strokeWidth="2"/>
                </g>

                {/* Gradient bar */}
                <rect x="20" y="88" width="760" height="14" fill="url(#incomeAxis)" rx="7"/>

                {/* Small reference dots ON the bar — GA-1 $66,773 → x≈188; GA $74,632 → x≈224; US $77,719 → x≈239 */}
                <circle cx="188" cy="95" r="4" fill="#FFFFFF" stroke={P.muted} strokeWidth="1.5"/>
                <circle cx="224" cy="95" r="4" fill="#FFFFFF" stroke={P.muted} strokeWidth="1.5"/>
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
                  <path d="M 224 178 L 407 178" stroke={P.kingstonAccent} strokeWidth="1.5"/>
                  <polygon points="407,178 399,174 399,182" fill={P.kingstonAccent}/>
                  <text x="316" y="197" fontSize="9" fill={P.kingstonAccent} fontFamily="DM Sans, sans-serif" textAnchor="middle" fontWeight="700" letterSpacing="1.2">KINGSTON'S MONEY SKEWS RIGHT</text>
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
                GA-1 district: <strong style={{ color: P.ink }}>$67K</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF', border: `1.5px solid ${P.muted}`, display: 'inline-block' }}/>
                GA state median: <strong style={{ color: P.ink }}>$75K</strong>
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
              Kingston's haul from the top wealthy Georgia ZIPs (ACS median HHI ≥ $90K · top 8 of 41 qualifying)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { zip: '31411', nbhd: 'Skidaway Island',     city: 'Savannah',       hhi: 122723, K: 180800, M: 54077, F: 12800 },
                { zip: '31410', nbhd: 'Wilmington Island',   city: 'Savannah',       hhi: 97225,  K: 105250, M: 1551,  F: 22010 },
                { zip: '31324', nbhd: 'Richmond Hill',       city: 'Richmond Hill',  hhi: 110767, K: 66310,  M: 12960, F: 1000  },
                { zip: '30327', nbhd: 'Buckhead',            city: 'Atlanta',        hhi: 182317, K: 53950,  M: 0,     F: 0     },
                { zip: '31322', nbhd: 'Pooler',              city: 'Pooler',         hhi: 91293,  K: 34750,  M: 4510,  F: 3750  },
                { zip: '30305', nbhd: 'Buckhead',            city: 'Atlanta',        hhi: 107836, K: 27000,  M: 0,     F: 0     },
                { zip: '31522', nbhd: 'St. Simons Island',   city: 'St. Simons',     hhi: 106413, K: 26300,  M: 12268, F: 750   },
                { zip: '30519', nbhd: 'Buford',              city: 'Buford',         hhi: 98846,  K: 21000,  M: 0,     F: 0     },
              ].map(z => {
                const maxK = 180800;
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
                // Sum over ALL 41 Georgia ZIPs with ACS median HHI ≥ $90K — the
                // stated criterion — not just the eight shown above.
                { name: 'Kingston',   total: 639819, color: P.kingston   },
                { name: 'Montgomery', total: 102579, color: P.montgomery },
                { name: 'Farrell',    total: 45614,  color: P.farrell    },
              ].map(d => {
                const barPct = (d.total / 628260) * 100;
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
              <strong style={{ color: P.kingston }}>Why this matters:</strong> Wealthy ZIPs are the natural network for future bundling, and Kingston has consolidated them — his <strong>$628K</strong> from these neighborhoods dwarfs opponents' combined <strong>$140K</strong>. Whether those donors also vote at higher rates is a separate question this fundraising data can't answer.
            </div>
          </div>

        </div>
        <div style={{ padding: '14px 22px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 11, color: P.muted, lineHeight: 1.5 }}>
          <strong style={{ color: P.kingston }}>Sources:</strong> Dollars from FEC Schedule A. ZIP median household income from U.S. Census Bureau American Community Survey (ACS) 2019–2023 5-year estimates (ZCTA table B19013; ZIP 31416 has no published estimate and is excluded from income calculations). GA state median $74,632 and US median $77,719 are ACS 2023 1-year estimates. GA-1 district median $66,773 is the published ACS 2019–2023 5-year estimate for the district.
        </div>
      </Card>

      <Card style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: P.kingston }}>In-district, in-state, out-of-state</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 14px', maxWidth: 740 }}>
          Farrell: 90% in-district, only <strong>5 out-of-state donors total.</strong> He has no national network. Kingston: $353K from outside GA-1, much of it Atlanta and DC. Montgomery's out-of-state bloc ($48K) is his military brotherhood.
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
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 14px' }}>Each bar shows the split across candidates in that ZIP. Kingston dominates everywhere except 31331 and 31545.</p>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart data={zipForChart} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={P.line} horizontal={false}/>
            <XAxis type="number" tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="label" width={isMobile ? 48 : 200} tickFormatter={(v) => isMobile ? String(v).split('·')[0].trim() : v} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.ink }} axisLine={false} tickLine={false}/>
            <Tooltip content={<TTip/>}/>
            <Bar dataKey="Kingston"   stackId="a" fill={P.kingston}/>
            <Bar dataKey="Montgomery" stackId="a" fill={P.montgomery}/>
            <Bar dataKey="Farrell"    stackId="a" fill={P.farrell} radius={[0,4,4,0]}/>
            <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 12 }}/>
          </BarChart>
        </ResponsiveContainer>
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
          {ZIP_INCOME.map(d => (
            <div key={d.name} style={{ padding: 14, borderLeft: `4px solid ${C[d.name].color}`, background: P.bg, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.kingston, marginTop: 4 }}>${d.wAvg.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{d.cov}% coverage</div>
            </div>
          ))}
          <div style={{ marginTop: 4, padding: '11px 13px', background: P.paper, border: `1px solid ${P.line}`, borderRadius: 8, fontSize: 11.5, color: P.muted, lineHeight: 1.55 }}>
            <strong style={{ color: P.kingston }}>Why Montgomery's reads higher than Kingston's:</strong> this is the income of the <em>neighborhoods</em> donors live in, dollar-weighted — not the candidates' or their donors' own incomes. Montgomery's smaller pool is concentrated in a few of the wealthiest coastal ZIPs (Skidaway Island, his single biggest source, is the priciest ZIP in the Savannah core), which lifts his average. Kingston's much larger base leans on middle-income Savannah neighborhoods — his biggest single ZIP, Southside, sits right around the GA-1 median — pulling his average down. So a higher number here means money <em>more concentrated in wealthy ZIPs</em>, not a wealthier coalition.
          </div>
        </Card>
      </div>

      <WhyMatters>
        Income distribution indicates the kind of coalition behind each candidate's money. Kingston's balanced income profile (strong at every tier, not just wealthy) is broad enough to extend into a general electorate. Montgomery's weighted average is actually higher than Kingston's — but it rests on a donor pool barely a quarter the size, so it's a much thinner signal. Farrell has the narrowest income band; his coalition will struggle to stretch into general-election Republican voters who don't already know him.
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
                  <div style={{ fontSize: 10, color: P.muted }}>{z.hhi != null ? '$' + (z.hhi/1000).toFixed(0) + 'K HHI' : 'HHI n/a'}</div>
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
    <SectionH eyebrow="The race" title="The field" kicker="Bios, strengths, weaknesses, and each candidate's key vulnerabilities."/>

    {/* KINGSTON */}
    <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden', border: `2px solid ${P.kingstonAccent}` }}>
      <div style={{ background: `linear-gradient(135deg, ${P.kingston} 0%, ${P.kingstonLight} 100%)`, color: '#FBF8F2', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75, fontWeight: 700 }}>The frontrunner</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Jim Kingston</h3>
            <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>34 · Son of Rep. Jack Kingston (GA-1, 1993–2015) · Savannah native · Trump-endorsed</div>
          </div>
          <div className="dk-field-receipts" style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500 }}>{fmtK(FIN.Kingston.receipts)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>total receipts · <strong>$949K cash on hand</strong></div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: 22, gap: 22 }}>
        <div>
          <Tag tone="success">Strengths</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>Trump endorsement</strong> (Apr 14) — neither challenger has one</li>
            <li>$1.86M raised — 7× Montgomery, 3× Farrell; $949K cash on hand ≈ 9× the rest of the field combined</li>
            <li>609 unique donors — 4.4× Farrell's count; donor velocity ~55/month sustained</li>
            <li>77 ultra-loyalists (≥$7K); 11 bundler firms organizing stacked giving across employee rosters</li>
            <li>Legacy network: Jack Kingston's 30-year Savannah donor and business base showing up intact</li>
            <li>Atlanta moat — $111K from Buckhead/Peachtree City/Sandy Springs ZIPs where opponents raised a combined $5K</li>
            <li>Zero self-funding, zero debt — entirely outside money, no candidate financing on the books</li>
          </ul>
        </div>
        <div>
          <Tag tone="danger">Weaknesses</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>Retiree mix.</strong> 7% of donors are retirees vs Montgomery's 28% — a coalition-composition difference; this data can't measure its turnout impact</li>
            <li><strong>Small-dollar desert.</strong> Only 1% of individual dollars are unitemized (&lt;$200) — no real grassroots email machine</li>
            <li>"Legacy candidate" framing — dad's name is the easiest attack angle</li>
            <li>31416 (Isle of Hope/Oatland) underperformance — 59% share, his lowest in the Savannah core and Farrell's best ZIP anywhere (41%)</li>
            <li>Lacks the military biography that anchors Montgomery's appeal in a military-heavy district</li>
            <li>Heavy top-end concentration: 13% of donors = 45% of individual dollars; widens political-optics attack surface</li>
          </ul>
        </div>
        <div>
          <Tag tone="warning">Risks to the lead</Tag>
          <ol style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>The legacy network cuts both ways.</strong> 46% of individual dollars come from 13% of donors — a concentration that invites the "inherited machine" attack.</li>
            <li><strong>Retiree gap.</strong> Retirees are 7% of Kingston's donors vs. Montgomery's 28% — the highest-turnout primary bloc is where his coalition is thinnest.</li>
            <li><strong>Farrell's strongest ZIP holds.</strong> Kingston's 59% share in 31416 is his lowest in the Savannah core — the only ZIP he leads where a challenger tops 40%.</li>
            <li><strong>Runoff capacity is finite.</strong> 22 proven max-out donors sit ~$62K short of the $10,500 triple-max — capacity that matters only if the race goes to a runoff.</li>
            <li><strong>No small-dollar base.</strong> At 1% unitemized, there is no digital fundraising channel to tap if big-check capacity runs out.</li>
          </ol>
        </div>
      </div>
      <div className="dk-field-stats" style={{ borderTop: `1px solid ${P.line}`, padding: '16px 24px', background: P.bg, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { l: 'Donors',     v: fmtN(Q.Kingston.donors) },
          { l: 'Cash',       v: fmtK(FIN.Kingston.cash),  c: P.success },
          { l: 'Max-outs',   v: `${Q.Kingston.maxed}`,    c: P.kingstonAccent },
          { l: 'PAC $',      v: fmtK(FIN.Kingston.pac),   c: P.kingstonAccent },
          { l: 'Burn / mo',  v: fmtK(FIN.Kingston.spent / FIN.Kingston.monthsActive) },
        ].map((x, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{x.l}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: x.c || P.kingston, marginTop: 2 }}>{x.v}</div>
          </div>
        ))}
      </div>
    </Card>

    {/* FARRELL */}
    <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${P.farrell} 0%, ${P.farrellLight} 100%)`, color: '#FBF8F2', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75, fontWeight: 700 }}>Challenger #1</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Pat Farrell</h3>
            <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>64 · Chatham County Commissioner (2004–2026) · Skidaway Island resident · Georgia Southern grad, mechanical engineering</div>
          </div>
          <div className="dk-field-receipts" style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500 }}>{fmtK(FIN.Farrell.receipts)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>total receipts · <strong>76% self-funded</strong></div>
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
            <li>Strongest ZIP: 31416, with 41% of dollars — his best share anywhere</li>
          </ul>
        </div>
        <div>
          <Tag tone="danger">Weaknesses</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>76% self-funded.</strong> Only $157K from individual donors</li>
            <li>Raised just <strong>$250 from PACs</strong> — zero institutional backing</li>
            <li>Only 137 donors · 15% repeat rate · narrow base</li>
            <li>Only 5 out-of-state donors in the entire filing</li>
            <li>Represented 1 of district's 17 counties</li>
            <li>Lost his Commission seat involuntarily on qualifying — bad news cycle in March</li>
            <li>Age 64 vs Kingston's 34 — generational mismatch in a MAGA primary</li>
            <li>$500K loan is repayable only from future fundraising — likely unrecoverable in practice if he loses (the old $250K legal cap was struck down in 2022)</li>
          </ul>
        </div>
        <div>
          <Tag tone="warning">Vulnerabilities</Tag>
          <ol style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>Candidate-financed.</strong> 76% of receipts are a personal loan; $157K came from donors.</li>
            <li><strong>Establishment résumé.</strong> 22 years on the county commission cuts against the anti-establishment mood of a Trump-era primary.</li>
            <li><strong>No institutional support.</strong> $250 in PAC money — effectively zero.</li>
            <li><strong>Qualifying fallout.</strong> Lost his commission seat automatically upon qualifying — a costly news cycle in March.</li>
            <li><strong>Sharpest contrast in the field</strong> with Kingston's fully donor-funded operation.</li>
          </ol>
        </div>
      </div>
      <div className="dk-field-stats" style={{ borderTop: `1px solid ${P.line}`, padding: '16px 24px', background: P.bg, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { l: 'Donors',       v: '137' },
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
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75, fontWeight: 700 }}>Challenger #2</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Brian Montgomery</h3>
            <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9 }}>Lt. Col. USA (Ret.) · West Point · Ranger · 82nd Airborne, 3rd ID (Fort Stewart) · 2× Iraq · Savannah ~10 yrs</div>
          </div>
          <div className="dk-field-receipts" style={{ textAlign: 'right' }}>
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
            <li>Out-of-state network — 35 donors (24% of his) from national military brotherhood</li>
            <li>Holds ZIP 31331 (Darien/Sapelo) and 31545 (Jesup) outright</li>
            <li>Clean balance sheet, no debt</li>
          </ul>
        </div>
        <div>
          <Tag tone="danger">Weaknesses</Tag>
          <ul style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>$45K cash on hand at April 29.</strong> He spent only what he raised, never building a closing war chest</li>
            <li>Only 150 donors · top 20 = 48% of money (fragile concentration)</li>
            <li>Recent Savannah resident ("nearly a decade") vs. lifers Kingston/Farrell</li>
            <li>Trump endorsed Kingston, not him — strips his MAGA messaging of its main asset</li>
            <li>Only $8,500 in PAC support — no VFW, no trade group endorsement</li>
            <li>Cannot match Kingston on paid media in the final 14 days</li>
          </ul>
        </div>
        <div>
          <Tag tone="warning">Vulnerabilities</Tag>
          <ol style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, paddingLeft: 18, marginTop: 12 }}>
            <li><strong>Biography hasn't converted.</strong> The field's strongest résumé has produced the field's smallest fundraising total ($268K).</li>
            <li><strong>Cash crunch.</strong> $45K on hand and a ~2-month runway point to going dark on paid media before May 19.</li>
            <li><strong>Endorsement undercut.</strong> Trump's endorsement of Kingston undercuts the MAGA lane his profile is built for.</li>
            <li><strong>Thin institutional support.</strong> $8,500 in PAC money — no veterans' group or trade backing on the books.</li>
            <li><strong>Movable coalition.</strong> His retiree-and-military base is the likeliest to consolidate behind another candidate if he exits.</li>
          </ol>
        </div>
      </div>
      <div className="dk-field-stats" style={{ borderTop: `1px solid ${P.line}`, padding: '16px 24px', background: P.bg, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { l: 'Donors', v: '150' },
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
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: 0, color: P.kingston }}>The shape of the field</h3>
          <p style={{ fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.65, color: P.ink, marginTop: 8, marginBottom: 0 }}>
            The two challengers embody distinct weaknesses in a Trump-era GOP primary: Farrell, the <strong>22-year insider financing his own campaign</strong>; Montgomery, the <strong>decorated veteran without the President's endorsement</strong>. Kingston's file sits between them — a legacy name, the Trump endorsement, and the field's broadest donor coalition.
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
  // Founder/chairman triple-maxes. Only Daniel Defense is a defense company —
  // Teramore is a retail developer (Dollar General's main Southeast builder)
  // and Dulany Industries is Savannah maritime/industrial.
  const founderCluster = [
    { name: 'Marvin Daniel',      firm: 'Daniel Defense',       role: 'Founder & Chairman',                 city: 'Richmond Hill', amount: 10500 },
    { name: 'Steve Hufstetler',   firm: 'Teramore Development', role: 'Founder (retail development)',       city: 'Thomasville',   amount: 10500 },
    { name: 'F. Reed Dulany III', firm: 'Dulany Industries',    role: 'Chairman/CEO (maritime/industrial)', city: 'Savannah',      amount: 10500 },
  ];

  // The largest donors — each at or under the legal $10,500 per-cycle cap (net of reattributions)
  const overCap = [
    { name: 'Dale C. Critz Jr.',      net: 10500 },
    { name: 'TJ Hollis',              net: 10500 },
    { name: 'Christian B. Demere',    net: 10500 },
    { name: 'William S. Dorsey III',  net: 10500 },
    { name: 'James A. Pattiz',        net: 7000 },
    { name: 'William Pattiz',         net: 7000 },
    { name: 'John Skeadas III',       net: 7000 },
  ];

  // Retiree comparison
  const retireeData = [
    { name: 'Montgomery', retirees: 28, other: 72 },
    { name: 'Farrell',    retirees: 25, other: 75 },
    { name: 'Kingston',   retirees: 7,  other: 93 },
  ];

  // Atlanta moat
  const atlantaZips = [
    { zip: '30327', nbhd: 'Buckhead',  Kingston: 53950, other: 0 },
    { zip: '30305', nbhd: 'Buckhead',  Kingston: 27000, other: 0 },
    { zip: '30269', nbhd: 'Peachtree City', Kingston: 10500, other: 1600 },
    { zip: '30342', nbhd: 'Sandy Springs', Kingston: 10500, other: 0 },
    { zip: '30309', nbhd: 'Midtown',   Kingston: 7500, other: 3500 },
  ];

  return (
    <div>
      <SectionH
        eyebrow="Below the surface"
        title="The patterns that sit under the surface"
        kicker="Patterns a surface read of the filings misses — each specific and grounded in the underlying data."
      />

      <div style={{ display: 'grid', gap: 14 }}>

        <Insight n="01" tone="hot" title="The 77-person Ultra-Loyalist Club"
          stat={{ value: '$747K', label: 'from 77 donors' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            77 donors gave Kingston $7,000 or more (primary + general, plus runoff where applicable). That's <strong>13% of the donor base producing 45% of the money.</strong> The top tier — Critz, Demere, Hollis, Dorsey — each hit the full $10,500 triple-max, and several of their spouses maxed out too, so the strongest households total ~$21,000. The $10,500 individual triple-max cap holds across the board.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
            {DOUBLE_MAX.slice(0, 10).map(d => (
              <div key={d.name} style={{ padding: '8px 10px', background: P.bg, borderRadius: 6, borderLeft: `3px solid ${P.kingstonAccent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.kingston }}>{lastName(d.name)}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: P.kingston, marginTop: 2 }}>{fmtK(d.amount)}</div>
              </div>
            ))}
          </div>
        </Insight>

        <Insight n="02" tone="hot" title="The partial-triple cohort — $62K of uncollected runoff capacity"
          stat={{ value: '21', label: 'donors one check short of max' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Of the 77 ultra-loyalists who've given $7,000+, <strong>55 have hit the full $10,500 triple-max</strong> (primary + general + runoff). The other 22 stopped between $7,000 and $10,000 — short of the runoff deposit. That's <strong>$61,500 in legal runoff capacity from a specific, identifiable cohort of donors who have already demonstrated triple-max intent</strong> by giving far past most people's ceiling.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.kingston}` }}>
              <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Triple-maxed</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, marginTop: 2 }}>55 donors · $578K</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>$3,500 primary + $3,500 general + $3,500 runoff</div>
            </div>
            <div style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.danger}` }}>
              <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Partial-triple</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.danger, marginTop: 2 }}>22 donors · $170K</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>Primary + general only · $62K of unwritten runoff checks</div>
            </div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: P.ink }}>
            A runoff check is structurally separate — it can only be spent if a runoff is actually held, so finance operations typically don't ask for it until the runoff is on the calendar. The $7K plateau is consistent with that timing pattern, not a ceiling on these donors' willingness.
          </p>
        </Insight>

        <Insight n="03" tone="warm" title="The Atlanta Moat — $111K where opponents barely register"
          stat={{ value: '$111K', label: 'Atlanta network' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Five Atlanta-area ZIPs (Buckhead, Peachtree City, Sandy Springs, Midtown) gave Kingston <strong>$110,950 combined</strong>. Opponents took <strong>$5,100 total</strong> from the same ZIPs — about 5% of Kingston's haul. This is donor territory the field has almost entirely ceded to him.
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
        </Insight>

        <Insight n="04" tone="gold" title="Three company founders wrote the maximum possible check"
          stat={{ value: '3 founders', label: 'each at the $10,500 max' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            <strong>Marvin Daniel — founder and chairman of Daniel Defense</strong>, one of the most politically recognizable firearms manufacturers in the country — has triple-maxed Kingston at $10,500, and a second member of his household did the same ($21,000 combined). <strong>Steve Hufstetler</strong> (Teramore Development, the Thomasville developer best known for building Dollar General stores across the Southeast) and <strong>F. Reed Dulany III</strong> (Dulany Industries, Savannah maritime/industrial) also hit the ceiling. One gun maker plus two builders — founder-level wealth concentrating behind one candidate, not a defense-industry bloc: Daniel Defense is the only defense company among them. Endorsement-by-checkbook, before any press release.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {founderCluster.map(d => (
              <div key={d.name} style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.kingstonAccent}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.kingston }}>{d.name}</div>
                <div style={{ fontSize: 11, color: P.ink, marginTop: 2 }}>{d.role}</div>
                <div style={{ fontSize: 11, color: P.muted, fontStyle: 'italic' }}>{d.firm} · {d.city}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: P.kingston, marginTop: 4 }}>{fmtK(d.amount)}</div>
              </div>
            ))}
          </div>
        </Insight>

        <Insight n="05" tone="warm" title="Eleven hedger donors — two lean toward Farrell"
          stat={{ value: '11', label: 'gave to multiple candidates' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Eleven people gave money to two or more candidates in this race. Two of them gave Farrell materially more than they gave Kingston — and two Kingston triple-maxers, Don Waters and Byron Smith, also wrote opponent checks. (Matching donors across committees requires normalizing name punctuation; an earlier pass missed three of the eleven.)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SHARED.map(s => (
              <div key={s.name} style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${s.tone === 'hot' ? P.danger : s.tone === 'warm' ? P.warning : P.mutedLight}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
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

        <Insight n="06" tone="gold" title="Women out-give men per donor — by 24%"
          stat={{ value: '$3,509', label: 'avg female vs $2,823 male' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Most campaigns assume women write smaller checks than men. On Kingston's file the opposite is true. By <strong>name-inferred gender</strong>, his 88 female donors average <strong>$3,509 each</strong> and his 378 male donors average <strong>$2,823 each</strong> — a <strong>24% per-donor premium for women</strong>, who are also underrepresented in the base (14% of donors by head, 19% by dollars). Gender isn't an FEC field, so it's inferred from first names and the names a dictionary can't place are left unclassified — read this as a strong directional signal, not a precise count.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.kingston}` }}>
              <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Men</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: P.kingston, marginTop: 2 }}>378 donors · $2,823 avg</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>242 below cap · ~$604K of headroom</div>
            </div>
            <div style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${P.kingstonAccent}` }}>
              <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Women</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: P.kingston, marginTop: 2 }}>88 donors · $3,509 avg</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>45 below cap · ~$113K of headroom</div>
            </div>
          </div>
        </Insight>

        <Insight n="07" tone="warm" title="The retiree gap — a coalition-composition difference"
          stat={{ value: '7%', label: 'retirees in Kingston base' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Kingston's donor base is 7% retirees. Montgomery's is <strong>28%</strong> — the dimension where the two coalitions look most different in composition. Retirees are often assumed to vote at higher rates in low-turnout primaries, but this dataset has no turnout or voter-file data, so it can show the donor-mix gap without quantifying any electoral edge.
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
        </Insight>

        <Insight n="08" tone="default" title="Montgomery's cash can't cover the final stretch"
          stat={{ value: '~2.0 mo', label: 'Montgomery runway' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Through the April 29 pre-primary report, Montgomery had $45,140 cash on hand — essentially flat on the month, because he spent almost exactly the ~$16K he raised. He never built the reserve a closing paid-media push needs: $45K, with three weeks to go, could not fund meaningful TV or mail against a frontrunner sitting on $949K. Solvent, but invisible in the air war.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {['Kingston','Farrell','Montgomery'].map(name => {
              const d = FIN[name];
              const burn = Math.round(d.spent / d.monthsActive);
              const runway = (d.cash / burn).toFixed(1);
              return (
                <div key={name} style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${C[name].color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C[name].color }}>{name}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, marginTop: 4 }}>{runway} mo</div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{fmtK(d.cash)} cash · {fmtK(burn)}/mo burn</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: P.ink }}>
            The spike case — not the linear average — is the operative one in May, when media buys, mail, and GOTV all land at once. Kingston has 28× Montgomery's cash; Farrell has 9×.
          </p>
        </Insight>

        <Insight n="09" tone="default" title="11 employer clusters account for $139K in stacked giving"
          stat={{ value: '$139K', label: 'from 11 firms' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            When 3+ employees of one firm donate within days of each other, it is <strong>consistent with someone inside organizing the giving</strong> — a likely bundler — though shared employer and timing alone don't prove coordination. Here are the ten employer clusters, including OrthoAtlanta, whose 12 physicians all gave within the last nine days of March.
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
        </Insight>

        <Insight n="10" tone="default" title="The small-dollar desert — and what it means"
          stat={{ value: '1.0%', label: 'Kingston unitemized' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Only <strong>1% of Kingston's individual money is unitemized</strong> (donations under $200) — almost everything arrives as itemized, above-$200 checks. This is a call-time operation, not a small-dollar email program.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {['Kingston','Montgomery','Farrell'].map(name => {
              const d = FIN[name];
              const pct = (d.unitemized / d.indiv) * 100;
              return (
                <div key={name} style={{ padding: 12, background: P.bg, borderRadius: 8, borderLeft: `3px solid ${C[name].color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C[name].color }}>{name}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, marginTop: 4 }}>{pct.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{fmtK(d.unitemized)} of {fmtK(d.indiv)} individual</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: P.ink }}>
            Even Kingston's opponents barely register on small-dollar (Montgomery 4.7%, Farrell 4.5%) — none of the three campaigns has built a digital grassroots engine. The whole GA-1 primary is being run on relationship money, not list money.
          </p>
        </Insight>

        <Insight n="11" tone="warm" title="No over-the-cap totals — every big donor nets at or under the cap"
          stat={{ value: '0', label: 'donors over the $10,500 cap' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            A naive read of the raw FEC file makes the biggest donors look like they gave $14,000–$24,500 — over the <strong>$10,500 per-individual per-cycle cap</strong>. They didn't. Those inflated figures are reattribution and primary/general/runoff redesignation memo entries; once netted, every one of these donors lands at or under the legal maximum (shown below). Net of those memo entries, no donor in the file exceeds the cap — the apparent over-limit totals are an artifact of the raw rows, not actual over-limit giving.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 10 }}>
            {overCap.map(d => (
              <div key={d.name} style={{ padding: '8px 10px', background: P.bg, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${P.warning}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: P.ink }}>{d.name}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: P.warning }}>{fmtK(d.net)}</div>
              </div>
            ))}
          </div>
        </Insight>

        <Insight n="12" tone="gold" title="40 households doubled up — a rare depth signal"
          stat={{ value: '40', label: 'households w/ 2+ max-givers' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            The FEC's $3,500 cap is per individual, not per household — so when two people who <em>share a surname and ZIP</em> both max out, that reads as two independent decisions, not one donor writing a bigger check. <strong>40 Kingston households — clusters that share a surname and ZIP — have 2+ members who each netted $3,500 or more</strong>, together accounting for <strong>$624,475 net</strong> — well over one in every three Kingston dollars. Households are inferred from shared surname + ZIP, so a few may be unrelated namesakes; even so, it is an uncommon depth of repeat max-giving.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8, marginBottom: 12 }}>
            {[
              { family: 'Critz',          total: 21000, n: 2 },
              { family: 'Hollis',         total: 21000, n: 2 },
              { family: 'Demere',         total: 21000, n: 2 },
              { family: 'Dorsey',         total: 21000, n: 2 },
              { family: 'Hufstetler',     total: 21000, n: 2 },
              { family: 'Daniel',         total: 21000, n: 2 },
              { family: 'Kinsell',        total: 21000, n: 2 },
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
        </Insight>

        <Insight n="13" tone="gold" title="The legacy network is deep — and it's showing up in the data"
          stat={{ value: '$747K', label: 'from father\'s network' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px', color: P.ink }}>
            Kingston's top donors include names that map directly onto Jack Kingston's 30-year donor and business network in Savannah — Dale Critz Jr. (auto), Christian Demere (Colonial Group logistics), TJ Hollis (McManamy Jackson Hollis law firm), William Dorsey III, F. Reed Dulany III, Don Waters. Three generations of Savannah business, all writing $10,500 max checks. That's an inheritance most candidates can't replicate.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {[
              { name: 'Dale C. Critz Jr.',     industry: 'Critz auto dealership',     amount: 10500 },
              { name: 'Christian B. Demere',   industry: 'Colonial Group (logistics)', amount: 10500 },
              { name: 'TJ Hollis',             industry: 'McManamy Jackson Hollis (law)', amount: 10500 },
              { name: 'William S. Dorsey III', industry: 'Savannah business',          amount: 10500 },
              { name: 'F. Reed Dulany III',    industry: 'Dulany Industries',          amount: 10500 },
              { name: 'Don L. Waters',         industry: 'Savannah business',          amount: 10500 },
            ].map(d => (
              <div key={d.name} style={{ padding: '10px 12px', background: P.bg, borderRadius: 6, borderLeft: `3px solid ${P.kingstonAccent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.kingston }}>{d.name}</div>
                <div style={{ fontSize: 10, color: P.muted, marginTop: 2 }}>{d.industry}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: P.kingston, marginTop: 3 }}>{fmtK(d.amount)}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: P.ink }}>
            The challengers' charge that Kingston is "his father's candidate" is true — and the list is the reason the label carries less weight than it might: 609 donors, 77 ultra-loyalists, 11 bundler firms, $949K cash — an organized operation, not just a famous name.
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
    const exhaustDate = new Date('2026-04-29');
    exhaustDate.setDate(exhaustDate.getDate() + Math.round(runwayMonths * 30));
    return {
      name, cash: d.cash, spent: d.spent, monthsActive: d.monthsActive,
      monthlyBurn: Math.round(monthlyBurn),
      runwayMonths: runwayMonths.toFixed(1),
      exhaustDate: exhaustDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      priorToPrimary: exhaustDate < new Date('2026-05-19'),
    };
  });

  // Projected cash-on-hand: straight-line decline from each candidate's actual
  // 4/29 cash at their average monthly burn, sampled weekly to ~mid-July.
  const cashRunway = [];
  for (let day = 0; day <= 77; day += 7) {
    const row = { day };
    ['Kingston', 'Farrell', 'Montgomery'].forEach(name => {
      const f = FIN[name];
      row[name] = Math.max(0, Math.round(f.cash - (f.spent / f.monthsActive / 30.44) * day));
    });
    cashRunway.push(row);
  }

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
        kicker="Six models built from FEC filings, Georgia Secretary of State records, and current federal campaign-finance law. Each shows its inputs, formula, sources, and a confidence rating. No polling, no academic regressions, no vibes."
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
              Challenger cash-exhaustion date
            </h3>
            <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
              When each challenger runs out of money at the average burn rate, projected from their actual cash at April 29. April's spending was front-loaded into the final push, so the average burn overstates the steady-state rate — read these as outer-bound dates, not forecasts.
            </p>
          </div>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              monthly_burn = total_disbursements ÷ months_active<br/>
              runway_months = cash_on_hand ÷ monthly_burn<br/>
              exhaust_date = Apr 29 + (runway_months × 30 days)
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS (FEC Form 3, 4/1/2025 – 4/29/2026)</div>
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
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Challenger cash-on-hand, projected to $0</div>
          <div style={{ fontSize: 11, color: P.muted, margin: '0 0 12px' }}>Kingston ({fmtK(FIN.Kingston.cash)}) sits off the top of this scale — at his average burn he doesn't run dry until {cashModel.find(c => c.name === 'Kingston').exhaustDate}.</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cashRunway} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={P.line} vertical={false}/>
              <XAxis dataKey="day" type="number" domain={[0, 77]} ticks={[0, 20, 48, 77]}
                tickFormatter={(d) => { const dt = new Date('2026-04-29'); dt.setDate(dt.getDate() + d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }}
                tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={{ stroke: P.line }} tickLine={false}/>
              <YAxis tickFormatter={fmtK} tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: P.muted }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v) => fmtK(v)} labelFormatter={(d) => { const dt = new Date('2026-04-29'); dt.setDate(dt.getDate() + d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }}/>
              <ReferenceLine x={20} stroke={P.danger} strokeDasharray="4 3" label={{ value: 'Primary', fill: P.danger, fontSize: 10, fontWeight: 700, position: 'insideTopRight' }}/>
              <ReferenceLine x={48} stroke={P.muted} strokeDasharray="4 3" label={{ value: 'Runoff', fill: P.muted, fontSize: 10, fontWeight: 700, position: 'insideTopRight' }}/>
              <Line type="monotone" dataKey="Farrell"    stroke={P.farrell}    strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="Montgomery" stroke={P.montgomery} strokeWidth={2.5} dot={false}/>
              <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, paddingTop: 10 }}/>
            </LineChart>
          </ResponsiveContainer>
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
            Unused donor capacity in Kingston's donor file
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            How many dollars could still legally be raised from donors already in the file — without a single new name.
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              primary_room = Σ ($3,500 − donor_primary_given)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;for each donor where primary_given &lt; $3,500<br/>
              general_room = Σ ($3,500 − donor_general_given)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;for each primary-maxed donor where general_given &lt; $3,500
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS (FEC Schedule A)</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: P.ink }}>
              609 unique donors, 944 itemized contributions through 4/29/2026.<br/>
              281 contributions at exactly $3,500 (primary cap); 192 donors net-maxed.<br/>
              138 of those have not given $3,500 to general.<br/>
              417 donors below primary cap, avg remaining capacity $2,501.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>RESULT</div>
            <div style={{ padding: 16, background: `linear-gradient(135deg, ${P.kingston} 0%, ${P.kingstonLight} 100%)`, color: '#FBF8F2', borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Primary room</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, marginTop: 2, lineHeight: 1 }}>$1,043,056</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>from 417 non-maxed primary donors</div>
            </div>
            <div style={{ padding: 16, background: `linear-gradient(135deg, ${P.kingstonAccent} 0%, #E0B96A 100%)`, color: P.ink, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>General room (redesignation)</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, marginTop: 2, lineHeight: 1 }}>$470,500</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>from 138 primary max-outs not yet max-given general, net of partial general gifts</div>
            </div>
            <div style={{ padding: '12px 16px', borderLeft: `4px solid ${P.success}`, background: P.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Total addressable without new donors</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, color: P.success, marginTop: 2 }}>$1,513,556</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Schedule A (Itemized Individual Contributions), aggregated by contributor_name (net of refunds) for Committee C00908624. Schedule A through 4/29/2026, pulled from the OpenFEC API.{' '}
          <strong style={{ color: P.kingston }}>Statute:</strong> 52 U.S.C. § 30116(a)(1)(A) — $3,500 per individual per election limit (2025–26 cycle, indexed biennially per FEC announcement).
        </div>
      </Card>

      {/* MODEL 3: Farrell §30116(j) loss exposure */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag tone="navy">MODEL 03</Tag>
            <Tag tone="warning">MEDIUM-HIGH CONFIDENCE</Tag>
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: P.kingston, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            Farrell's personal exposure on his $500,000 loan
          </h3>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0', maxWidth: 720 }}>
            The $250,000 statutory repayment cap was struck down in FEC v. Cruz (2022). Repayment is now legally unlimited — but it can only come from money the campaign actually raises.
          </p>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FORMULA</div>
            <div style={{ padding: '14px 16px', background: P.bg, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: P.ink, lineHeight: 1.7, marginBottom: 16 }}>
              recoverable = min(loan_outstanding,<br/>
              &nbsp;&nbsp;cash_remaining + post_election_fundraising)<br/>
              personal_loss = $500,000 − recoverable<br/>
              <span style={{ color: P.muted }}>// post-loss fundraising for a defeated primary<br/>
              // campaign is historically ≈ $0 — the model's one assumption</span>
            </div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>INPUTS</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: P.ink }}>
              <strong>Loans made by candidate:</strong> $500,000 (FEC Form 3, Line 13A)<br/>
              <strong>Debts/loans owed by committee:</strong> $500,000 (FEC Form 3, Line 10)<br/>
              <strong>Legal cap on repayment:</strong> none — the $250,000 cap in <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>52 U.S.C. § 30116(j)</span> was held unconstitutional in 2022
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>SCENARIOS</div>
            <div style={{ padding: 14, background: '#F5EBEB', borderLeft: `4px solid ${P.danger}`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: P.danger, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loses primary · campaign spends most cash</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.danger, marginTop: 2 }}>Loss approaches $500,000</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Repayment would depend on post-loss fundraising, which is typically negligible</div>
            </div>
            <div style={{ padding: 14, background: '#F5EFE8', borderLeft: `4px solid ${P.warning}`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: P.warning, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loses primary · campaign has cash left</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.warning, marginTop: 2 }}>Loss ≈ $500K − remaining cash</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Whatever the committee still holds can legally repay him — no cap since Cruz</div>
            </div>
            <div style={{ padding: 14, background: '#EDF2E8', borderLeft: `4px solid ${P.success}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: P.success, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wins primary</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: P.success, marginTop: 2 }}>$0 expected loss</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Loan recoverable via general-election fundraising, with no legal ceiling</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: P.bg, borderTop: `1px solid ${P.line}`, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
          <strong style={{ color: P.kingston }}>Sources:</strong> FEC Form 3 (Farrell Committee C00905422, covering 4/1/2025 – 4/29/2026) · <em>FEC v. Ted Cruz for Senate</em>, 596 U.S. 289 (2022), which struck down the $250,000 post-election repayment cap in 52 U.S.C. § 30116(j) and its implementing rule, 11 C.F.R. § 116.11.{' '}
          <strong style={{ color: P.kingston }}>Why not HIGH confidence:</strong> the loan and debt figures are filed facts, but "post-loss fundraising ≈ $0" is an assumption from practice, not a disclosed value.
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
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Form 3 lines 11(a), 11(c), 13(a), 11(d) for each committee (C00908624, C00917039, C00905422). Coverage 4/1/2025 – 4/29/2026.{' '}
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
            The vote threshold for a first-round majority, projected from the most recent open-seat GA-1 GOP primary (2014).
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
              <strong>2026 structural factors:</strong> open seat ✓ · 6 candidates · Trump endorsement ✓ · qualifying-deadline news cycle ✓
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
              <strong style={{ color: P.success }}>Implication:</strong> Kingston's 609 donors are roughly 1% of the expected primary electorate in the base scenario. How a donor base converts into votes is not something this data can model — the turnout figures here are scenarios, not a forecast.
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
          <strong style={{ color: P.kingston }}>Source:</strong> FEC Form 3 lines 16 (total receipts), 13(a) (loans), 11(d) (candidate contrib), 22 (total disbursements). Coverage 4/1/2025 – 4/29/2026.{' '}
          <strong style={{ color: P.kingston }}>Interpretation:</strong> Kingston spends 29¢ to raise each $1 — classic call-time operation with moderate overhead. Farrell spends $1.62 per earned-receipts dollar: his $500K self-loan is propping up a cash-negative fundraising operation.
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
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>fec.gov/data</span>, (b) federal statute and controlling case law (U.S. Code, C.F.R., and Supreme Court decisions), or (c) Georgia Secretary of State election archives at{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>sos.ga.gov</span>. No polling, no private data, no academic regressions. Most calculations are deterministic arithmetic on disclosed values; the two models that require an assumption — post-loss fundraising in Model 03 and turnout in Model 05 — state it explicitly and carry a lower confidence rating.
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
   TAB 8: DATA QUALITY & METHODOLOGY
   Documents every source, scope decision, estimate, and known
   limit behind the numbers. Reuses the same --check-guarded
   constants the other tabs display, so this page can never quietly
   disagree with them.
   ============================================================ */

// Where each number comes from. Plain-English provenance, not new figures.
const DQ_SOURCES = [
  {
    name: 'FEC Schedule A — itemized individual contributions',
    feeds: 'Every donor-level view: donor counts, gift-size distribution, occupations, geography, income tiers, bundler clusters, shared donors, households, and max-out analysis.',
    vintage: 'Pulled from the OpenFEC API; contributions through 4/29/2026 (the last pre-primary report). Committees C00908624 (Kingston), C00917039 (Montgomery), C00905422 (Farrell).',
  },
  {
    name: 'FEC Form 3 — Reports of Receipts & Disbursements',
    feeds: 'The financial-summary panels: total receipts, itemized vs. unitemized split, PAC dollars, cash on hand, debt, self-funding, and the burn-rate / runway models.',
    vintage: 'Pre-primary filing, coverage 4/1/2025 – 4/29/2026. These summary totals are authoritative and are not re-derivable from Schedule A.',
  },
  {
    name: 'U.S. Census Bureau — American Community Survey (ACS)',
    feeds: 'ZIP-level median household income, which drives the income tiers, the weighted-average donor income, and the wealthy-neighborhood totals.',
    vintage: '2019–2023 5-year estimates (table B19013, by ZCTA). Reference medians: Georgia $74,632 and US $77,719 (ACS 2023 1-year); GA-1 district $66,773 (ACS 2019–2023 5-year).',
  },
  {
    name: 'Georgia Secretary of State',
    feeds: 'Historical turnout and results that feed the runoff-threshold and turnout models on the Models tab.',
    vintage: 'Official election archives at sos.ga.gov.',
  },
  {
    name: 'Federal statute & controlling case law',
    feeds: 'Contribution caps ($3,500 per individual per election), legal runoff/general capacity, and the Farrell loan-recovery analysis.',
    vintage: '52 U.S.C. §30116; 11 C.F.R. §116.11; FEC v. Ted Cruz for Senate, 596 U.S. 289 (2022).',
  },
];

// Estimates & approximations — methods that infer rather than measure. Each is
// labeled so a reader knows where a number is soft before citing it.
const DQ_ESTIMATES = [
  {
    tag: 'Proxy', tone: 'warning',
    title: 'Donor income is a neighborhood proxy, not the person',
    body: "Each donor inherits the ACS median household income of their ZIP. The income tiers and weighted-average income describe the donor's ZIP, not the donor — a $3,500 giver in a $50K-median ZIP may personally earn far more, or less. A small donor pool can also post a high weighted average just by concentrating in a few wealthy ZIPs (this is exactly why Montgomery's average tops Kingston's), so read averages alongside pool size. Treat all of this as area signal, not individual wealth.",
  },
  {
    tag: 'Inference', tone: 'warning',
    title: 'Donors are grouped by name string',
    body: "Per-candidate donor counts aggregate by the contributor name as filed. Spelling or punctuation variants can split one person into two, or merge two namesakes into one. The cross-candidate \"shared donor\" join normalizes punctuation to catch this; the per-candidate counts do not.",
  },
  {
    tag: 'Inference', tone: 'warning',
    title: 'Gender is inferred from first names',
    body: "Kingston's gender split comes from a fixed first-name dictionary. Unisex names and names not in the dictionary are left unclassified and excluded from the male/female averages, so the split covers most of the base, not all of it. It is an inference, never self-reported.",
  },
  {
    tag: 'Inference', tone: 'warning',
    title: '“Households” are surname + ZIP clusters',
    body: 'Two or more max-out givers who share a last name and 5-digit ZIP are treated as one household. This misses spouses with different surnames or ZIPs, and can group unrelated people who happen to share a name and neighborhood.',
  },
  {
    tag: 'Approximation', tone: 'warning',
    title: '“In-district” is approximated by ZIP prefix',
    body: 'In-district is computed as Georgia ZIPs outside metro Atlanta (ZIP prefix ≠ 30) — a proxy, not the legal GA-1 boundary. It therefore counts other non-Atlanta Georgia ZIPs that are not actually in GA-1, so treat the in-district share as an upper bound.',
  },
  {
    tag: 'Self-reported', tone: 'warning',
    title: 'Bundler clusters depend on typed employer text',
    body: 'Firm totals group donors by their self-reported employer using substring matching. A donor who wrote the employer name differently will not cluster, so a firm’s true total can be understated. Employer and occupation are free text the filer typed.',
  },
  {
    tag: 'No data', tone: 'default',
    title: 'One ZIP has no published income',
    body: 'ZIP 31416 (Isle of Hope / Oatland Island) has no published ACS median household income. It carries no income value and is excluded from every income tier, the weighted average, and the income scatter — never back-filled with an estimate.',
  },
];

// Known limitations — accepted boundaries of the dataset, not defects to chase.
const DQ_LIMITS = [
  {
    title: 'Pre-primary snapshot',
    body: 'All data runs through the pre-primary FEC filing (4/29/2026) — the last report before the May 19 primary, so the final three weeks are not yet captured (they arrive in the Q2 filing, ~July 15). The Money-tab cash drawdown is actuals; the Models-tab cash-exhaustion and runoff-capacity sections are forward projections from the 4/29 figures, and April spending was front-loaded, so the steady-burn runway runs long.',
  },
  {
    title: 'No independent expenditures',
    body: 'Super-PAC and other outside spending for or against any candidate is not in the candidate committees’ filings and is not in this dashboard. This covers only money raised and spent by the three campaigns themselves.',
  },
  {
    title: 'Farrell loan recovery is practical, not statutory',
    body: 'The Farrell self-loan analysis assumes post-loss fundraising near $0 — a real-world expectation, not a legal limit. FEC v. Cruz (2022) struck down the §30116(j) repayment cap, so there is no statutory ceiling to model.',
  },
  {
    title: 'Models carry stated uncertainty',
    body: 'Turnout projections carry ±20%, and campaign spending typically spikes 2–3× in the final four weeks, which can pull cash-exhaustion dates earlier than shown. Each model on the Models tab states its own confidence rating and caveat.',
  },
  {
    title: 'Biographies and dates are from public reporting',
    body: 'Candidate biographies on The Field tab (ages, careers, military and education records) and dated events on the timeline (announcements, the Trump endorsement, the primary result) come from public reporting and official records, not from the FEC/ACS dataset, and are not independently re-verified here. The financial figures do not depend on them.',
  },
];

const DQTag = ({ children, tone }) => {
  const t = {
    warning: { bg: '#F5DFCC', fg: '#6B3F1E' },
    danger:  { bg: '#EDD4D4', fg: '#6B2929' },
    default: { bg: '#F0EBDD', fg: '#1F1F1F' },
  }[tone] || { bg: '#F0EBDD', fg: '#1F1F1F' };
  return (
    <span style={{
      display: 'inline-block', background: t.bg, color: t.fg,
      fontFamily: 'DM Sans', fontSize: 9.5, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 10, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

const TabData = () => {
  const kPrimaryTraj = CUMULATIVE[CUMULATIVE.length - 1].Kingston;  // primary-designated itemized $ (Schedule A)
  const kItemized = FIN.Kingston.itemized;                          // total itemized individual $ (Form 3)
  const unitem = ['Kingston', 'Montgomery', 'Farrell'].map(n => ({
    name: n, pct: (FIN[n].unitemized / FIN[n].indiv) * 100,
  }));
  const covs = ZIP_INCOME.map(d => d.cov);
  const covRange = `${Math.floor(Math.min(...covs))}–${Math.ceil(Math.max(...covs))}%`;
  const noEstimateZips = TOP_ZIPS.filter(z => z.hhi == null).map(z => z.zip);

  const mono = { fontFamily: 'ui-monospace, monospace' };

  return (
    <div>
      <SectionH
        eyebrow="Data Quality"
        title="How this was built — and where the numbers are soft"
        kicker="Every figure here is either computed by a script from the source filings or quoted from a cited source, then re-checked automatically. This page documents each source, every scope decision, the methods that estimate rather than measure, and the limits of what the data can show."
      />

      {/* At-a-glance integrity strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <Card><Stat label="Data through" value="Apr 29, 2026" sub="Pre-primary FEC filing — Form 3 + Schedule A" /></Card>
        <Card><Stat label="Donor $ with ACS income" value={covRange} sub="share of itemized dollars in a ZIP with a published median; the rest have no estimate" accent={P.success} /></Card>
        <Card><Stat label="Kingston unitemized" value={unitem[0].pct.toFixed(1) + '%'} sub="small-dollar money below the itemization threshold — invisible to the donor charts" accent={P.warning} /></Card>
      </div>

      {/* SOURCES */}
      <Card style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: P.kingston }}>Where the numbers come from</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Five sources, each feeding a specific part of the dashboard. Nothing is sourced from memory or estimation.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {DQ_SOURCES.map(s => (
            <div key={s.name} style={{ padding: '14px 16px', background: P.bg, borderRadius: 10, borderLeft: `4px solid ${P.kingston}` }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: P.kingston }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: P.ink, marginTop: 5, lineHeight: 1.55 }}><strong style={{ color: P.muted, fontWeight: 700 }}>Feeds:</strong> {s.feeds}</div>
              <div style={{ fontSize: 12, color: P.muted, marginTop: 4, lineHeight: 1.55 }}><strong style={{ fontWeight: 700 }}>As of:</strong> {s.vintage}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* SCOPE */}
      <Card style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: P.kingston }}>What is counted — and what isn't</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>The donor analysis deliberately scopes the raw filings. These choices shape every count on the Donors, Geography, and Findings tabs.</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Tag tone="navy">Individuals only</Tag>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>PAC, party, and organization money is not in the donor charts</span>
            </div>
            <p style={{ fontSize: 12.5, color: P.muted, margin: 0, lineHeight: 1.55 }}>The Schedule A analysis covers individual contributions (<span style={mono}>entity_type = IND</span>). Receipts from PACs, party committees, other candidate committees, and organizations appear only in the Form 3 summary (the “PACs” line on the Money tab), never in donor counts, occupations, or geography.</p>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Tag tone="navy">Itemized only</Tag>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>Small-dollar money is invisible to donor-level views</span>
            </div>
            <p style={{ fontSize: 12.5, color: P.muted, margin: 0, lineHeight: 1.55 }}>Schedule A lists only itemized contributions (donors above the $200 cumulative itemization threshold). Unitemized small-dollar money — {unitem.map((u, i) => (<span key={u.name}>{i > 0 ? ', ' : ''}{u.name} <strong style={{ color: P.ink }}>{u.pct.toFixed(1)}%</strong></span>))} of each candidate's individual dollars — has no donor records, so it is absent from every distribution, occupation, household, and geography chart.</p>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Tag tone="navy">Net of refunds</Tag>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>Per-donor totals subtract refunds and redesignations</span>
            </div>
            <p style={{ fontSize: 12.5, color: P.muted, margin: 0, lineHeight: 1.55 }}>Each donor's total is a net figure — refunded and redesignated amounts are subtracted, so a donor's displayed total reflects what the campaign actually kept.</p>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Tag tone="navy">De-duplicated</Tag>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>Reattribution memo rows are removed</span>
            </div>
            <p style={{ fontSize: 12.5, color: P.muted, margin: 0, lineHeight: 1.55 }}>Rows are de-duplicated by <span style={mono}>transaction_id</span>, which strips the duplicated “SEE REATTRIBUTION BELOW” memo entries. Without this, over-limit checks double-count — the bug that previously produced illegal totals above the $10,500 per-cycle cap.</p>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Tag tone="gold">Primary-designated trajectory</Tag>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>The Money chart is not “total raised”</span>
            </div>
            <p style={{ fontSize: 12.5, color: P.muted, margin: 0, lineHeight: 1.55 }}>The cumulative/monthly trajectory and the in-district share count primary-designated contributions only. Kingston's primary-designated itemized line reaches <strong style={{ color: P.ink }}>{fmtK(kPrimaryTraj)}</strong>, while his total itemized individual receipts are <strong style={{ color: P.ink }}>{fmtK(kItemized)}</strong> (Form 3). The difference is money designated for the primary runoff and the general election — so the trajectory's endpoint is intentionally lower than the financial-summary total.</p>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Tag tone="navy">Caps &amp; buckets</Tag>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>How max-outs and gift-size bars are defined</span>
            </div>
            <p style={{ fontSize: 12.5, color: P.muted, margin: 0, lineHeight: 1.55 }}>A max-out is the FEC 2025–26 cap of <strong style={{ color: P.ink }}>$3,500 per individual per election</strong> ($10,500 across primary, runoff, and general). In the gift-size distribution, $3,500 and $7,000 each get their own exact-match bar rather than being lumped into a surrounding range, so the max-out spike is isolated and not blurred.</p>
          </div>
        </div>
      </Card>

      {/* ESTIMATES & APPROXIMATIONS */}
      <Card style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: P.kingston }}>Estimates &amp; approximations — read before citing</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Most of the dashboard is direct arithmetic on disclosed dollars. A handful of fields infer or approximate. Each is labeled so you know which is which.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {DQ_ESTIMATES.map(e => (
            <div key={e.title} style={{ padding: '14px 16px', background: P.bg, borderRadius: 10, border: `1px solid ${P.line}` }}>
              <div style={{ marginBottom: 7 }}><DQTag tone={e.tone}>{e.tag}</DQTag></div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: P.kingston, lineHeight: 1.3 }}>{e.title}</div>
              <p style={{ fontSize: 12.5, color: P.muted, margin: '6px 0 0', lineHeight: 1.55 }}>{e.body}</p>
            </div>
          ))}
        </div>
        {noEstimateZips.length > 0 && (
          <p style={{ fontSize: 11.5, color: P.mutedLight, margin: '12px 0 0' }}>
            ZIP(s) with no published ACS income, excluded from income math: {noEstimateZips.map(z => <span key={z} style={mono}>{z}</span>).reduce((a, b) => [a, ', ', b])}.
          </p>
        )}
      </Card>

      {/* RECONCILIATION / SELF-CHECK */}
      <Card tone="success" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 42, color: P.success, lineHeight: 1, fontStyle: 'italic' }}>✓</div>
          <div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: 0, color: P.kingston }}>Reconciliation &amp; self-verification</h3>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.ink, marginTop: 8, marginBottom: 10 }}>
              Re-deriving the itemized individual totals from Schedule A lands within roughly <strong>0.2%</strong> (Kingston), <strong>1.8%</strong> (Montgomery), and <strong>5.5%</strong> (Farrell) of the authoritative FEC Form 3 totals — the API export nets out some refund/redesignation activity. The Form 3 figures are what the financial-summary panels display.
            </p>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.65, color: P.muted, margin: 0 }}>
              Every Schedule-A constant on this dashboard is regenerated by <span style={mono}>python3 derive_dashboard_data.py</span> and diffed against the live values by <span style={mono}>--check</span>, which exits non-zero on any mismatch — so a number that cannot be reproduced from source data cannot ship. Form 3 summary values cannot be re-derived from Schedule A and are verified against <span style={mono}>fec.gov</span> when the data is refreshed.
            </p>
          </div>
        </div>
      </Card>

      {/* KNOWN LIMITATIONS */}
      <Card style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: P.kingston }}>Known limitations</h3>
        <p style={{ fontSize: 13, color: P.muted, margin: '0 0 16px' }}>Accepted boundaries of this dataset — stated plainly so they aren't mistaken for errors.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {DQ_LIMITS.map(l => (
            <div key={l.title} style={{ padding: '14px 16px', background: P.bg, borderRadius: 10, borderLeft: `4px solid ${P.warning}` }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: P.kingston }}>{l.title}</div>
              <p style={{ fontSize: 12.5, color: P.muted, margin: '6px 0 0', lineHeight: 1.55 }}>{l.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <WhyMatters>
        A campaign-finance read is only as trustworthy as its sourcing. The point of this page is that you can audit it: every dollar figure traces to an FEC filing, every income figure to a named Census table, and the whole Schedule-A layer re-derives on command. Where a number is an estimate, it says so — so the strong claims and the soft ones are never confused.
      </WhyMatters>
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
  { id: 'opponents', label: 'The Field' },
  { id: 'insights',  label: 'Findings' },
  { id: 'models',    label: 'Models' },
  { id: 'data',      label: 'Data Quality' },
];

const TAB_IDS = new Set(TABS.map(t => t.id));
const readTabFromHash = () => {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace(/^#/, '');
  return TAB_IDS.has(h) ? h : 'overview';
};

export default function Dashboard() {
  const [tab, setTabState] = useState(readTabFromHash);
  const contentRef = useRef(null);
  const navRef = useRef(null);
  const [navOverflow, setNavOverflow] = useState({ left: false, right: false });

  const setTab = (id) => {
    if (window.location.hash !== '#' + id) {
      window.location.hash = id;
    } else {
      setTabState(id);
    }
  };

  // Tap the nav scroll affordances to advance the tab strip
  const scrollNav = (dir) => {
    const el = navRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(140, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  // Keep state in sync with the URL hash (handles back/forward + external links)
  useEffect(() => {
    const sync = () => setTabState(readTabFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

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
          /* Mobile masthead: logo + district/date sit together on the top row (date
             next to the logo); the eyebrow + title wrap to the row below at the 14px
             edge shared with the nav and content */
          .dk-root .dk-masthead-inner { flex-wrap: wrap !important; gap: 13px 17px !important; }
          .dk-root .dk-masthead-text { order: 2; flex-basis: 100%; }
          .dk-root .dk-masthead-meta { order: 1; margin-left: 0 !important; text-align: left !important; }
          .dk-root .dk-masthead-title { font-size: 18px !important; line-height: 1.2; }
          .dk-root .dk-nav { padding-left: 14px !important; padding-right: 14px !important; }
          /* Hide the redundant oversized "Apr 29" hero stat on mobile (the date is in
             the masthead); it dominates the small screen and skews the hierarchy */
          .dk-root .dk-hero-date { display: none !important; }

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

          /* Per-grid mobile overrides — after the generic collapse so they win */
          .dk-root .dk-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dk-root .dk-rank-stats { grid-template-columns: repeat(4, 1fr) !important; gap: 6px !important; }
          .dk-root .dk-rank-stats > div > div:last-child { font-size: 15px !important; }
          .dk-root .dk-field-stats { grid-template-columns: repeat(5, 1fr) !important; gap: 5px !important; }
          .dk-root .dk-field-stats > div > div:last-child { font-size: 15px !important; }
          .dk-root .dk-farrell-legend { grid-template-columns: repeat(3, 1fr) !important; }
          .dk-root .dk-field-receipts { text-align: left !important; }
          .dk-root .dk-cliff-wrap { margin-left: -28px !important; margin-right: -28px !important; }
          .dk-root .dk-kpi-grid > :last-child { grid-column: 1 / -1 !important; }
          .dk-root .dk-scroll-hint { display: block !important; }
          /* Findings insight: compact the number into a top strip, content full-width */
          .dk-root .dk-insight-grid { grid-template-columns: 1fr !important; }
          .dk-root .dk-insight-accent { flex-direction: row !important; align-items: center !important; min-height: 0 !important; padding: 12px 18px !important; }
          .dk-root .dk-insight-num { font-size: 30px !important; margin-top: 0 !important; }

          /* Charts and images never exceed their container */
          .dk-root svg, .dk-root img { max-width: 100%; }

          /* Bigger nav tabs on mobile — easier to read and a larger tap/scroll target */
          .dk-root .dk-nav button { font-size: 15px !important; padding: 14px 18px !important; }
        }
      `}</style>

      {/* Masthead */}
      <div style={{ background: P.paper, borderBottom: `1px solid ${P.line}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="dk-masthead-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="dk-masthead-logo" style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${P.kingston}, ${P.kingstonLight})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: P.kingstonAccent, fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, fontStyle: 'italic',
          }}>K</div>
          <div className="dk-masthead-text">
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.muted, fontWeight: 700 }}>A Campaign-Finance Analysis</div>
            <div className="dk-masthead-title" style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: P.kingston }}>Jim Kingston's Fundraising, Examined</div>
          </div>
          <div className="dk-masthead-meta" style={{ textAlign: 'right', marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, color: P.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>GA-1 Republican Primary</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: P.kingston }}>Data through Apr 29, 2026</div>
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>
          <div ref={navRef} className="dk-nav" style={{ padding: '0 32px', display: 'flex', gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
          <div role="button" aria-label="Scroll tabs right" onClick={() => scrollNav(1)} style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 44,
            pointerEvents: navOverflow.right ? 'auto' : 'none', cursor: 'pointer',
            background: `linear-gradient(to right, rgba(255,255,255,0), ${P.paper} 65%)`,
            opacity: navOverflow.right ? 1 : 0,
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 10, paddingBottom: 1,
            color: P.kingston, fontSize: 22, fontWeight: 700, lineHeight: 1,
          }}>›</div>
          <div role="button" aria-label="Scroll tabs left" onClick={() => scrollNav(-1)} style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 44,
            pointerEvents: navOverflow.left ? 'auto' : 'none', cursor: 'pointer',
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
        {tab === 'data'      && <TabData/>}
      </div>
    </div>
  );
}
