#!/usr/bin/env python3
"""
Generate geo_zips.json — real ZCTA boundaries for the GA-1 donor ZIPs, joined to
per-candidate dollars, ACS median income, and ZCTA centroid, PLUS the GA-1
district outline. Powers the Geography choropleth + bubble maps.

ZIP boundaries: Census TIGER 2010 ZCTAs (OpenDataDE State-zip-code-GeoJSON).
District boundary: Census TIGERweb, 119th Congressional Districts (GEOID 1301) —
the CURRENT GA-1 (the 2023 Georgia remap, in effect for the 2024 & 2026 elections).

In-district rule: a ZIP is kept only if its ZCTA centroid (Census internal point)
falls inside the real GA-1 polygon (point-in-polygon, even-odd). A boundary-
straddling ZIP is assigned to whichever side its center lands on.

Per-candidate dollars use the same scope/dedup as derive_dashboard_data.py
(entity_type == IND, dedup by transaction_id), so ZIPs shared with TOP_ZIPS match
the --check-guarded values exactly.

Run:  python3 derive_geo_data.py
Out:  geo_zips.json  ({type, features:[ZIPs], district:<GA-1 outline>}; coords 4 dp)
"""
import csv, json, os, urllib.request, urllib.parse
from collections import defaultdict, Counter

SRC = "congresscontributions_through_march2026.csv"
CN = {'K': 'FRIENDS OF JIM KINGSTON', 'M': 'FRIENDS OF BRIAN MONTGOMERY', 'F': 'PAT FARRELL FOR CONGRESS'}
ZCTA_URL = "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ga_georgia_zip_codes_geo.min.json"
ZCTA_CACHE = "/tmp/ga_zcta.geojson"
GA1_URL = ("https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?"
           + urllib.parse.urlencode({'where': "GEOID='1301'", 'outFields': 'BASENAME,CDSESSN,GEOID',
                                     'returnGeometry': 'true', 'outSR': '4326', 'f': 'geojson'}))
GA1_CACHE = "/tmp/ga1_119.geojson"
OUT = "geo_zips.json"
EPS = 0.0012  # Douglas-Peucker tolerance in degrees (~130 m; invisible at dashboard scale)

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

zsum = {'K': defaultdict(float), 'M': defaultdict(float), 'F': defaultdict(float)}
zstate = {}; zcity = defaultdict(Counter)
for t in ['K', 'M', 'F']:
    for r in dedup([x for x in rows if x['committee_name'] == CN[t]]):
        z = r['contributor_zip'][:5]
        zsum[t][z] += amt(r); zstate[z] = r['contributor_state']
        if r['contributor_city'].strip(): zcity[z][r['contributor_city'].strip().title()] += 1
HHI = {}
for r in csv.DictReader(open('donors_enriched.csv')):
    if r['zip'] and r.get('zip_median_hhi'):
        try: HHI[r['zip']] = int(float(r['zip_median_hhi']))
        except: pass
for r in csv.DictReader(open('zip_hhi_supplement.csv')):
    try: HHI[r['zip']] = int(float(r['hhi']))
    except: pass

def fetch(url, cache, label):
    if not os.path.exists(cache):
        print(f"downloading {label} ...")
        req = urllib.request.Request(url, headers={'User-Agent': 'kingston-dashboard/1.0'})
        open(cache, 'wb').write(urllib.request.urlopen(req, timeout=180).read())
    return json.load(open(cache))

# --- real GA-1 boundary (current, 119th Congress) ---
ga1 = fetch(GA1_URL, GA1_CACHE, "GA-1 district boundary (TIGERweb 119th Congress)")['features'][0]
assert ga1['properties']['BASENAME'] == '1' and str(ga1['properties']['CDSESSN']) == '119', \
    f"unexpected district vintage: {ga1['properties']}"
GA1_GEOM = ga1['geometry']
print(f"GA-1 boundary: district {ga1['properties']['BASENAME']}, {ga1['properties']['CDSESSN']}th Congress (current)")

def _rings(geom):
    return geom['coordinates'] if geom['type'] == 'Polygon' else [r for poly in geom['coordinates'] for r in poly]
def in_district(lon, lat, geom):
    """Even-odd point-in-polygon across all rings (handles holes / multipolygon)."""
    inside = False
    for ring in _rings(geom):
        n = len(ring); j = n - 1
        for i in range(n):
            xi, yi = ring[i]; xj, yj = ring[j]
            if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
    return inside

# --- ZCTA boundaries ---
gj = fetch(ZCTA_URL, ZCTA_CACHE, "GA ZCTA GeoJSON (~32 MB, one-time)")
feats = {}
for f in gj['features']:
    p = f['properties']; z = p.get('ZCTA5CE10') or p.get('GEOID10')
    if z: feats[str(z)] = f

# --- geometry simplification ---
def dp(points):
    n = len(points)
    if n < 3: return points[:]
    keep = [False] * n; keep[0] = keep[-1] = True; stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop(); ax, ay = points[a]; bx, by = points[b]
        dx, dy = bx - ax, by - ay; denom = dx * dx + dy * dy; dmax = 0.0; idx = -1
        for i in range(a + 1, b):
            px, py = points[i]
            if denom == 0: d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                t = ((px - ax) * dx + (py - ay) * dy) / denom; t = 0 if t < 0 else 1 if t > 1 else t
                cx, cy = ax + t * dx, ay + t * dy; d = ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5
            if d > dmax: dmax = d; idx = i
        if idx != -1 and dmax > EPS:
            keep[idx] = True; stack.append((a, idx)); stack.append((idx, b))
    return [points[i] for i in range(n) if keep[i]]
def simp_ring(ring):
    out = []; last = None
    for x, y in dp(ring):
        pt = [round(x, 4), round(y, 4)]
        if pt != last: out.append(pt); last = pt
    if len(out) >= 4 and out[0] != out[-1]: out.append(out[0])
    return out
def _area(ring):
    a = 0.0
    for i in range(len(ring) - 1):
        a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return a / 2.0
def _wind(rings):
    # d3-geo winding (spherical, pre-RFC-7946): exterior ring CLOCKWISE (planar
    # area < 0), holes counterclockwise. A counterclockwise exterior is read as the
    # whole-globe complement, which collapses the projection. Census TIGER already
    # ships clockwise exteriors; this just guarantees it regardless of source.
    out = []
    for i, r in enumerate(rings):
        a = _area(r)
        if (i == 0 and a > 0) or (i > 0 and a < 0): r = r[::-1]
        out.append(r)
    return out

def simp_geom(g):
    t, c = g['type'], g['coordinates']
    if t == 'Polygon':
        rings = [r for r in (simp_ring(r) for r in c) if len(r) >= 4]
        return {'type': 'Polygon', 'coordinates': _wind(rings)} if rings else None
    if t == 'MultiPolygon':
        polys = []
        for poly in c:
            rings = [r for r in (simp_ring(r) for r in poly) if len(r) >= 4]
            if rings: polys.append(_wind(rings))
        return {'type': 'MultiPolygon', 'coordinates': polys} if polys else None
    return None

# --- keep GA donor ZIPs whose ZCTA centroid is inside GA-1 ---
def tot(z): return zsum['K'][z] + zsum['M'][z] + zsum['F'][z]
allz = [z for z in set(zsum['K']) | set(zsum['M']) | set(zsum['F']) if tot(z) > 0]
out_feats = []; out_of_district = 0; no_boundary = []
for z in sorted(allz, key=lambda z: -tot(z)):
    if zstate.get(z) != 'GA': out_of_district += 1; continue
    f = feats.get(z)
    if not f: no_boundary.append(z); continue
    p = f['properties']
    try: lat, lon = float(p['INTPTLAT10']), float(p['INTPTLON10'])
    except: no_boundary.append(z); continue
    if not in_district(lon, lat, GA1_GEOM): out_of_district += 1; continue
    geom = simp_geom(f['geometry'])
    if not geom: no_boundary.append(z); continue
    out_feats.append({'type': 'Feature', 'geometry': geom, 'properties': {
        'zip': z, 'city': (zcity[z].most_common(1)[0][0] if zcity[z] else ''),
        'K': int(round(zsum['K'][z])), 'M': int(round(zsum['M'][z])), 'F': int(round(zsum['F'][z])),
        'hhi': HHI.get(z), 'lat': lat, 'lon': lon}})

district_out = simp_geom(GA1_GEOM)
json.dump({'type': 'FeatureCollection', 'features': out_feats, 'district': district_out},
          open(OUT, 'w'), separators=(',', ':'))
in_dollars = sum(f['properties']['K'] + f['properties']['M'] + f['properties']['F'] for f in out_feats)
print(f"wrote {OUT}: {len(out_feats)} in-district ZIPs, {os.path.getsize(OUT)/1000:.0f} KB "
      f"(${in_dollars:,.0f} in-district itemized)")
print(f"excluded: {out_of_district} out-of-district ZIPs (Atlanta, out-of-state, etc.); "
      f"{len(no_boundary)} GA ZIPs with no ZCTA boundary (PO-box/point)")
