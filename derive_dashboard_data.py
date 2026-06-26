#!/usr/bin/env python3
"""
Derive every Schedule-A-based dashboard constant from FEC itemized individual
contributions, through 4/29/2026 (the last pre-primary FEC report).

Methodology (derived itemized totals land within 0.3% of FEC Form 3 for
Kingston, 1.9% for Montgomery, and 5.1% for Farrell — the API export nets out
some refund/redesignation activity; Form 3 totals remain the authoritative
figures for the dashboard's financial-summary panels):
  - scope:   entity_type == 'IND' (individual contributions only; matches the
             original FEC export exactly through 12/31/2025)
  - dedup:   by transaction_id, which removes the duplicated "SEE REATTRIBUTION
             BELOW" memo rows that otherwise double-count over-limit checks
             (the bug that produced illegal >$10,500 donor totals)
  - per-donor aggregation: by contributor_name (NET, i.e. refunds/redesignations
             subtracted)

Run:  python3 derive_dashboard_data.py            (print every derived constant)
      python3 derive_dashboard_data.py --check    (also diff the constants against
            Kingston_Dashboard.jsx and exit 1 on any mismatch — guards the
            CLAUDE.md "No fabricated data" rule)
Input: congresscontributions_through_april2026.csv  (FEC Schedule A, cycle 2026,
       contribution_receipt_date <= 2026-04-29, pulled from api.open.fec.gov)
"""
import csv
from collections import defaultdict, Counter

SRC = "congresscontributions_through_april2026.csv"
CN = {'K': 'FRIENDS OF JIM KINGSTON', 'M': 'FRIENDS OF BRIAN MONTGOMERY', 'F': 'PAT FARRELL FOR CONGRESS'}
rows = [r for r in csv.DictReader(open(SRC)) if r['entity_type'] == 'IND']

def amt(r):
    try: return float(r['contribution_receipt_amount'] or 0)
    except: return 0.0

def dedup(sub):
    seen = set(); out = []
    for r in sub:
        t = r['transaction_id']
        if t and t in seen: continue
        if t: seen.add(t)
        out.append(r)
    return out

def comm(t): return [r for r in rows if r['committee_name'] == CN[t]]
def netby(data):
    d = defaultdict(float)
    for r in data: d[r['contributor_name']] += amt(r)
    return d

# zip -> HHI (Census ACS) reused from donors_enriched.csv + supplement for new ZIPs
HHI = {}
try:
    for r in csv.DictReader(open('donors_enriched.csv')):
        if r['zip'] and r.get('zip_median_hhi'):
            try: HHI[r['zip']] = int(float(r['zip_median_hhi']))
            except: pass
except FileNotFoundError:
    pass
try:
    for r in csv.DictReader(open('zip_hhi_supplement.csv')):
        try: HHI[r['zip']] = int(float(r['hhi']))
        except: pass
except FileNotFoundError:
    pass

def tier(h):
    if h is None: return 'Unknown'
    if h >= 125000: return 'High'
    if h >= 75000:  return 'UpperMid'
    if h >= 50000:  return 'Middle'
    return 'Low'

MONTHS = [('2025-06','Jun'),('2025-07','Jul'),('2025-08','Aug'),('2025-09','Sep'),
          ('2025-10','Oct'),('2025-11','Nov'),('2025-12','Dec'),('2026-01','Jan'),
          ('2026-02','Feb'),('2026-03','Mar'),('2026-04','Apr')]

print("="*72)
print("DASHBOARD CONSTANTS — DERIVED THROUGH 4/29/2026 (IND, dedup-by-transaction_id)")
print("="*72)

# --- itemized totals (checksum vs FEC) ---
print("\n[itemized individual totals]   FEC Form 3: K 1,659,885 | M 225,957 | F 149,276")
for t in ['K','M','F']:
    dd = dedup(comm(t))
    print(f"  {t}: ${sum(amt(r) for r in dd):>12,.0f}")

# --- CUMULATIVE / MONTHLY (P2026 primary, dedup) ---
print("\n[CUMULATIVE / MONTHLY]  primary (P2026), Jun 2025 .. Mar 2026")
MONTHLY_D = {}; CUM_D = {}
for t in ['K','M','F']:
    dd = [r for r in dedup(comm(t)) if r['election_type'] == 'P2026']
    mm = defaultdict(float)
    for r in dd: mm[r['contribution_receipt_date'][:7]] += amt(r)
    monthly = [int(round(mm.get(k, 0))) for k, _ in MONTHS]
    cum = []; s = 0
    for v in monthly: s += v; cum.append(s)
    MONTHLY_D[t] = monthly; CUM_D[t] = cum
    print(f"  {t} MONTHLY    = {monthly}")
    print(f"  {t} CUMULATIVE = {cum}")

# --- AMOUNT_DIST ---
def bk(a):
    if a < 100: return '<$100'
    if a < 250: return '$100'
    if a < 500: return '$250'
    if a < 1000: return '$500'
    if a < 2500: return '$1K'
    if a < 3500: return '$2.5K'
    if a == 3500: return '$3.5K'
    if a < 7000: return '$3.5-7K'
    if a == 7000: return '$7K'
    return '>$7K'
ORDER = ['<$100','$100','$250','$500','$1K','$2.5K','$3.5K','$3.5-7K','$7K','>$7K']
print("\n[AMOUNT_DIST]  count of positive individual contributions per bucket")
print(f"  {'bucket':8} {'K':>4} {'M':>4} {'F':>4}")
cnts = {t: Counter(bk(amt(r)) for r in dedup(comm(t)) if amt(r) > 0) for t in ['K','M','F']}
for b in ORDER:
    print(f"  {b:8} {cnts['K'][b]:>4} {cnts['M'][b]:>4} {cnts['F'][b]:>4}")

# --- Q metrics ---
print("\n[Q metrics]  donors / repeatRate / top20Pct / avgGift / maxed")
Q_D = {}
for t in ['K','M','F']:
    dd = dedup(comm(t)); net = netby(dd)
    pos = sorted([v for v in net.values() if v > 0], reverse=True)
    total = sum(pos)
    cnt = Counter(r['contributor_name'] for r in dd)
    repeat = sum(1 for n in net if net[n] > 0 and cnt[n] > 1) / len(pos) * 100
    top20 = sum(pos[:20]) / total * 100
    posrows = [r for r in dd if amt(r) > 0]
    avg_gift = sum(amt(r) for r in posrows) / len(posrows)
    maxed = sum(1 for v in net.values() if v >= 3500)
    Q_D[t] = {'donors': len(pos), 'repeat': round(repeat, 1), 'top20': round(top20, 1),
              'avg': int(round(avg_gift)), 'maxed': maxed}
    print(f"  {t}: donors={len(pos)}  repeat={repeat:.1f}%  top20={top20:.1f}%  avgGift(per-contrib)=${avg_gift:,.0f}  maxed={maxed}")

# --- ultra-loyalists / triple-max / over-cap ---
Kd = dedup(comm('K')); Knet = netby(Kd)
ge7 = sorted([(n, v) for n, v in Knet.items() if v >= 7000], key=lambda x: -x[1])
trip = [(n, v) for n, v in ge7 if abs(v - 10500) < 1]
part = [(n, v) for n, v in ge7 if 7000 <= v < 10500]
over = [(n, v) for n, v in Knet.items() if v > 10500.5]
print("\n[ultra-loyalists]  Kingston net >= $7,000")
print(f"  total: {len(ge7)} donors, ${sum(v for _,v in ge7):,.0f}")
print(f"  triple-max (=$10,500): {len(trip)} donors, ${sum(v for _,v in trip):,.0f}")
print(f"  partial ($7,000-10,499): {len(part)} donors, ${sum(v for _,v in part):,.0f}")
print(f"  OVER $10,500 cap: {len(over)}  (compliance-overhang artifact -> should be 0)")

# --- MODEL 2 (Kingston unused donor capacity) ---
# General room nets out partial general-election gifts: a donor who already
# gave $3,000 toward the general has $500 of legal room left, not $3,500.
print("\n[MODEL 2]  Kingston unused donor capacity")
elnet = defaultdict(lambda: defaultdict(float))
for r in Kd: elnet[r['contributor_name']][r['election_type']] += amt(r)
donors_pos = [n for n, v in Knet.items() if v > 0]
pmaxed = [n for n in donors_pos if elnet[n].get('P2026', 0) >= 3500]
m2_below = [n for n in donors_pos if elnet[n].get('P2026', 0) < 3500]
proom = sum(3500 - elnet[n].get('P2026', 0) for n in m2_below)
gnot = [n for n in pmaxed if elnet[n].get('G2026', 0) < 3500]
groom = sum(3500 - min(3500, elnet[n].get('G2026', 0)) for n in gnot)
print(f"  itemized rows={len(Kd)}  rows at exactly $3,500={sum(1 for r in Kd if amt(r) == 3500)}")
print(f"  primary-maxed donors={len(pmaxed)}  below-cap donors={len(m2_below)}  primary room=${proom:,.0f} (avg ${proom/len(m2_below):,.0f})")
print(f"  primary-maxed but not general-maxed={len(gnot)}  general room=${groom:,.0f}")
print(f"  total addressable without a single new donor: ${proom + groom:,.0f}")

# --- DOUBLE_MAX (existing 15 named donors, corrected) ---
meta = {}
for r in Kd:
    meta[r['contributor_name']] = (r['contributor_city'], r['contributor_state'],
                                   r['contributor_occupation'].strip(), r['contributor_employer'].strip())
NAMES15 = ['CRITZ, DALE C. JR.','HOLLIS, TJ','DEMERE, CHRISTIAN B.','DORSEY, WILLIAM S. III',
           'MOLANDO, OLIVIA','PORTER, JOHN KNOX JR.','WATERS, DON L.','SMITH, BYRON L.',
           'HUFSTETLER, TERESA','HUFSTETLER, STEVE','DULANY, F. REED III','DANIEL, MARVIN',
           'PATTIZ, WILLIAM','PATTIZ, JAMES A.','SKEADAS, JOHN III']
print("\n[DOUBLE_MAX]  the 15 named donors, corrected (ordered by amount)")
disp = sorted(NAMES15, key=lambda n: -Knet.get(n, 0))
for n in disp:
    c, s, o, e = meta.get(n, ('?','?','?','?'))
    print(f"  ${Knet.get(n,0):>7,.0f}  {n:24} {c}, {s} | {o} | {e}")

# --- BUNDLERS (same 8 firms, corrected) ---
print("\n[BUNDLERS]  same 8 firms, corrected totals (+ note new clusters)")
FIRMS = {'Critz Inc.':'CRITZ INC', 'Pintail Site Preparation':'PINTAIL', "Mingledorff's Inc.":'MINGLEDORFF',
         'Sterling Seacrest Pritchard':'STERLING SEACREST', 'Oliver Maner LLP':'OLIVER MANER',
         'Tiber Creek Group':'TIBER CREEK', 'Weiner Shearouse Weitz Greenberg & Shawe':'WEINER',
         'Osteen Law Group':'OSTEEN'}
emp = defaultdict(lambda: [0.0, set()])
for r in Kd:
    e = r['contributor_employer'].strip().upper()
    if e and e not in ('NONE','SELF','SELF-EMPLOYED','SELF EMPLOYED','N/A','RETIRED'):
        emp[e][0] += amt(r); emp[e][1].add(r['contributor_name'])
for disp_name, keyfrag in FIRMS.items():
    tot = 0.0; donors = set()
    for e, (v, ds) in emp.items():
        if keyfrag in e: tot += v; donors |= ds
    print(f"  {disp_name:42} ${tot:>8,.0f}  n={len(donors)}")
print("  -- other clusters with 3+ donors not in the list --")
for e, (v, ds) in sorted(emp.items(), key=lambda x: -len(x[1][1])):
    if len(ds) >= 3 and not any(k in e for k in FIRMS.values()):
        print(f"     {e[:40]:40} ${v:>8,.0f}  n={len(ds)}")

# --- SHARED (cross-candidate) ---
# Names are normalized (periods stripped, whitespace collapsed) before the
# cross-candidate join: committees punctuate the same donor differently
# ('SMITH, BYRON L.' vs 'SMITH, BYRON L'), which previously hid three hedgers.
def normname(n): return ' '.join(n.replace('.', '').split())
print("\n[SHARED]  donors to 2+ candidates (names normalized across committees)")
allnet = defaultdict(lambda: defaultdict(float)); cmeta = {}
for t in ['K','M','F']:
    for r in dedup(comm(t)):
        n = normname(r['contributor_name'])
        allnet[n][t] += amt(r)
        cmeta[n] = (r['contributor_city'], r['contributor_state'], r['contributor_zip'][:5])
for n, d in sorted([(n, d) for n, d in allnet.items() if sum(1 for t in d if d[t] > 0) >= 2],
                   key=lambda x: -sum(x[1].values())):
    c, s, z = cmeta[n]
    print(f"  {n:22} {c} {z}  K={int(d.get('K',0))} M={int(d.get('M',0))} F={int(d.get('F',0))}")

# --- OCCUPATIONS (per donor, net > 0; the dashboard chart is labeled
#     "Donor occupations", so count each donor once, not each contribution) ---
print("\n[OCCUPATIONS]  per donor (top 10)")
OCC_D = {}
for t in ['K','M','F']:
    dd = dedup(comm(t)); net = netby(dd); occ = {}
    for r in dd:
        if r['contributor_occupation'].strip():
            occ[r['contributor_name']] = r['contributor_occupation'].strip().upper()
    c = Counter(occ[n] for n, v in net.items() if v > 0 and n in occ)
    OCC_D[t] = c
    print(f"  {t}: " + " | ".join(f"{o}={n}" for o, n in c.most_common(10)))

# --- retiree % (per donor) ---
print("\n[retiree %]  retired donors / donors")
RET_D = {}
for t in ['K','M','F']:
    dd = dedup(comm(t)); net = netby(dd); occ = {}
    for r in dd: occ[r['contributor_name']] = r['contributor_occupation'].strip().upper()
    don = [n for n, v in net.items() if v > 0]
    ret = sum(1 for n in don if occ[n] == 'RETIRED')
    RET_D[t] = round(ret / len(don) * 100)
    print(f"  {t}: {ret}/{len(don)} = {ret/len(don)*100:.0f}%")

# --- gender (Kingston) ---
print("\n[gender]  Kingston (name-inferred)")
GENDER_D = {}
try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("e", "enrich_donors.py")
    e = importlib.util.module_from_spec(spec); spec.loader.exec_module(e)
    fn = {}
    for r in Kd: fn[r['contributor_name']] = r['contributor_first_name']
    g = defaultdict(lambda: [0, 0.0])
    for n, v in Knet.items():
        if v > 0: g[e.classify_gender(fn[n])][0] += 1; g[e.classify_gender(fn[n])][1] += v
    td = sum(x[0] for x in g.values()); tm = sum(x[1] for x in g.values())
    for gg in ['Male', 'Female']:
        c, d = g[gg]
        below = [(n, v) for n, v in Knet.items() if v > 0 and e.classify_gender(fn[n]) == gg and v < 3500]
        head = sum(3500 - v for _, v in below)
        GENDER_D[gg] = (len(below), int(round(head)))
        print(f"  {gg}: {c} donors ({c/td*100:.1f}% head, {d/tm*100:.1f}% $) avg=${d/c:,.0f}; {len(below)} below cap, headroom ${head:,.0f}")
except Exception as ex:
    print("  (gender skipped:", ex, ")")

# --- households (2+ maxers same lastname+zip) ---
print("\n[households]  2+ members each net >= $3,500 (lastname+zip5)")
lz = {}
for r in Kd: lz[r['contributor_name']] = (r['contributor_last_name'].strip().upper(), r['contributor_zip'][:5])
hh = defaultdict(list)
for n, v in Knet.items():
    if v >= 3500: hh[lz[n]].append((n, v))
multi = {k: v for k, v in hh.items() if len(v) >= 2}
HH_TOT = sum(v for vs in multi.values() for _, v in vs)
print(f"  households={len(multi)}  combined=${HH_TOT:,.0f}  ({HH_TOT/sum(v for v in Knet.values() if v>0)*100:.0f}% of itemized)")
for (ln, z), mem in sorted(multi.items(), key=lambda x: -sum(v for _, v in x[1]))[:16]:
    print(f"    {ln:14} {z}  n={len(mem)} ${sum(v for _, v in mem):,.0f}")

# --- GEO (P2026, dedup) ---
print("\n[GEO]  primary $ by region (out-of-state / Atlanta GA-30 / in-district GA-rest)")
GEO_D = {}
for t in ['K','M','F']:
    d = [r for r in dedup(comm(t)) if r['election_type'] == 'P2026']
    out = sum(amt(r) for r in d if r['contributor_state'] != 'GA')
    atl = sum(amt(r) for r in d if r['contributor_state'] == 'GA' and r['contributor_zip'][:2] == '30')
    ind = sum(amt(r) for r in d if r['contributor_state'] == 'GA' and r['contributor_zip'][:2] != '30')
    GEO_D[t] = (int(round(ind)), int(round(atl)), int(round(out)), round(ind / (ind + atl + out) * 100, 1))
    print(f"  {t}: inDist={ind:,.0f}  atlanta={atl:,.0f}  outState={out:,.0f}  inDistPct={ind/(ind+atl+out)*100:.1f}%")

# --- TOP_ZIPS (dedup, all elections) ---
print("\n[TOP_ZIPS]  $ per candidate for the 17 dashboard ZIPs")
ZLIST = ['31411','31406','31410','31401','31522','31324','31405','31416','31322','31419',
         '31404','30327','30305','31407','30269','31331','31545']
zsum = {t: defaultdict(float) for t in ['K','M','F']}
for t in ['K','M','F']:
    for r in dedup(comm(t)): zsum[t][r['contributor_zip'][:5]] += amt(r)
for zp in ZLIST:
    h = HHI.get(zp)
    print(f"  {zp}: K={int(zsum['K'][zp]):>7} M={int(zsum['M'][zp]):>6} F={int(zsum['F'][zp]):>6}  HHI={h if h is not None else 'no ACS estimate'}")

# --- INCOME_TIER (% of classifiable $) + weighted avg ---
print("\n[INCOME_TIER]  % of classifiable $ (out-of-state + GA-with-HHI)")
TIER_D = {}
for t in ['K','M','F']:
    net = netby(dedup(comm(t))); st = {}; zp = {}
    for r in dedup(comm(t)): st[r['contributor_name']] = r['contributor_state']; zp[r['contributor_name']] = r['contributor_zip'][:5]
    td = defaultdict(float)
    for n, v in net.items():
        if v <= 0: continue
        if st[n] != 'GA': td['Out'] += v
        else:
            tt = tier(HHI.get(zp[n]))
            if tt == 'Unknown': continue   # exclude un-mapped GA zips from denominator
            td[tt] += v
    tot = sum(td.values())
    p = {k: td[k] / tot * 100 for k in td}
    TIER_D[t] = p
    print(f"  {t}: High={p.get('High',0):.1f} UpperMid={p.get('UpperMid',0):.1f} Middle={p.get('Middle',0):.1f} Low={p.get('Low',0):.1f} Out={p.get('Out',0):.1f}")

print("\n[weighted avg donor ZIP income]  over donors with known ZIP HHI")
WAVG_D = {}
for t in ['K','M','F']:
    net = netby(dedup(comm(t))); zp = {}
    for r in dedup(comm(t)): zp[r['contributor_name']] = r['contributor_zip'][:5]
    wsum = wbase = total = 0
    for n, v in net.items():
        if v <= 0: continue
        total += v; h = HHI.get(zp[n])
        if h: wsum += v * h; wbase += v
    WAVG_D[t] = (int(round(wsum / wbase)), round(wbase / total * 100, 1))
    print(f"  {t}: ${wsum/wbase:,.0f}  coverage={wbase/total*100:.1f}%")

# --- wealthy-zip + atlanta moat ---
# The dashboard's wealth section is scoped to GEORGIA wealthy ZIPs ("Georgia's
# wealthiest neighborhoods"), so GA-only is the figure it displays; the
# all-states total is printed alongside for context.
WZ = [z for z, h in HHI.items() if h >= 90000]
zst = {}
for t in ['K','M','F']:
    for r in dedup(comm(t)): zst[r['contributor_zip'][:5]] = r['contributor_state']
WZGA = [z for z in WZ if zst.get(z) == 'GA']
print("\n[wealthy ZIP (ACS HHI>=90k)]  GA-only (dashboard figure) / all states")
WGA_D = {}
for t in ['K','M','F']:
    WGA_D[t] = int(round(sum(zsum[t][z] for z in WZGA)))
    print(f"  {t}: GA-only=${WGA_D[t]:,.0f}   all-states=${sum(zsum[t][z] for z in WZ):,.0f}")
print(f"  qualifying GA ZIPs with any money: {sum(1 for z in WZGA if zsum['K'][z] or zsum['M'][z] or zsum['F'][z])}")
ATL = ['30327','30305','30269','30342','30309']
MOAT_K = int(round(sum(zsum['K'][z] for z in ATL)))
MOAT_OPP = int(round(sum(zsum['M'][z] + zsum['F'][z] for z in ATL)))
print(f"[Atlanta moat 5 ZIPs]  K=${MOAT_K:,.0f}  opp=${MOAT_OPP:,.0f}")

# ============================================================================
# SELF-CHECK MODE (--check): compare every dashboard constant in the JSX
# against the values derived above. Prints a plain-English PASS/FAIL line per
# item and exits 1 on any mismatch, so a number that cannot be reproduced from
# source data cannot survive a verification run. Guards the CLAUDE.md rule
# "No fabricated data". Use --jsx <path> to point at a different file (testing).
# ============================================================================
import sys
if '--check' in sys.argv:
    import re
    jsx_path = 'Kingston_Dashboard.jsx'
    if '--jsx' in sys.argv:
        jsx_path = sys.argv[sys.argv.index('--jsx') + 1]
    src = open(jsx_path).read()
    failures = []

    def chk(label, dashboard_has, derived):
        if dashboard_has == derived:
            print(f"  PASS  {label}")
        else:
            failures.append(label)
            print(f"  FAIL  {label}")
            print(f"        dashboard has {dashboard_has!r}")
            print(f"        derived       {derived!r}")

    def chk_text(label, needle):
        if needle in src:
            print(f"  PASS  {label}")
        else:
            failures.append(label)
            print(f"  FAIL  {label} — expected to find the text {needle!r}; the prose or stat is stale")

    print("\n" + "=" * 72)
    print(f"SELF-CHECK — comparing {jsx_path} against freshly derived values")
    print("=" * 72)

    # -- TOP_ZIPS: dollars per candidate + ACS income (null where no estimate) --
    block = re.search(r'const TOP_ZIPS = \[(.*?)\];', src, re.S).group(1)
    rows_j = re.findall(r"zip: '(\d{5})'.*?hhi: (null|\d+),\s*Kingston: (\d+),\s*Montgomery: (\d+),\s*Farrell: (\d+)", block)
    chk('TOP_ZIPS row count', len(rows_j), len(ZLIST))
    for zp, h, k, mn, f in rows_j:
        chk(f'TOP_ZIPS {zp} dollars K/M/F', (int(k), int(mn), int(f)),
            (int(zsum['K'][zp]), int(zsum['M'][zp]), int(zsum['F'][zp])))
        chk(f'TOP_ZIPS {zp} ACS income', None if h == 'null' else int(h), HHI.get(zp))

    # -- CUMULATIVE / MONTHLY --
    for arr_name, store in (('CUMULATIVE', CUM_D), ('MONTHLY', MONTHLY_D)):
        b = re.search(r'const %s = \[(.*?)\];' % arr_name, src, re.S).group(1)
        rj = re.findall(r"Kingston: (\d+),\s*Montgomery: (\d+),\s*Farrell: (\d+)", b)
        for i, t in enumerate('KMF'):
            chk(f'{arr_name} {t}', [int(r[i]) for r in rj], store[t])

    # -- AMOUNT_DIST --
    SHORT2BUCKET = {'<$100': '<$100', '$100': '$100', '$250': '$250', '$500': '$500',
                    '$1K': '$1K', '$2.5K': '$2.5K', '$3.5K max': '$3.5K',
                    '$3.5–7K': '$3.5-7K', '$7K (2×)': '$7K', '>$7K': '>$7K'}
    b = re.search(r'const AMOUNT_DIST = \[(.*?)\];', src, re.S).group(1)
    for short, k, mn, f in re.findall(r"short: '([^']+)',\s*Kingston: (\d+),\s*Montgomery: (\d+),\s*Farrell: (\d+)", b):
        bk_key = SHORT2BUCKET[short]
        chk(f'AMOUNT_DIST {bk_key}', (int(k), int(mn), int(f)),
            (cnts['K'][bk_key], cnts['M'][bk_key], cnts['F'][bk_key]))

    # -- Q metrics + GEO --
    qb = re.search(r'const Q = \{(.*?)\};', src, re.S).group(1)
    gb = re.search(r'const GEO = \{(.*?)\};', src, re.S).group(1)
    for t, nm in (('K', 'Kingston'), ('M', 'Montgomery'), ('F', 'Farrell')):
        mq = re.search(nm + r":\s*\{ donors: (\d+),\s*repeatRate: ([\d.]+),\s*top20Pct: ([\d.]+),\s*avgGift: (\d+),\s*inDistPct: ([\d.]+),\s*maxed: (\d+)", qb)
        chk(f'Q {nm} (donors/repeat/top20/avgGift/maxed)',
            (int(mq.group(1)), float(mq.group(2)), float(mq.group(3)), int(mq.group(4)), int(mq.group(6))),
            (Q_D[t]['donors'], Q_D[t]['repeat'], Q_D[t]['top20'], Q_D[t]['avg'], Q_D[t]['maxed']))
        chk(f'Q {nm} inDistPct', float(mq.group(5)), GEO_D[t][3])
        mg = re.search(nm + r":\s*\{ inDist: (\d+),\s*atlanta: (\d+),\s*outState: (\d+)", gb)
        chk(f'GEO {nm}', tuple(int(x) for x in mg.groups()), GEO_D[t][:3])

    # -- INCOME_TIER --
    b = re.search(r'const INCOME_TIER = \[(.*?)\];', src, re.S).group(1)
    TIERKEY = {'High': 'High', 'Upper-Mid': 'UpperMid', 'Middle': 'Middle', 'Low': 'Low', 'Out-of-state': 'Out'}
    tier_rows = re.findall(r"tier: '([^']+)',\s*Kingston: ([\d.]+),\s*Montgomery: ([\d.]+),\s*Farrell: ([\d.]+)", b)
    chk('INCOME_TIER row count', len(tier_rows), 5)
    for label, k, mn, f in tier_rows:
        key = TIERKEY[label.split(' (')[0].strip()]
        chk(f'INCOME_TIER {key}', (float(k), float(mn), float(f)),
            tuple(round(TIER_D[t].get(key, 0), 1) for t in 'KMF'))

    # -- OCCUPATIONS (per donor) --
    ob = re.search(r'const OCCUPATIONS = \{(.*?)\n\};', src, re.S).group(1)
    for t, nm in (('K', 'Kingston'), ('M', 'Montgomery'), ('F', 'Farrell')):
        sub = re.search(nm + r": \[(.*?)\],", ob, re.S).group(1)
        entries = re.findall(r"occ: '([^']+)',\s*n: (\d+)", sub)
        for occ_name, n in entries:
            chk(f'OCCUPATIONS {nm} "{occ_name}"', int(n), OCC_D[t].get(occ_name.upper(), 0))

    # -- Retiree shares --
    for nm, r_, o in re.findall(r"\{ name: '(\w+)', retirees: (\d+), other: (\d+) \}", src):
        chk(f'Retiree share {nm}', int(r_), RET_D[nm[0]])

    # -- SHARED (compare the multiset of K/M/F amount triples) --
    b = re.search(r'const SHARED = \[(.*?)\];', src, re.S).group(1)
    got = sorted(tuple(int(x) for x in r) for r in
                 re.findall(r"Kingston: (\d+),\s*Montgomery: (\d+),\s*Farrell: (\d+),\s*tone", b))
    want = sorted((int(d.get('K', 0)), int(d.get('M', 0)), int(d.get('F', 0)))
                  for n, d in allnet.items() if sum(1 for t in d if d[t] > 0) >= 2)
    chk('SHARED donor count (cross-candidate, normalized names)', len(got), len(want))
    chk('SHARED amount triples', got, want)
    chk_text('SHARED count in Insight 05 stat', f"value: '{len(want)}'")

    # -- BUNDLERS (compare the multiset of (donor-count, total) pairs) --
    b = re.search(r'const BUNDLERS = \[(.*?)\];', src, re.S).group(1)
    got = sorted((int(n), int(tt)) for n, tt in re.findall(r"n: (\d+),\s*total: (\d+)", b))
    want_b = []
    for disp_name, keyfrag in FIRMS.items():
        ftot = 0.0; fdonors = set()
        for e, (v, ds) in emp.items():
            if keyfrag in e: ftot += v; fdonors |= ds
        want_b.append((len(fdonors), int(round(ftot))))
    for e, (v, ds) in emp.items():
        if len(ds) >= 3 and not any(kf in e for kf in FIRMS.values()):
            want_b.append((len(ds), int(round(v))))
    chk('BUNDLERS cluster count (every employer with 3+ donors)', len(got), len(want_b))
    chk('BUNDLERS (donors, total) pairs', got, sorted(want_b))
    btotal = sum(tt for _, tt in want_b)
    chk_text('Bundler stat total', f"value: '${btotal/1000:.0f}K'")
    chk_text('Bundler stat firm count', f"label: 'from {len(want_b)} firms'")

    # -- Weighted avg donor ZIP income + wealthy-ZIP GA totals --
    for nm, wa, cv in re.findall(r"\{ name: '(\w+)',\s*wAvg: (\d+),\s*cov: ([\d.]+) \}", src):
        chk(f'Weighted avg ZIP income {nm}', (int(wa), float(cv)), WAVG_D[nm[0]])
    for nm, tt in re.findall(r"name: '(\w+)',\s*total: (\d+),\s*color", src):
        chk(f'Wealthy-ZIP GA-only total {nm}', int(tt), WGA_D[nm[0]])
    chk_text('Wealthy-ZIP header dollars', f"${WGA_D['K']:,} came from Georgia ZIPs")

    # -- Key prose figures (expected strings are built from derived values) --
    at35 = sum(1 for r in Kd if amt(r) == 3500)
    chk_text('Model 2 donors/rows line', f"{len(donors_pos)} unique donors, {len(Kd)} itemized contributions")
    chk_text('Model 2 at-cap/maxed line', f"{at35} contributions at exactly $3,500 (primary cap); {len(pmaxed)} donors net-maxed")
    chk_text('Model 2 general-room donors', f"{len(gnot)} of those have not given $3,500 to general")
    chk_text('Model 2 below-cap line', f"{len(m2_below)} donors below primary cap, avg remaining capacity ${proom/len(m2_below):,.0f}")
    chk_text('Model 2 primary room', f"${proom:,.0f}")
    chk_text('Model 2 general room', f"${groom:,.0f}")
    chk_text('Model 2 total addressable', f"${proom + groom:,.0f}")
    chk_text('Ultra-loyalist stat', f"value: '${sum(v for _, v in ge7)/1000:.0f}K'")
    chk_text('Ultra-loyalist donor count', f"label: 'from {len(ge7)} donors'")
    chk_text('Triple-max line', f"{len(trip)} donors · ${sum(v for _, v in trip)/1000:.0f}K")
    chk_text('Partial-triple line', f"{len(part)} donors · ${sum(v for _, v in part)/1000:.0f}K")
    chk_text('Runoff capacity', f"${len(part)*10500 - sum(v for _, v in part):,.0f} in legal runoff capacity")
    chk_text('Over-cap stat (compliance)', f"value: '{len(over)}'")
    chk_text('Household count', f"{len(multi)} Kingston households")
    chk_text('Household combined net', f"${HH_TOT:,.0f} net")
    chk_text('Atlanta moat Kingston', f"${MOAT_K:,.0f} combined")
    chk_text('Atlanta moat opponents', f"${MOAT_OPP:,.0f} total")

    # -- FIN: not derivable from the Schedule A CSV (it is FEC Form 3 summary
    #    data), so only internal consistency is checked here --
    fb = re.search(r'const FIN = \{(.*?)\};', src, re.S).group(1)
    for nm in ('Kingston', 'Montgomery', 'Farrell'):
        mf = re.search(nm + r":\s*\{ receipts: (\d+),\s*indiv: (\d+),\s*itemized: (\d+),\s*unitemized: (\d+),\s*pac: (\d+),\s*selfLoans: (\d+),\s*selfContrib: (\d+)", fb)
        rec, ind, it, un, pac, sl, sc = (int(x) for x in mf.groups())
        chk(f'FIN {nm} internal consistency (itemized+unitemized≈indiv, parts≈receipts, ±$1)',
            (abs(it + un - ind) <= 1, abs(ind + pac + sl + sc - rec) <= 1), (True, True))
    print("  NOTE  FIN values come from FEC Form 3 summary filings and cannot be re-derived")
    print("        from the Schedule A CSV — verify them against fec.gov when refreshing data.")

    # ========================================================================
    # EXTENDED GUARDS — added after several hardcoded/duplicated values drifted
    # from the constants on a data refresh. Each is re-derived from source here,
    # so a refresh that updates a constant but forgets a dependent prose figure
    # or duplicated array now FAILS this check instead of shipping stale.
    # ========================================================================
    def fmtk(n):
        n = int(round(n))
        if n == 0: return '$0'
        if abs(n) >= 1000000: return '$%.2fM' % (n / 1000000)
        if abs(n) >= 20000: return '$%dK' % round(n / 1000)
        if abs(n) >= 1000:
            s = '%.1f' % (n / 1000)
            return '$' + (s[:-2] if s.endswith('.0') else s) + 'K'
        return '$%d' % n

    JFIN = {}
    for nm in ('Kingston', 'Montgomery', 'Farrell'):
        m = re.search(nm + r":\s*\{ receipts: (\d+),\s*indiv: (\d+),\s*itemized: (\d+),\s*unitemized: (\d+),\s*pac: (\d+),\s*selfLoans: (\d+),\s*selfContrib: (\d+),\s*spent: (\d+),\s*cash: (\d+),\s*debt: (\d+)", fb)
        JFIN[nm] = dict(zip(['receipts','indiv','itemized','unitemized','pac','selfLoans','selfContrib','spent','cash','debt'], (int(x) for x in m.groups())))
    F3_ITEM = {'Kingston': 1659885, 'Montgomery': 225957, 'Farrell': 149276}

    # -- Geography wealthy-ZIP leaderboard: every ZIP $ must equal the derived per-ZIP sum --
    lb = re.search(r'WEALTHY ZIPS LEADERBOARD(.*?)\]\.map\(z =>', src, re.S)
    if lb:
        rowsLB = re.findall(r"zip: '(\d+)',.*?hhi: \d+,\s*K:\s*(\d+),\s*M:\s*(\d+),\s*F:\s*(\d+)", lb.group(1), re.S)
        chk('Wealthy leaderboard row count', len(rowsLB), 8)
        for zp, k, mn, f in rowsLB:
            # TOP_ZIPS (and therefore the leaderboard that mirrors it) truncate cents
            # with int(), so compare on the same convention rather than rounding.
            chk(f'Wealthy leaderboard {zp} K/M/F', (int(k), int(mn), int(f)),
                (int(zsum['K'][zp]), int(zsum['M'][zp]), int(zsum['F'][zp])))
        mk = re.search(r'const maxK = (\d+)', src)
        chk('Wealthy leaderboard maxK', int(mk.group(1)), max(int(zsum['K'][zp]) for zp, *_ in rowsLB))
        chk_text('Wealthy bar denominator', f"d.total / {WGA_D['K']})")
        chk_text('Wealthy prose Kingston total', f"{fmtk(WGA_D['K'])}</strong> from these neighborhoods")
        chk_text('Wealthy prose opponents total', f"combined <strong>{fmtk(WGA_D['M'] + WGA_D['F'])}</strong>")

    # -- Atlanta-moat chart array + totals --
    az = re.search(r'const atlantaZips = \[(.*?)\];', src, re.S)
    if az:
        for zp, king, oth in re.findall(r"zip: '(\d+)',.*?Kingston: (\d+),\s*other: (\d+)", az.group(1), re.S):
            chk(f'atlantaZips {zp} Kingston/other', (int(king), int(oth)),
                (int(round(zsum['K'][zp])), int(round(zsum['M'][zp] + zsum['F'][zp]))))
    chk_text('Atlanta moat Kingston combined', f"{MOAT_K:,} combined")
    chk_text('Atlanta moat opponents total', f"{MOAT_OPP:,} total")
    chk_text('Atlanta moat stat value', f"value: '{fmtk(MOAT_K)}'")

    # -- 'outside GA-1' dollars = Atlanta + out-of-state --
    chk_text('Kingston outside-GA-1 dollars', f"{fmtk(GEO_D['K'][1] + GEO_D['K'][2])} from outside GA-1")

    # -- 31416 head-to-head shares (Kingston's lowest-leading ZIP; Farrell's best) --
    z16 = zsum['K']['31416'] + zsum['M']['31416'] + zsum['F']['31416']
    chk('31416 Kingston share %', round(zsum['K']['31416'] / z16 * 100), 55)
    chk('31416 Farrell share %', round(zsum['F']['31416'] / z16 * 100), 45)

    # -- reconciliation deltas (Schedule A derived itemized vs Form 3 itemized) --
    for nm, t in (('Kingston', 'K'), ('Montgomery', 'M'), ('Farrell', 'F')):
        der = sum(amt(r) for r in dedup(comm(t)))
        d = abs(F3_ITEM[nm] - der) / F3_ITEM[nm] * 100
        chk_text(f'Reconciliation delta {nm}', f"<strong>{d:.1f}%</strong> ({nm})")

    # -- Model 6 efficiency footnote (cents per $1 raised; Farrell $ per earned dollar) --
    kc = round(JFIN['Kingston']['spent'] / JFIN['Kingston']['receipts'] * 100)
    fe = JFIN['Farrell']['spent'] / (JFIN['Farrell']['indiv'] + JFIN['Farrell']['pac'])
    chk_text('Model 6 Kingston cents', f"Kingston spends {kc}¢ to raise")
    chk_text('Model 6 Farrell $/dollar', f"Farrell spends ${fe:.2f} per earned")

    # -- Insight 08 final-stretch cash ratios --
    km = round(JFIN['Kingston']['cash'] / JFIN['Montgomery']['cash'])
    fm = round(JFIN['Farrell']['cash'] / JFIN['Montgomery']['cash'], 1)
    chk_text('Insight 08 cash ratios', f"{km}× Montgomery's cash; Farrell has {fm}×")

    # -- Insight 10 opponent unitemized small-dollar shares --
    um = JFIN['Montgomery']['unitemized'] / JFIN['Montgomery']['indiv'] * 100
    uf = JFIN['Farrell']['unitemized'] / JFIN['Farrell']['indiv'] * 100
    chk_text('Insight 10 opponent unitemized', f"Montgomery {um:.1f}%, Farrell {uf:.1f}%")
    chk_text('Insight 10 Kingston unitemized stat', f"value: '{JFIN['Kingston']['unitemized'] / JFIN['Kingston']['indiv'] * 100:.1f}%'")

    # -- ultra-loyalist concentration (top 13% of donors -> % of itemized money) --
    chk_text('Ultra-loyalist money share', f"producing {round(sum(v for _, v in ge7) / JFIN['Kingston']['itemized'] * 100)}% of the money")

    # -- gender headroom (name-inferred; only if the gender pass produced values) --
    if GENDER_D:
        for gg in ('Male', 'Female'):
            nb, hd = GENDER_D[gg]
            chk_text(f'Gender {gg} headroom', f"{nb} below cap · ~{fmtk(hd)} of headroom")

    print("-" * 72)
    if failures:
        print(f"SELF-CHECK FAILED — {len(failures)} item(s) above did not match the derived data:")
        for fl in failures:
            print(f"  - {fl}")
        print("Next step: for each item, either the dashboard constant is stale (re-derive and")
        print("update it) or the derivation changed (update the dashboard and its prose to")
        print('match). A number that cannot be re-derived must not ship — see CLAUDE.md →')
        print('"No fabricated data".')
        sys.exit(1)
    print("SELF-CHECK PASSED — every checked dashboard constant matches the derived data.")
