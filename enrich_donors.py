#!/usr/bin/env python3
"""
Enrich the congresscontributions.csv with:
  - gender (inferred from first name)
  - zip_median_hhi (from Census Bureau ACS 5-year estimates, B19013)
  - zip_income_tier (High/Upper-Mid/Middle/Low)

Writes donors_enriched.csv with one row per (candidate, contributor) NET total
plus the original row-level columns.
"""
import csv
import json
import time
import urllib.request
from collections import defaultdict, Counter

CSV_IN = "/Users/fhaile/Dropbox/Sites/FH Website/ai-dashboards/ai-kingston-dashboard/congresscontributions.csv"
CSV_OUT = "/Users/fhaile/Dropbox/Sites/FH Website/ai-dashboards/ai-kingston-dashboard/donors_enriched.csv"

CANDIDATE_BY_COMMITTEE = {
    'FRIENDS OF JIM KINGSTON': 'Kingston',
    'FRIENDS OF BRIAN MONTGOMERY': 'Montgomery',
    'PAT FARRELL FOR CONGRESS': 'Farrell',
}

# Compact name → gender lookup.  Covers common English first names found in a
# typical US political donor file.  Returns 'Unknown' when a name is absent
# from both sets, and 'Ambiguous' for coin-flip names.
MALE_NAMES = set("""
AARON ABE ADAM ADRIAN AL ALAN ALBERT ALEC ALEX ALEXANDER ALFRED ALLAN ALLEN
ALTON ALVIN ANDREW ANDY ANGELO ANTHONY ANTONIO ARCHIE ARNOLD ARTHUR AUGUSTUS
AUSTIN BEN BENJAMIN BERNARD BILL BILLY BLAKE BOB BOBBY BRAD BRADLEY BRADY
BRANDON BRENT BRETT BRIAN BROCK BRUCE BRYAN BRYCE BUD BUDDY BYRON CALVIN
CAMERON CARL CARLOS CARSON CARTER CECIL CHAD CHARLES CHARLIE CHASE CHESTER
CHIP CHRIS CHRISTIAN CHRISTOPHER CLARENCE CLARK CLAUDE CLAY CLAYTON CLIFF
CLIFFORD CLIFTON CLINT CLINTON CODY COLE COLIN CONNOR CONRAD COREY CORY CRAIG
CURT CURTIS DALE DAN DANIEL DANNY DARREL DARREN DAVE DAVID DEAN DEREK DEWEY
DICK DON DONALD DONOVAN DOUG DOUGLAS DREW DUANE DUKE DUSTIN DWAYNE DWIGHT EARL
ED EDDIE EDGAR EDMUND EDWARD EDWIN ELI ELLIOT ELLIS ERIC ERIK ERNEST ERNIE
EUGENE EVAN EVERETT FRANCIS FRANK FRANKLIN FRED FREDERICK GABRIEL GARRETT GARY
GENE GEOFFREY GEORGE GERALD GILBERT GLEN GLENN GORDON GRADY GRANT GRAHAM GREG
GREGORY GUY HAL HARLAN HAROLD HARRY HARVEY HENRY HERBERT HERMAN HOWARD HUGH
IAN IRA IRVING ISAAC IVAN JACK JACOB JAKE JAMES JARED JASON JAY JEFF JEFFERY
JEFFREY JEREMIAH JEREMY JEROME JERRY JESSE JIM JIMMY JOE JOEL JOHN JOHNNY
JON JONATHAN JORGE JOSE JOSEPH JOSHUA JUAN JUDD JULIAN JUSTIN KARL KEITH KELLY
KEN KENDALL KENNETH KENT KEVIN KIM KIRK KURT KYLE LAMAR LANCE LARRY LAWRENCE
LEE LELAND LEO LEONARD LEROY LESLIE LESTER LEVI LEWIS LINCOLN LIONEL LLOYD
LOGAN LOUIS LOUIE LUCAS LUIS LUKE LUTHER MAC MACK MALCOLM MANUEL MARC MARCO
MARCUS MARIO MARION MARK MARSHALL MARTIN MARVIN MASON MATT MATTHEW MAURICE
MAX MAXWELL MELVIN MICHAEL MICHEAL MIKE MILES MILO MILTON MITCH MITCHELL MOSES
MURRAY NATE NATHAN NATHANIEL NEAL NED NEIL NELSON NICHOLAS NICK NICKY NOAH
NOEL NORMAN OLIVER OSCAR OTIS OTTO OWEN PATRICK PAUL PERCY PERRY PETE PETER
PHILIP PHILLIP PORTER PRESTON QUENTIN QUINN RALPH RANDALL RANDY RAY RAYMOND
REED REGINALD RICHARD RICK RICKY ROB ROBERT ROBIN ROD ROGER ROLAND RON RONALD
RONNIE ROSCOE ROSS ROY RUDY RUSS RUSSELL RYAN SAM SAMUEL SAUL SCOTT SEAN
SERGIO SETH SHANE SHAWN SIDNEY SIMON SPENCER STAN STANLEY STEPHEN STEVE
STEVEN STEWART STUART SYLVESTER TAD TERENCE TERRENCE TERRY THEODORE THOMAS
TIMOTHY TITO TJ TOBY TOD TODD TOM TOMMY TONY TRACY TRAVIS TREY TROY TYLER
TYRONE VERNON VICTOR VINCENT VINNIE WADE WALLACE WALT WALTER WARREN WAYNE
WENDELL WESLEY WILEY WILFRED WILL WILLARD WILLIAM WILLIE WILMER WINSTON WOODROW
ZACH ZACHARY
BLAINE CALE CLYDE DENNIS DAVIS DELBERT HUNTER JOSH MILLS MORTON
NITIN QUINT REID WILSON JEREMY BARTHOLOMEW CLARKSON DANTE ELDON FORREST GRAYSON
HOLDEN JARROD KADE KENNY LANE LIONEL MARCUS MOE NELSON RAFAEL RANDOLPH RENE
RUSTY SAL TALBOT WOODY ZEKE BENJI CHIP CODY CORBIN DAKOTA DEL DESMOND DEVIN
DOMINIC EARNEST EDUARDO ELIJAH EMMETT ENRIQUE EZRA FELIPE FERNANDO GABE GRANGER
HANK HARDIN HARRIS HARRISON IVAN JABARI JACQUES JORDAN JULIO KENDRICK KENNETH
LANDON LARRY LOGAN LUCA LYNDON MAJOR MATEO MAXIM NIGEL ORVILLE OSWALDO PABLO
PHOENIX RAMIRO RAMON RAUL ROBB ROCCO RODNEY SALVADOR SAMMY SANFORD SCOTTIE
SEBASTIAN SETH SHELDON STERLING STU TANNER TAD TRENT TREVOR VAUGHN WAYLON
WINFIELD WINTHROP WYATT YANNI YANNIS YURI ZANE
""".split())

FEMALE_NAMES = set("""
ABBY ABIGAIL ADA ADELE ADRIANA AGNES AILEEN ALANA ALEXIS ALICE ALICIA ALLISON
ALYSSA AMANDA AMBER AMELIA AMY ANASTASIA ANDREA ANGELA ANGELICA ANITA ANNA
ANNE ANNETTE APRIL ARLENE ASHLEY AUDREY AVA BARBARA BECKY BELINDA BETH
BETHANY BETSY BETTY BEVERLY BIANCA BLANCHE BONNIE BRENDA BRIDGET BRITNEY
BRITTANY BROOKE CAITLIN CAMILLE CANDACE CANDY CARLA CARMEN CAROL CAROLE
CAROLINE CAROLYN CARRIE CASEY CASSANDRA CATHERINE CATHY CECILIA CELIA CHANDRA
CHARLENE CHARLOTTE CHELSEA CHERI CHERYL CHLOE CHRISTIE CHRISTINA CHRISTINE
CHRISTY CINDY CLAIRE CLAUDIA CLARA COLLEEN CONNIE CONSTANCE CORA CORINNE
COURTNEY CRYSTAL CYNTHIA DAISY DANA DANIELLE DARLENE DAWN DEANNA DEB DEBBIE
DEBORAH DEBRA DEIRDRE DELIA DELLA DENISE DIANA DIANE DIANNE DIXIE DOLORES
DONNA DORA DOREEN DORIS DOROTHY EDIE EDITH EILEEN ELAINE ELEANOR ELISABETH
ELIZABETH ELLA ELLEN ELSIE EMILY EMMA ERICA ERIKA ERIN ESTELLE ESTHER ETHEL
EVA EVELYN FAITH FAY FELICIA FIONA FLORA FLORENCE FRANCES FRANCINE FRANCESCA
FREDA GAIL GEORGIA GEORGIANA GERALDINE GERTRUDE GILDA GINA GINGER GINNY GLADYS
GLENDA GLORIA GRACE GRETA GRETCHEN GWEN HANNAH HARRIET HAYLEY HEATHER HEIDI
HELEN HELENA HILARY HILDA HOLLY HOPE IDA INA INGRID IRENE IRIS IRMA ISABEL
ISABELLA IVY JACKIE JACQUELINE JAMIE JANE JANET JANICE JASMINE JAYNE JEAN
JEANNE JEANETTE JEANNIE JENNA JENNIFER JENNY JESSICA JESSIE JILL JOAN JOANNA
JOANNE JODY JOY JOYCE JUANITA JUDITH JUDY JULIA JULIANNE JULIE JUNE JUSTINE
KAREN KARI KARINA KARYN KATE KATHARINE KATHERINE KATHI KATHIE KATHLEEN KATHRYN
KATHY KATIE KAY KAYE KAYLA KELLY KENDRA KERRI KERRY KIM KIMBERLY KIRA KRISTA
KRISTEN KRISTIE KRISTIN KRISTINA KRISTY LARA LAURA LAUREL LAUREN LAURIE LEAH
LEANNE LENA LESLIE LILA LILIAN LILLIAN LILLY LILY LINDA LISA LISE LIZA LOIS
LORI LORRAINE LORETTA LORILL LOUISE LUCILLE LUCY LUCIA LYDIA LYNN LYNNE MAE
MAGGIE MARCELLA MARCIA MARGARET MARGIE MARGO MARIA MARIAN MARIANNE MARIE
MARILYN MARION MARJORIE MARLENE MARSHA MARTHA MARY MAUREEN MAXINE MELANIE
MELINDA MELISSA MELODY MEREDITH MIA MICHELE MICHELLE MILDRED MINDY MIRANDA
MIRIAM MOLLY MONA MONICA MORGAN MURIEL MYRA MYRTLE NADINE NANCY NAOMI NATALIE
NELL NICOLE NIKKI NINA NOEL NOELLE NOLA NORA NORMA OLGA OLIVIA PAIGE PAM
PAMELA PATRICIA PATSY PATTI PATTY PAULA PAULETTE PAULINE PEARL PEGGY PENNY
PHOEBE PHYLLIS POLLY PRISCILLA RACHEL RAE RAMONA RANDI REBECCA REGINA RENEE
RHODA RHONDA RITA ROBERTA ROBYN ROCHELLE ROSA ROSALIND ROSANNA ROSE ROSEMARY
ROSLYN RUBY RUTH SABRINA SALLIE SALLY SAMANTHA SANDRA SARA SARAH SHANNON
SHARON SHEILA SHELBY SHEILA SHERI SHERRY SHIRLEY SIMONE SONIA SOPHIA STACEY
STACY STELLA STEPHANIE SUE SUSAN SUZANNE SYLVIA TABITHA TAMMY TANYA TARA
TASHA TERESA TERI TERRI TERRY TEXIE THELMA THERESA TIFFANY TINA TONI TRACEY
TRACY TRICIA TRINA TRISH TWILA VALERIE VANESSA VERA VERONICA VICKI VICKY
VICTORIA VIOLA VIOLET VIRGINIA VIVIAN WANDA WENDY WHITNEY WILLA WILMA WINIFRED
YOLANDA YVONNE ZOE
MARCY LINDSAY MADDIE JACQUELYNN HALEY ADELINE ALESSANDRA ALEXA ALEXIA ALIYAH
ARIANA ARIEL ASHLEIGH AUTUMN AVERY BAILEY BRIANNA BROOKLYN CAITLYN CALLIE
CARLY CASSIE CATALINA CHARITY CHERRY CHLOE CLARISSA CRISTINA DELANEY DESTINY
DIXIE EDIE ELISE ELLIE EMERSON ESMERALDA EVELINE GABBY GENA GENEVIEVE GIA
GIANNA GIULIANA GRACIE HARLEY HALLE HAZEL IRIS IVANKA IVY IZZY JACQUELYN
JANINE JERI JILLIAN JODIE JOLIE JORDYN JOSEPHINE JOSIE JUDI JULES KADIE
KAITLIN KAITLYN KALEY KARINA KATRINA KAYDEN KELSEY KENNEDY KENDAL KHLOE KIRSTEN
KRISTINE LAYLA LEANN LILAH LILAH LORENA LUPITA LYLA MACY MADELINE MADDY
MALLORY MARIANA MATILDA MEG MEGAN MCKENNA MICHAELA MICKEY MINA MIRANDA MIREILLE
MISSY MOLLY NAOMI NELLIE NICOLA OLYMPIA PAIGE PALOMA PENELOPE PETRA PHILLIPA
QUINCY RAELYN REBA REESE REGAN REYNA RHIANNON ROCHELLE ROSARIO ROWAN SAMARA
SANDI SASHA SAVANNAH SELENA SIERRA SILVIA STACIE SUKI SUSIE SUZY SYDNEY TALIA
TAMARA TATIANA TAYLAH TESSA THEA TIANA TINA TOSHA VALENCIA VIOLETTA WILLOW
ZOLA ZOLTANA
""".split())

AMBIGUOUS = set("""
ALEX ASHLEY AUBREY BLAIR CAMERON CASEY CHRIS DAKOTA DANA DREW JAMIE JESSIE
JORDAN JULES KELLY KENDALL KERRY KIM LEE LESLIE LOGAN LYNN MADISON MARION
MORGAN PAT PAYTON PEYTON QUINN REESE RILEY ROBIN SAGE SAM SHANNON SHAWN SHEA
SIDNEY SKYLAR STACEY TAYLOR TERRY TRACY
""".split())

def classify_gender(first_name):
    if not first_name:
        return 'Unknown'
    fn = first_name.strip().upper()
    if not fn:
        return 'Unknown'
    # First token only (handles "MARY ANNE" → "MARY")
    fn = fn.split()[0]
    # Skip single-letter / initial forms
    if fn.endswith('.') or len(fn) == 1:
        return 'Unknown'
    if fn in AMBIGUOUS:
        return 'Ambiguous'
    if fn in MALE_NAMES:
        return 'Male'
    if fn in FEMALE_NAMES:
        return 'Female'
    return 'Unknown'


def fetch_hhi(zips):
    """Pull median household income (ACS 2023 5-year, B19013_001E) per ZCTA."""
    base = 'https://api.census.gov/data/2023/acs/acs5'
    hhi = {}
    total = len(zips)
    for i, z in enumerate(sorted(zips), 1):
        url = f'{base}?get=B19013_001E&for=zip%20code%20tabulation%20area:{z}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'campaign-dashboard/1.0'})
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
                if len(data) > 1 and data[1]:
                    raw = data[1][0]
                    # -666666666 is the ACS null sentinel
                    hhi[z] = int(raw) if raw and raw != '-666666666' else None
                else:
                    hhi[z] = None
        except Exception as e:
            hhi[z] = None
        if i % 25 == 0:
            print(f"  HHI fetched: {i}/{total}")
        time.sleep(0.05)
    return hhi


def tier(income):
    if income is None:
        return 'Unknown'
    if income >= 125000:
        return 'High ($125K+)'
    if income >= 75000:
        return 'Upper-Mid ($75-124K)'
    if income >= 50000:
        return 'Middle ($50-74K)'
    return 'Low (<$50K)'


def main():
    # Pass 1: collect per-donor NET totals + metadata
    donors = {}  # (candidate, contributor_name) -> dict
    zips = set()

    with open(CSV_IN) as f:
        rdr = csv.DictReader(f)
        for row in rdr:
            cand = CANDIDATE_BY_COMMITTEE.get(row['committee_name'])
            if not cand:
                continue
            try:
                amt = float(row['contribution_receipt_amount'])
            except Exception:
                continue
            name = row['contributor_name'].strip()
            if not name:
                continue
            key = (cand, name)
            d = donors.setdefault(key, {
                'candidate': cand,
                'contributor_name': name,
                'first_name': row['contributor_first_name'].strip(),
                'last_name': row['contributor_last_name'].strip(),
                'city': row['contributor_city'].strip(),
                'state': row['contributor_state'].strip(),
                'zip': row['contributor_zip'][:5],
                'occupation': row['contributor_occupation'].strip(),
                'employer': row['contributor_employer'].strip(),
                'net_amount': 0.0,
                'contributions': 0,
            })
            d['net_amount'] += amt
            d['contributions'] += 1
            if d['zip']:
                zips.add(d['zip'])

    print(f"Unique donor rows: {len(donors)}")
    print(f"Unique ZIPs: {len(zips)}")

    # Pass 2: HHI from Census
    print("Fetching HHI from Census ACS...")
    hhi = fetch_hhi(zips)
    have = sum(1 for v in hhi.values() if v is not None)
    print(f"  Got HHI for {have}/{len(zips)} ZIPs")

    # Pass 3: enrich + write
    with open(CSV_OUT, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow([
            'candidate', 'contributor_name', 'first_name', 'last_name',
            'gender', 'city', 'state', 'zip', 'zip_median_hhi',
            'zip_income_tier', 'occupation', 'employer',
            'net_amount', 'contributions',
        ])
        for (cand, name), d in sorted(donors.items(), key=lambda x: (-x[1]['net_amount'])):
            gender = classify_gender(d['first_name'])
            z_hhi = hhi.get(d['zip'])
            w.writerow([
                d['candidate'], d['contributor_name'], d['first_name'], d['last_name'],
                gender, d['city'], d['state'], d['zip'],
                z_hhi if z_hhi is not None else '',
                tier(z_hhi),
                d['occupation'], d['employer'],
                f"{d['net_amount']:.2f}", d['contributions'],
            ])
    print(f"Wrote {CSV_OUT}")

    # Summary stats
    print("\n=== GENDER BREAKDOWN (per candidate, net-positive donors) ===")
    for cand in ['Kingston', 'Montgomery', 'Farrell']:
        gender_count = Counter()
        gender_dollars = Counter()
        for (c, n), d in donors.items():
            if c != cand or d['net_amount'] <= 0:
                continue
            g = classify_gender(d['first_name'])
            gender_count[g] += 1
            gender_dollars[g] += d['net_amount']
        total = sum(gender_count.values())
        total_d = sum(gender_dollars.values())
        print(f"\n{cand}:")
        for g in ['Male', 'Female', 'Ambiguous', 'Unknown']:
            c_count = gender_count[g]
            c_dollars = gender_dollars[g]
            pct = c_count/total*100 if total else 0
            pct_d = c_dollars/total_d*100 if total_d else 0
            print(f"  {g:12}  donors: {c_count:>3} ({pct:>5.1f}%)  dollars: ${int(c_dollars):>10,} ({pct_d:>5.1f}%)")

    print("\n=== INCOME TIER BREAKDOWN (% of candidate's $) ===")
    for cand in ['Kingston', 'Montgomery', 'Farrell']:
        tier_d = Counter()
        for (c, n), d in donors.items():
            if c != cand or d['net_amount'] <= 0:
                continue
            z = d['zip']
            # Classify: In-state GA → tier by HHI; Out-of-state → "Out-of-area"
            if d['state'] and d['state'] != 'GA':
                tier_d['Out-of-area'] += d['net_amount']
            else:
                tier_d[tier(hhi.get(z))] += d['net_amount']
        total = sum(tier_d.values())
        print(f"\n{cand} (total ${int(total):,}):")
        for t in ['High ($125K+)','Upper-Mid ($75-124K)','Middle ($50-74K)','Low (<$50K)','Unknown','Out-of-area']:
            pct = tier_d[t]/total*100 if total else 0
            print(f"  {t:22}  ${int(tier_d[t]):>9,}  {pct:>5.1f}%")


if __name__ == '__main__':
    main()
