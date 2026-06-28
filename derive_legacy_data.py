#!/usr/bin/env python3
"""
Derive the Jack-vs-Jim Kingston comparison constants for the "Legacy" tab.

Both donor bases are profiled with the SAME method (all itemized individual
contributions): geography (in-district / Atlanta-metro / out-of-state), income
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
import csv
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
        region = 'outState' if st != 'GA' else ('atlanta' if z[:2] == '30' else 'inDist')
        geo[region] += net
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
        'geo': {k: geo[k] for k in ('inDist', 'atlanta', 'outState')},
        'geoPct': {k: round(geo[k] / tot * 100, 1) for k in ('inDist', 'atlanta', 'outState')},
        'tiers': {k: round(tierd[k] / classif * 100, 1) for k in ('High', 'UpperMid', 'Middle', 'Low', 'Out')},
        'wAvg': int(round(wsum / wbase)), 'wAvgCov': round(wbase / tot * 100, 1),
        'wealthyGA': sum(zipd[z] for z in wzga), 'wealthyPct': round(sum(zipd[z] for z in wzga) / tot * 100, 1),
        'topWealthy': [(z, int(round(zipd[z])), HHI[z]) for z in sorted(wzga, key=lambda z: -zipd[z])[:8]],
        'topZips': [(z, int(round(zipd[z]))) for z in sorted(zipd, key=lambda z: -zipd[z])[:10]],
        'occ': [(o, len(d)) for o, d in sorted(occ.items(), key=lambda x: -len(x[1]))[:10]],
        'keys': {keyname(n) for n in dtot if keyname(n)}, 'dtot': dict(dtot),
    }

J = profile(load_jack()); M = profile(load_jim())
overlap = {n: v for n, v in M['dtot'].items() if keyname(n) in J['keys']}
ov_n, ov_d = len(overlap), sum(overlap.values())

def show(label, p):
    print(f"\n{label}: {p['donors']} donors, ${p['total']:,.0f} itemized (2026$)")
    print(f"  geography: inDist {p['geoPct']['inDist']}%  atlanta {p['geoPct']['atlanta']}%  outState {p['geoPct']['outState']}%")
    print(f"  income tiers %: " + " ".join(f"{k} {p['tiers'][k]}" for k in ('High', 'UpperMid', 'Middle', 'Low', 'Out')))
    print(f"  weighted-avg donor ZIP income: ${p['wAvg']:,} (coverage {p['wAvgCov']}%)")
    print(f"  wealthy GA ZIPs: ${p['wealthyGA']:,.0f} ({p['wealthyPct']}% of haul)")
    print(f"  top wealthy GA ZIPs: " + ", ".join(f"{z} ${d:,}(HHI${h//1000}k)" for z, d, h in p['topWealthy']))
    print(f"  top occupations: " + ", ".join(f"{o.title()} {n}" for o, n in p['occ']))

print("=" * 72)
print("KINGSTON vs KINGSTON — legacy comparison (all itemized individual, 2026 dollars)")
print("=" * 72)
show("JACK 2004-2012", J)
show("JIM 2026 (pre-primary)", M)
print(f"\nSHARED DONOR CORE: {ov_n} of {M['donors']} Jim donors ({ov_n/M['donors']*100:.1f}%) gave to Jack; "
      f"${ov_d:,.0f} of ${M['total']:,.0f} ({ov_d/M['total']*100:.1f}%). "
      f"Conservative floor (last+first match; Jack pre-2004 & deceased donors not captured).")
