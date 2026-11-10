"""Classement explicable, sans inventer de chiffres ni convertir concurrence Ads en SEO."""
import argparse,json
from pathlib import Path
from urllib.parse import urlsplit
import sys
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")

def main():
 p=argparse.ArgumentParser();p.add_argument('--ads');p.add_argument('--gsc',action='append',default=[]);p.add_argument('--opportunities',default='content-engine/roadmap/opportunities.json');a=p.parse_args()
 items=json.loads(Path(a.opportunities).read_text(encoding='utf-8'))
 ads=json.loads(Path(a.ads).read_text(encoding='utf-8')) if a.ads else None
 gsc=[json.loads(Path(f).read_text(encoding='utf-8')) for f in a.gsc]
 if ads and ads.get('kind')!='ads':p.error('--ads doit être un import Ads')
 if any(g.get('kind')!='gsc' for g in gsc):p.error('--gsc doit être un import Search Console')
 result=[]
 for item in items:
  keywords={x.casefold().strip() for x in item['keywords']}
  matched_ads=[{'keyword':r['keyword'],'volume':r['average_monthly'],'advertiser_competition':r['advertiser_competition'],'metadata':ads['metadata']} for r in (ads or {}).get('rows',[]) if r['keyword'].casefold().strip() in keywords]
  matched_gsc=[{'query':r['query'],'page':r['page'],'clicks':r['clicks'],'impressions':r['impressions'],'ctr_percent':r['ctr_percent'],'position':r['position'],'metadata':g['metadata']} for g in gsc for r in g.get('rows',[]) if (r['query'] and r['query'].casefold().strip() in keywords) or (r['page'] and urlsplit(r['page']).path.rstrip('/') == item['page'])]
  # Qualitative triage, not a forecast. Missing metrics never become zero demand.
  tier=(2 if item['commercial_relevance']=='forte' else 1)+(1 if item['product_fit']=='direct' else 0)
  # One point for an actually measured Ads value and one for observed impressions on an existing page.
  tier += int(any(r['volume']['min'] is not None for r in matched_ads))
  tier += int(item['decision'] in ('enrichir','optimiser page commerciale') and any(r['page'] and urlsplit(r['page']).path.rstrip('/') == item['page'] and (r['impressions'] or 0)>0 for r in matched_gsc))
  tier += int(item.get('organic_competition') == 'faible et documentée' and bool(item.get('organic_evidence')))
  result.append({**item,'priority_basis':tier,'google_ads':matched_ads if ads else 'non fourni','search_console':matched_gsc if gsc else 'non fourni','limitations':'tri indicatif : 2 points pertinence forte sinon 1, +1 proximité produit directe, +1 donnée Ads présente, +1 impressions existantes pour enrichissement/page commerciale, +1 concurrence organique faible documentée ; aucune somme de volumes, aucune difficulté SEO déduite des annonces. Absence de correspondance ≠ volume nul ; qualité, intention et comparaison humaine restent déterminantes.'})
 result.sort(key=lambda x:(-x['priority_basis'],x['id']))
 print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
