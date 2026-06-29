#!/usr/bin/env python3
"""Re-pull Jack Kingston's itemized individual Schedule A (committee C00261958),
2004-2012, using KEYSET pagination — the method OpenFEC requires for Schedule A.

The earlier pull used offset/page pagination and returned a corrupted, fall-skewed
subset (e.g. 900 rows all dated Oct-Dec for the 2006 cycle, vs FEC's 841 spread
across the cycle, 310 of them in 2005). This pages with last_indexes, dedupes by
sub_id, and reports pulled-vs-API count per cycle so we can see it's complete."""
import json, urllib.request, urllib.parse, time, csv

key = [l.split('=', 1)[1].strip().strip('"').strip("'")
       for l in open('.env') if l.startswith('DATA_GOV_API_KEY=')][0]
CID = 'C00261958'
OUT = 'jack_kingston_contributions_2004_2012.csv'

def get(url, tries=7):
    for t in range(tries):
        try:
            req = urllib.request.Request(url + f'&api_key={key}', headers={'User-Agent': 'kingston/1.0'})
            return json.load(urllib.request.urlopen(req, timeout=55))
        except Exception as ex:
            if t == tries - 1: raise
            time.sleep(5)

records = {}   # sub_id -> (cycle, record)
for cyc in [2004, 2006, 2008, 2010, 2012]:
    base = (f"https://api.open.fec.gov/v1/schedules/schedule_a/?committee_id={CID}"
            f"&two_year_transaction_period={cyc}&is_individual=true&per_page=100"
            f"&sort=contribution_receipt_date")
    url, page, got, total = base, 0, 0, None
    while True:
        d = get(url)
        res = d['results']
        total = d['pagination']['count']
        if not res:
            break
        for r in res:
            records[r.get('sub_id')] = (cyc, r)
            got += 1
        page += 1
        li = d['pagination'].get('last_indexes') or {}
        if len(res) < 100 or not li or page > 300:
            break
        url = base + '&' + urllib.parse.urlencode(li)
        print(f"  {cyc}: page {page}, {got}/{total}", flush=True)
    print(f"  {cyc}: DONE pulled {got}, API reports {total}", flush=True)

with open(OUT, 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['cycle', 'date', 'year', 'name', 'first', 'last', 'city', 'state', 'zip',
                'occupation', 'employer', 'amount', 'sub_id', 'transaction_id'])
    n = 0
    for sid, (cyc, r) in records.items():
        dt = (r.get('contribution_receipt_date') or '')[:10]
        w.writerow([cyc, dt, dt[:4], (r.get('contributor_name') or '').strip(),
                    r.get('contributor_first_name') or '', r.get('contributor_last_name') or '',
                    r.get('contributor_city') or '', r.get('contributor_state') or '',
                    (r.get('contributor_zip') or '')[:5], r.get('contributor_occupation') or '',
                    r.get('contributor_employer') or '', r.get('contribution_receipt_amount') or 0,
                    sid, r.get('transaction_id') or ''])
        n += 1
print(f"\nDONE: {n} unique records -> jack_txns_v2.csv")
