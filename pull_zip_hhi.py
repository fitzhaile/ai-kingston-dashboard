#!/usr/bin/env python3
"""Pull the complete ZCTA median-household-income table (Census ACS 2019-2023
5-year, B19013) so Jack's (and Jim's) ZIPs all have income data. Same vintage the
dashboard already cites."""
import json, urllib.request, csv, time

def get(url, tries=4):
    for t in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'kingston/1.0'}), timeout=180))
        except Exception as ex:
            if t == tries - 1: raise
            time.sleep(4)

ckey = None
for line in open('.env'):
    if line.startswith('CENSUS_API_KEY='):
        ckey = line.split('=', 1)[1].strip().strip('"').strip("'"); break
url = f"https://api.census.gov/data/2023/acs/acs5?get=B19013_001E&for=zip%20code%20tabulation%20area:*&key={ckey}"
data = get(url)
hdr = data[0]
hhi = {}
for row in data[1:]:
    rec = dict(zip(hdr, row))
    z = rec['zip code tabulation area']
    v = rec['B19013_001E']
    try:
        iv = int(v)
        if iv > 0: hhi[z] = iv   # negatives are Census null sentinels
    except: pass

OUT = 'zip_hhi_full.csv'
with open(OUT, 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['zip', 'hhi'])
    for z, v in sorted(hhi.items()): w.writerow([z, v])
print(f"pulled {len(hhi)} ZCTAs with median HHI -> zip_hhi.csv")
print("verify vs dashboard's values:",
      "  31411:", hhi.get('31411'), "(dash 122723)",
      "| 31406:", hhi.get('31406'), "(dash 66084)",
      "| 30327:", hhi.get('30327'), "(dash 182317)")
