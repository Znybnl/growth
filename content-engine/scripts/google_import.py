"""Import local Google Ads / Search Console exports; no network or inferred figures."""
import argparse, csv, io, json, re, unicodedata
from pathlib import Path
import sys
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")

def norm(value):
    value=unicodedata.normalize('NFKD',value.lstrip('\ufeff')).casefold()
    return re.sub(r'[^a-z0-9]+',' ',''.join(c for c in value if not unicodedata.combining(c))).strip()

def number(value):
    raw=str(value).strip().replace('\u202f',' ').replace('\xa0',' ')
    if not raw or raw in ('-','--','—'): return None
    cleaned=re.sub(r'\s','',raw).replace('%','')
    multiplier=1
    if cleaned[-1:].lower() in ('k','m'):
        multiplier=1000 if cleaned[-1:].lower()=='k' else 1000000
        cleaned=cleaned[:-1]
    if ',' in cleaned and '.' in cleaned:
        if cleaned.rfind(',')>cleaned.rfind('.'): cleaned=cleaned.replace('.','').replace(',','.')
        else: cleaned=cleaned.replace(',','')
    elif ',' in cleaned:
        parts=cleaned.split(','); cleaned=''.join(parts) if len(parts)>2 or (len(parts[-1])==3 and len(parts[0])<=3 and multiplier==1) else '.'.join(parts)
    elif cleaned.count('.')>1: cleaned=cleaned.replace('.','')
    try: return float(cleaned)*multiplier
    except ValueError: return None

def volume(raw):
    if not raw or raw.strip() in ('-','—','--'): return {'raw':raw,'min':None,'max':None,'exact':None}
    pieces=re.split(r'\s*(?:–|—|\s+-\s+|(?<=\d)-(?=\d))\s*',raw.strip())
    if len(pieces)==2:
        a,b=map(number,pieces)
        return {'raw':raw,'min':a,'max':b,'exact':None}
    n=number(raw); return {'raw':raw,'min':n,'max':n,'exact':n}

def read_table(path,kind):
    data=Path(path).read_bytes()
    try: text=data.decode('utf-16') if data.startswith((b'\xff\xfe',b'\xfe\xff')) else data.decode('utf-8-sig')
    except UnicodeError as e: raise ValueError('Encodage non pris en charge (UTF-8 ou UTF-16)') from e
    lines=text.splitlines()
    aliases=('keyword','mot cle','top queries','requetes les plus frequentes','query','requete','top pages','pages les plus visitees','pages les plus populaires','page','pages')
    for idx,line in enumerate(lines):
        for delimiter in ('\t',';',','):
            fields=next(csv.reader([line],delimiter=delimiter))
            if len(fields)>1 and any(norm(x) in aliases for x in fields):
                return list(csv.DictReader(io.StringIO('\n'.join(lines[idx:])),delimiter=delimiter))
    raise ValueError('En-tête Google non reconnu : vérifier le type et le séparateur')

def first(row,*names):
    lookup={norm(k):v for k,v in row.items() if k is not None}
    return next((lookup[norm(k)] for k in names if norm(k) in lookup),'')

def parse(path,kind,metadata):
    rows=read_table(path,kind); output=[]
    for r in rows:
        if kind=='ads':
            kw=first(r,'Keyword','Mot clé','Mot-clé')
            if not kw: continue
            avg=first(r,'Avg. monthly searches','Average monthly searches','Moy. des recherches mensuelles','Nombre moyen de recherches mensuelles','Recherches mensuelles moyennes')
            monthly={k:v for k,v in r.items() if k and (norm(k).startswith('searches ') or norm(k).startswith('recherches ') or norm(k).startswith('monthly searches '))}
            output.append({'keyword':kw,'average_monthly':volume(avg),'monthly':{k:volume(v) for k,v in monthly.items()},'advertiser_competition':first(r,'Competition','Concurrence'),'bid_low':{'raw':first(r,'Top of page bid (low range)','Enchère de haut de page (fourchette basse)')},'bid_high':{'raw':first(r,'Top of page bid (high range)','Enchère de haut de page (fourchette haute)')},'raw_columns':r})
        else:
            query=first(r,'Top queries','Query','Queries','Requête','Requêtes','Requêtes les plus fréquentes'); page=first(r,'Top pages','Page','Pages','Pages les plus visitées','Pages les plus populaires')
            if not query and not page: continue
            output.append({'query':query or None,'page':page or None,'clicks':number(first(r,'Clicks','Clics')),'impressions':number(first(r,'Impressions')),'ctr_percent':number(first(r,'CTR')),'position':number(first(r,'Position','Average position','Position moyenne')),'raw_columns':r})
    if not output: raise ValueError('Aucune ligne exploitable ; export non reconnu')
    return {'kind':kind,'metadata':metadata,'rows':output}

def main():
    p=argparse.ArgumentParser(description='Normalise un export local ; les filtres sont saisis explicitement.')
    p.add_argument('kind',choices=['ads','gsc']);p.add_argument('file');p.add_argument('--country',required=True);p.add_argument('--language',required=True);p.add_argument('--period',required=True);p.add_argument('--export-date',required=True);p.add_argument('--filters',default='non précisés');p.add_argument('--output',required=True)
    a=p.parse_args();meta={'country':a.country,'language':a.language,'period':a.period,'export_date':a.export_date,'filters':a.filters}
    try:
        result=parse(a.file,a.kind,meta);Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f"{len(result['rows'])} lignes importées dans {a.output}")
    except (ValueError,OSError) as e: p.error(str(e))
if __name__=='__main__':main()
