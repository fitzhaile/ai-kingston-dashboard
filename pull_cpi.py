#!/usr/bin/env python3
"""Pull CPI-U (BLS series CUUR0000SA0, NSA all-items) annual averages so Jack's
2003-2012 dollars can be expressed in current dollars. Source: U.S. BLS."""
import json, urllib.request
from collections import defaultdict

def bls(start, end):
    body = json.dumps({"seriesid": ["CUUR0000SA0"], "startyear": str(start), "endyear": str(end)}).encode()
    req = urllib.request.Request("https://api.bls.gov/publicAPI/v1/timeseries/data/",
                                 data=body, headers={'Content-Type': 'application/json',
                                                     'User-Agent': 'kingston/1.0'})
    return json.load(urllib.request.urlopen(req, timeout=120))

def annual(d):
    by = defaultdict(list)
    for s in d['Results']['series']:
        for row in s['data']:
            if row['period'].startswith('M') and row['period'] != 'M13':
                try: by[int(row['year'])].append(float(row['value']))
                except ValueError: pass
    return {y: sum(v) / len(v) for y, v in by.items()}, {y: len(v) for y, v in by.items()}

cpi, months = {}, {}
for a, b in [(2003, 2012), (2023, 2026)]:
    av, mo = annual(bls(a, b))
    cpi.update(av); months.update(mo)

print("CPI-U annual averages (NSA, BLS CUUR0000SA0):")
for y in sorted(cpi):
    print(f"  {y}: {cpi[y]:.3f}  ({months[y]} months)")

# base = most recent FULL year (12 months)
base_year = max(y for y in cpi if months[y] == 12)
print(f"\nBase (latest complete year): {base_year} = {cpi[base_year]:.3f}")
print("Inflation factor to base $ (multiply nominal by this):")
for y in [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012]:
    if y in cpi:
        print(f"  {y}: x{cpi[base_year] / cpi[y]:.4f}")
