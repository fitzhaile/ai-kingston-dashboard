#!/usr/bin/env python3
"""
Derive the Jack-vs-Jim Kingston comparison constants for the "Legacy" tab.

Both donor bases are profiled with the SAME method (all itemized individual
contributions): geography (in-district / metro-Atlanta / rest-of-Georgia / out-of-state), income
tiers, weighted-average donor-ZIP income, wealthy-GA-ZIP haul, occupations — plus
the shared-donor overlap. Jack's dollars are inflation-adjusted to 2026 dollars.

Sources:
  - Jack: FEC Schedule A, committee C00261958 (Friends of Jack Kingston), 2004-2012
          re-election cycles  (jack_kingston_contributions_2004_2012.csv, via pull_jack_kingston.py)
  - Jim:  the project's existing congresscontributions_through_april2026.csv
  - Income: Census ACS 2019-2023 5-year B19013 (zip_hhi_acs2023.csv, via pull_zip_hhi.py)
  - Inflation: CPI-U annual averages, U.S. BLS series CUUR0000SA0 (via pull_cpi.py),
          expressed in 2026 dollars (base = 330.079, Jan-May 2026 average)

Run:  python3 derive_legacy_data.py
"""
import csv, json, sys
from collections import defaultdict

# CPI-U annual averages (BLS CUUR0000SA0; pull_cpi.py). Base = 2026 (330.079).
CPI = {2003: 183.958, 2004: 188.883, 2005: 195.292, 2006: 201.592, 2007: 207.342,
       2008: 215.303, 2009: 214.537, 2010: 218.056, 2011: 224.939, 2012: 229.594}
CPI_BASE = 330.079
def factor(year, cycle):
    y = int(year) if (year or '').isdigit() and int(year) in CPI else cycle
    return CPI_BASE / CPI.get(y, CPI.get(cycle, CPI_BASE))

HHI = {}
for r in csv.DictReader(open('zip_hhi_acs2023.csv')):
    try: HHI[r['zip']] = int(r['hhi'])
    except: pass
def tier(h):
    if h is None: return 'Unknown'
    return 'High' if h >= 125000 else 'UpperMid' if h >= 75000 else 'Middle' if h >= 50000 else 'Low'

# 4-way geography. In-district = the Savannah/coastal home base (ZIP-3 313/314/315 — the
# coastal core the district map (geo_zips.json) uses); metro Atlanta = MSA core 300-303 plus
# Buford (Gwinnett Co., a 305 ZIP); everything else in Georgia = "rest of Georgia" (Statesboro,
# Athens, Augusta, Macon, Valdosta, Moultrie...); non-GA = out-of-state. This replaces the old
# "any 30xxx = Atlanta" rule, which mislabeled ~5 points of non-Atlanta Georgia as Atlanta.
ATL5 = {'30515', '30518', '30519'}  # Buford / Gwinnett Co. — Atlanta MSA, but in the 305 range
def region(st, z):
    if st != 'GA': return 'outState'
    if z[:3] in ('313', '314', '315'): return 'inDist'
    if z[:3] in ('300', '301', '302', '303') or z in ATL5: return 'metroAtl'
    return 'restGA'
def region_zip(z):  # ZIP-only variant for the per-ZIP map/list (Georgia ZIPs only)
    if z[:3] in ('313', '314', '315'): return 'inDist'
    if z[:3] in ('300', '301', '302', '303') or z in ATL5: return 'metroAtl'
    if z[:2] in ('30', '31') or z[:3] in ('398', '399'): return 'restGA'
    return None
GEO_KEYS = ('inDist', 'metroAtl', 'restGA', 'outState')

SUFFIX = {'JR', 'SR', 'II', 'III', 'IV', 'V'}
def keyname(name):
    name = (name or '').upper().replace('.', '')
    last, rest = (name.split(',', 1) + [''])[:2] if ',' in name else ((name.split()[-1:] or [''])[0], '')
    last = ' '.join(t for t in last.split() if t not in SUFFIX)
    firsts = [t for t in rest.split() if t not in SUFFIX]
    return f"{last}|{firsts[0]}" if last and firsts else None
OCC_SKIP = {'INFORMATION REQUESTED', 'REQUESTED', 'REQUESTED PER BEST EFFORTS', 'N/A', 'NA', 'NONE', 'NOT EMPLOYED', ''}
OCC_MAP = {'HOUSEWIFE': 'HOMEMAKER', 'ATTORNEY AT LAW': 'ATTORNEY', 'LAWYER': 'ATTORNEY', 'BUSINESS OWNER': 'OWNER'}

def load_jack():
    for r in csv.DictReader(open('jack_kingston_contributions_2004_2012.csv')):
        yield (r['name'], r['state'], r['zip'][:5], r['occupation'], r['amount'],
               factor(r['year'], int(r['cycle'])))

def load_jim():
    seen = set()
    for r in csv.DictReader(open('congresscontributions_through_april2026.csv')):
        if r['committee_name'] != 'FRIENDS OF JIM KINGSTON' or r['entity_type'] != 'IND': continue
        t = r['transaction_id']
        if t and t in seen: continue
        if t: seen.add(t)
        yield (r['contributor_name'], r['contributor_state'], r['contributor_zip'][:5],
               r['contributor_occupation'], r['contribution_receipt_amount'], 1.0)

def profile(rows):
    # Pass 1: NET each donor (sum their inflation-adjusted contributions; refunds/
    # redesignations net out), same as the dashboard's donor-net convention.
    dnet = defaultdict(float); dmeta = {}
    for name, st, z, occu, amt, f in rows:
        try: dnet[name] += float(amt) * f
        except: continue
        dmeta[name] = (st, z, OCC_MAP.get((occu or '').strip().upper(), (occu or '').strip().upper()))
    # Pass 2: aggregate the donors whose net is positive.
    geo = defaultdict(float); zipd = defaultdict(float); occ = defaultdict(set); ga = set()
    tierd = defaultdict(float); dtot = {}
    tot = wsum = wbase = classif = 0.0
    for name, net in dnet.items():
        if net <= 0: continue
        st, z, o = dmeta[name]
        tot += net; dtot[name] = net
        geo[region(st, z)] += net
        if z: zipd[z] += net
        if st == 'GA' and z: ga.add(z)
        if o not in OCC_SKIP: occ[o].add(name)
        if st != 'GA':
            tierd['Out'] += net; classif += net
        else:
            h = HHI.get(z)
            if h is not None:
                tierd[tier(h)] += net; classif += net; wsum += net * h; wbase += net
    wzga = [z for z in zipd if z in ga and HHI.get(z, 0) >= 90000]
    return {
        'total': tot, 'donors': len({keyname(n) for n in dtot if keyname(n)}),
        'geo': {k: geo[k] for k in GEO_KEYS},
        'geoPct': {k: round(geo[k] / tot * 100, 1) for k in GEO_KEYS},
        'tiers': {k: round(tierd[k] / classif * 100, 1) for k in ('High', 'UpperMid', 'Middle', 'Low', 'Out')},
        'wAvg': int(round(wsum / wbase)), 'wAvgCov': round(wbase / tot * 100, 1),
        'wealthyGA': sum(zipd[z] for z in wzga), 'wealthyPct': round(sum(zipd[z] for z in wzga) / tot * 100, 1),
        'topWealthy': [(z, int(round(zipd[z])), HHI[z]) for z in sorted(wzga, key=lambda z: -zipd[z])[:8]],
        'topZips': [(z, int(round(zipd[z]))) for z in sorted(zipd, key=lambda z: -zipd[z])[:10]],
        'zipdAll': {z: int(round(zipd[z])) for z in zipd},
        'occ': [(o, len(d)) for o, d in sorted(occ.items(), key=lambda x: -len(x[1]))[:10]],
        'keys': {keyname(n) for n in dtot if keyname(n)}, 'dtot': dict(dtot),
    }

J = profile(load_jack()); M = profile(load_jim())
overlap = {n: v for n, v in M['dtot'].items() if keyname(n) in J['keys']}
ov_n, ov_d = len(overlap), sum(overlap.values())

# ---- Build the dashboard's LEGACY constants (used for both --check and regeneration) ----
jbk = defaultdict(float)
for n, v in J['dtot'].items():
    k = keyname(n)
    if k: jbk[k] += v

# Per-ZIP dollars via the Geography tab's exact method (transaction-sum, dedup by
# transaction_id, refunds included) so Jim's per-ZIP figures match geo_zips.json.
def jim_raw():
    for r in csv.DictReader(open('congresscontributions_through_april2026.csv')):
        if r['committee_name'] != 'FRIENDS OF JIM KINGSTON' or r['entity_type'] != 'IND': continue
        try: a = float(r['contribution_receipt_amount'] or 0)
        except: continue
        yield (r['transaction_id'], r['contributor_zip'][:5], a, 1.0)
def jack_raw():
    for r in csv.DictReader(open('jack_kingston_contributions_2004_2012.csv')):
        try: a = float(r['amount'])
        except: continue
        yield (r.get('transaction_id', ''), r['zip'][:5], a, factor(r['year'], int(r['cycle'])))
def zipsum(raw):
    seen = set(); zd = defaultdict(float)
    for txn, z, a, f in raw:
        if txn and txn in seen: continue
        if txn: seen.add(txn)
        if z: zd[z] += a * f
    return zd
MD = zipsum(jim_raw()); JD = zipsum(jack_raw())
jim_tot = sum(MD.values()) or 1.0; jack_tot = sum(JD.values()) or 1.0
# top ZIPs per Georgia region (same split as the geography bars) so each region's biggest
# ZIPs show under its own subtotal — and Atlanta isn't crowded out by concentrated Savannah.
def region_top(reg, n):  # sort by the larger of the two shares (ties break by ZIP, for determinism)
    zs = [z for z in (set(JD) | set(MD)) if region_zip(z) == reg]
    return sorted(zs, key=lambda z: (-max(JD.get(z, 0) / jack_tot, MD.get(z, 0) / jim_tot), z))[:n], sum(1 for z in zs if MD.get(z, 0) > 0)
indist_z, _ = region_top('inDist', 6)
metro_z, metro_n = region_top('metroAtl', 6)
rest_z, _ = region_top('restGA', 5)

# Jack's per-cycle average for each shared-core donor (total / cycles they gave in)
jack_cycles = defaultdict(set)
for r in csv.DictReader(open('jack_kingston_contributions_2004_2012.csv')):
    k = keyname(r['name'])
    if k: jack_cycles[k].add(r['cycle'])
def jack_per_cycle(name):
    k = keyname(name)
    return jbk.get(k, 0) / max(1, len(jack_cycles.get(k, {0})))

def jocc(p): return '[' + ', '.join(f"['{o.title()}',{n}]" for o, n in p['occ']) + ']'
def zrow(z): return "['%s',%.1f,%.1f,%d]" % (z, JD.get(z, 0) / jack_tot * 100, MD.get(z, 0) / jim_tot * 100, HHI.get(z, 0))
def jzips(): return '{ inDist: [%s], metroAtl: [%s], restGA: [%s], atlN: %d }' % (
    ', '.join(zrow(z) for z in indist_z), ', '.join(zrow(z) for z in metro_z), ', '.join(zrow(z) for z in rest_z), metro_n)
def jprof(p):
    return ("{{ donors: {0}, total: {1}, geo: {{ inDist: {2}, metroAtl: {3}, restGA: {4}, outState: {5} }}, "
            "tiers: {{ High: {6}, UpperMid: {7}, Middle: {8}, Low: {9}, Out: {10} }}, wAvg: {11}, "
            "wealthyGA: {12}, wealthyPct: {13}, occ: {14} }}").format(
        p['donors'], round(p['total']), p['geoPct']['inDist'], p['geoPct']['metroAtl'], p['geoPct']['restGA'], p['geoPct']['outState'],
        p['tiers']['High'], p['tiers']['UpperMid'], p['tiers']['Middle'], p['tiers']['Low'], p['tiers']['Out'],
        p['wAvg'], round(p['wealthyGA']), p['wealthyPct'], jocc(p))
ov_header = "n: %d, pct: %.1f, dollars: %d, dollarPct: %.1f" % (
    ov_n, ov_n / M['donors'] * 100, round(ov_d), ov_d / M['total'] * 100)
ov_rows = ["['%s', %d, %d]" % (n.replace("'", ''), round(v), round(jack_per_cycle(n)))
           for n, v in sorted(overlap.items(), key=lambda x: -x[1])[:14]]
# per-ZIP dollars (2026$, transaction-sum — matches geo_zips.json) for the choropleth maps
expected_zip = {z: {'jack': int(round(JD.get(z, 0))), 'jim': int(round(MD.get(z, 0)))}
                for z in sorted(set(JD) | set(MD))}

# ---- --check: confirm the dashboard still matches this derivation; write nothing ----
if '--check' in sys.argv:
    jsx = open('Kingston_Dashboard.jsx').read()
    fails = []
    def want(label, substr):
        if substr in jsx:
            print(f"  OK    {label}")
        else:
            fails.append(label)
            print(f"  DRIFT {label}\n          derivation expects: {substr[:84]}")
    want('LEGACY.jack profile', 'jack: ' + jprof(J))
    want('LEGACY.jim profile', 'jim:  ' + jprof(M))
    want('LEGACY.zips (top GA ZIPs)', 'zips: ' + jzips())
    want('LEGACY.overlap headline', ov_header)
    for r in ov_rows:
        want('overlap donor ' + r.split("',")[0][2:], r)
    try:
        actual_zip = json.load(open('legacy_zip_dollars.json'))
    except (FileNotFoundError, ValueError):
        actual_zip = None
    if actual_zip == expected_zip:
        print('  OK    legacy_zip_dollars.json (choropleth map data)')
    else:
        fails.append('legacy_zip_dollars.json')
        print('  DRIFT legacy_zip_dollars.json — re-run `python3 derive_legacy_data.py` to regenerate it')
    if fails:
        print(f"\nFAIL: {len(fails)} legacy item(s) drifted from the source data.")
        print("Fix: re-run `python3 derive_legacy_data.py`, then paste the printed LEGACY block into")
        print("     Kingston_Dashboard.jsx (the map JSON is rewritten automatically).")
        sys.exit(1)
    print(f"\nPASS: all {4 + len(ov_rows) + 1} legacy constants + map data match the derivation.")
    sys.exit(0)

# ---- default mode: regenerate the map data, print the comparison + paste-ready block ----
json.dump(expected_zip, open('legacy_zip_dollars.json', 'w'), separators=(',', ':'))

# verify Jim's per-ZIP now matches the Geography tab (geo_zips.json) — the alignment goal
try:
    _g = json.load(open('geo_zips.json'))
    _gk = {f['properties']['zip']: round(f['properties'].get('K', 0) or 0) for f in _g['features']}
    _mm = [z for z, v in _gk.items() if v > 0 and abs(v - round(MD.get(z, 0))) > 1]
    print(f"Jim per-ZIP vs geo_zips: {sum(1 for v in _gk.values() if v>0)} in-district ZIPs, {len(_mm)} mismatched {_mm[:5]}")
except Exception as _e:
    print("geo_zips alignment check skipped:", _e)

def show(label, p):
    print(f"\n{label}: {p['donors']} donors, ${p['total']:,.0f} itemized (2026$)")
    print(f"  geography: inDist {p['geoPct']['inDist']}%  metroAtl {p['geoPct']['metroAtl']}%  restGA {p['geoPct']['restGA']}%  outState {p['geoPct']['outState']}%")
    print(f"  income tiers %: " + " ".join(f"{k} {p['tiers'][k]}" for k in ('High', 'UpperMid', 'Middle', 'Low', 'Out')))
    print(f"  weighted-avg donor ZIP income: ${p['wAvg']:,} (coverage {p['wAvgCov']}%)")
    print(f"  wealthy GA ZIPs: ${p['wealthyGA']:,.0f} ({p['wealthyPct']}% of haul)")
    print(f"  top occupations: " + ", ".join(f"{o.title()} {n}" for o, n in p['occ']))

print("=" * 72)
print("KINGSTON vs KINGSTON — legacy comparison (all itemized individual, 2026 dollars)")
print("=" * 72)
show("JACK 2004-2012", J)
show("JIM 2026 (pre-primary)", M)
print(f"\nSHARED DONOR CORE: {ov_n} of {M['donors']} Jim donors ({ov_n/M['donors']*100:.1f}%) gave to Jack; "
      f"${ov_d:,.0f} of ${M['total']:,.0f} ({ov_d/M['total']*100:.1f}%). "
      f"Conservative floor (last+first match; Jack pre-2004 & deceased donors not captured).")

print("\n\n// ====== LEGACY (regenerated by derive_legacy_data.py) ======")
print("const LEGACY = {")
print("  jack: " + jprof(J) + ",")
print("  jim:  " + jprof(M) + ",")
print("  zips: " + jzips() + ",")
print("  overlap: { " + ov_header + ", donors: [")
for r in ov_rows:
    print("    " + r + ",")
print("  ] },\n};")
