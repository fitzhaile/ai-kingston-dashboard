#!/usr/bin/env python3
"""Pull Jack Kingston's per-transaction individual Schedule A (committee C00261958),
2004-2012, with occupation/employer/ZIP/date — the foundation for the comparison tab."""
import json, urllib.request, time, csv

key = None
for line in open('.env'):
    if line.startswith('DATA_GOV_API_KEY='):
        key = line.split('=', 1)[1].strip().strip('"').strip("'"); break

def get(url, tries=6):
    for t in range(tries):
        try:
            req = urllib.request.Request(url + f"&api_key={key}", headers={'User-Agent': 'kingston/1.0'})
            return json.load(urllib.request.urlopen(req, timeout=240))
        except Exception as ex:
            if t == tries - 1: raise
            time.sleep(5)

CID = 'C00261958'
OUT = 'jack_kingston_contributions_2004_2012.csv'
f = open(OUT, 'w', newline=''); w = csv.writer(f)
w.writerow(['cycle', 'date', 'year', 'name', 'first', 'last', 'city', 'state', 'zip',
            'occupation', 'employer', 'amount'])
n = 0
for cyc in [2004, 2006, 2008, 2010, 2012]:
    page = 1
    while True:
        d = get(f"https://api.open.fec.gov/v1/schedules/schedule_a/?committee_id={CID}"
                f"&two_year_transaction_period={cyc}&per_page=100&page={page}&is_individual=true")
        res = d['results']
        if not res: break
        for r in res:
            dt = (r.get('contribution_receipt_date') or '')[:10]
            yr = dt[:4]
            w.writerow([cyc, dt, yr, (r.get('contributor_name') or '').strip(),
                        r.get('contributor_first_name') or '', r.get('contributor_last_name') or '',
                        r.get('contributor_city') or '', r.get('contributor_state') or '',
                        (r.get('contributor_zip') or '')[:5], r.get('contributor_occupation') or '',
                        r.get('contributor_employer') or '', r.get('contribution_receipt_amount') or 0])
            n += 1
        pages = d['pagination'].get('pages', 1)
        print(f"  {cyc}: page {page}/{pages} ({n} total rows)", flush=True)
        if page >= pages: break
        page += 1
f.close()
print(f"\nDONE: {n} Jack transactions 2004-2012 -> jack_txns.csv")
