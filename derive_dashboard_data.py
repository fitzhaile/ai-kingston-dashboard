#!/usr/bin/env python3
"""
Derive every Schedule-A-based dashboard constant from FEC itemized individual
contributions, through 3/31/2026.

Methodology (reconciles to FEC Form 3 itemized totals within ~0.15%):
  - scope:   entity_type == 'IND' (individual contributions only; matches the
             original congresscontributions.csv export exactly through 12/31/2025)
  - dedup:   by transaction_id, which removes the duplicated "SEE REATTRIBUTION
             BELOW" memo rows that otherwise double-count over-limit checks
             (the bug that produced illegal >$10,500 donor totals)
  - per-donor aggregation: by contributor_name (NET, i.e. refunds/redesignations
             subtracted)

Run:  python3 derive_dashboard_data.py
Input: congresscontributions_through_march2026.csv  (FEC Schedule A, cycle 2026,
       contribution_receipt_date <= 2026-03-31, pulled from api.open.fec.gov)
"""
import csv
from collections import defaultdict, Counter

SRC = "congresscontributions_through_march2026.csv"
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
          ('2026-02','Feb'),('2026-03','Mar')]

print("="*72)
print("DASHBOARD CONSTANTS — DERIVED THROUGH 3/31/2026 (IND, dedup-by-transaction_id)")
print("="*72)

# --- itemized totals (checksum vs FEC) ---
print("\n[itemized individual totals]   FEC Form 3: K 1,622,210 | M 216,349 | F 139,401")
for t in ['K','M','F']:
    dd = dedup(comm(t))
    print(f"  {t}: ${sum(amt(r) for r in dd):>12,.0f}")

# --- CUMULATIVE / MONTHLY (P2026 primary, dedup) ---
print("\n[CUMULATIVE / MONTHLY]  primary (P2026), Jun 2025 .. Mar 2026")
for t in ['K','M','F']:
    dd = [r for r in dedup(comm(t)) if r['election_type'] == 'P2026']
    mm = defaultdict(float)
    for r in dd: mm[r['contribution_receipt_date'][:7]] += amt(r)
    monthly = [int(round(mm.get(k, 0))) for k, _ in MONTHS]
    cum = []; s = 0
    for v in monthly: s += v; cum.append(s)
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
print("\n[SHARED]  donors to 2+ candidates")
allnet = defaultdict(lambda: defaultdict(float)); cmeta = {}
for t in ['K','M','F']:
    for r in dedup(comm(t)):
        allnet[r['contributor_name']][t] += amt(r)
        cmeta[r['contributor_name']] = (r['contributor_city'], r['contributor_state'], r['contributor_zip'][:5])
for n, d in sorted([(n, d) for n, d in allnet.items() if sum(1 for t in d if d[t] > 0) >= 2],
                   key=lambda x: -sum(x[1].values())):
    c, s, z = cmeta[n]
    print(f"  {n:22} {c} {z}  K={int(d.get('K',0))} M={int(d.get('M',0))} F={int(d.get('F',0))}")

# --- OCCUPATIONS (per contribution row, dedup) ---
print("\n[OCCUPATIONS]  per contribution row (top 10)")
for t in ['K','M','F']:
    c = Counter(r['contributor_occupation'].strip() for r in dedup(comm(t)) if amt(r) > 0 and r['contributor_occupation'].strip())
    print(f"  {t}: " + " | ".join(f"{o}={n}" for o, n in c.most_common(10)))

# --- retiree % (per donor) ---
print("\n[retiree %]  retired donors / donors")
for t in ['K','M','F']:
    dd = dedup(comm(t)); net = netby(dd); occ = {}
    for r in dd: occ[r['contributor_name']] = r['contributor_occupation'].strip().upper()
    don = [n for n, v in net.items() if v > 0]
    ret = sum(1 for n in don if occ[n] == 'RETIRED')
    print(f"  {t}: {ret}/{len(don)} = {ret/len(don)*100:.0f}%")

# --- gender (Kingston) ---
print("\n[gender]  Kingston (name-inferred)")
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
tot = sum(v for vs in multi.values() for _, v in vs)
print(f"  households={len(multi)}  combined=${tot:,.0f}  ({tot/sum(v for v in Knet.values() if v>0)*100:.0f}% of itemized)")
for (ln, z), mem in sorted(multi.items(), key=lambda x: -sum(v for _, v in x[1]))[:16]:
    print(f"    {ln:14} {z}  n={len(mem)} ${sum(v for _, v in mem):,.0f}")

# --- GEO (P2026, dedup) ---
print("\n[GEO]  primary $ by region (out-of-state / Atlanta GA-30 / in-district GA-rest)")
for t in ['K','M','F']:
    d = [r for r in dedup(comm(t)) if r['election_type'] == 'P2026']
    out = sum(amt(r) for r in d if r['contributor_state'] != 'GA')
    atl = sum(amt(r) for r in d if r['contributor_state'] == 'GA' and r['contributor_zip'][:2] == '30')
    ind = sum(amt(r) for r in d if r['contributor_state'] == 'GA' and r['contributor_zip'][:2] != '30')
    print(f"  {t}: inDist={ind:,.0f}  atlanta={atl:,.0f}  outState={out:,.0f}  inDistPct={ind/(ind+atl+out)*100:.1f}%")

# --- TOP_ZIPS (dedup, all elections) ---
print("\n[TOP_ZIPS]  $ per candidate for the 17 dashboard ZIPs")
ZLIST = ['31411','31406','31410','31401','31522','31324','31405','31416','31322','31419',
         '31404','30327','30305','31407','30269','31331','31545']
zsum = {t: defaultdict(float) for t in ['K','M','F']}
for t in ['K','M','F']:
    for r in dedup(comm(t)): zsum[t][r['contributor_zip'][:5]] += amt(r)
for zp in ZLIST:
    print(f"  {zp}: K={int(zsum['K'][zp]):>7} M={int(zsum['M'][zp]):>6} F={int(zsum['F'][zp]):>6}")

# --- INCOME_TIER (% of classifiable $) + weighted avg ---
print("\n[INCOME_TIER]  % of classifiable $ (out-of-state + GA-with-HHI)")
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
    print(f"  {t}: High={p.get('High',0):.1f} UpperMid={p.get('UpperMid',0):.1f} Middle={p.get('Middle',0):.1f} Low={p.get('Low',0):.1f} Out={p.get('Out',0):.1f}")

print("\n[weighted avg donor ZIP income]  over donors with known ZIP HHI")
for t in ['K','M','F']:
    net = netby(dedup(comm(t))); zp = {}
    for r in dedup(comm(t)): zp[r['contributor_name']] = r['contributor_zip'][:5]
    wsum = wbase = total = 0
    for n, v in net.items():
        if v <= 0: continue
        total += v; h = HHI.get(zp[n])
        if h: wsum += v * h; wbase += v
    print(f"  {t}: ${wsum/wbase:,.0f}  coverage={wbase/total*100:.1f}%")

# --- wealthy-zip + atlanta moat ---
WZ = [z for z, h in HHI.items() if h >= 90000]
print("\n[wealthy ZIP (HHI>=90k)]  Kingston / Montgomery / Farrell")
for t in ['K','M','F']:
    print(f"  {t}: ${sum(zsum[t][z] for z in WZ):,.0f}")
ATL = ['30327','30305','30269','30342','30309']
print(f"[Atlanta moat 5 ZIPs]  K=${sum(zsum['K'][z] for z in ATL):,.0f}  opp=${sum(zsum['M'][z]+zsum['F'][z] for z in ATL):,.0f}")
