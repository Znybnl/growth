import importlib.util, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('google_import',Path(__file__).with_name('google_import.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImportTests(unittest.TestCase):
 def fixture(self,text,encoding='utf-8-sig'):
  f=tempfile.NamedTemporaryFile(delete=False,suffix='.csv');f.close();p=Path(f.name);p.write_bytes(text.encode(encoding));self.addCleanup(p.unlink);return p
 def test_ads_french_ranges_and_months(self):
  p=self.fixture('Rapport exporté\nMot clé;Moy. des recherches mensuelles;Concurrence;Recherches : janv. 2026\nroue;1 k – 10 k;Faible;1 200\n')
  row=m.parse(p,'ads',{})['rows'][0];self.assertEqual(row['average_monthly']['min'],1000);self.assertEqual(row['average_monthly']['max'],10000);self.assertIsNone(row['average_monthly']['exact']);self.assertEqual(row['monthly']['Recherches : janv. 2026']['exact'],1200)
 def test_ads_english_tab_utf16(self):
  p=self.fixture('Keyword\tAvg. monthly searches\tCompetition\nwheel\t1,000\tHigh\n','utf-16');r=m.parse(p,'ads',{})['rows'][0];self.assertEqual(r['average_monthly']['exact'],1000)
 def test_gsc_types(self):
  for hdr,row in [('Top queries,Clicks,Impressions,CTR,Position','wheel,4,100,4%,3.2'),('Pages;Clics;Impressions;CTR;Position','https://example.org/;4;100;4%;3,2'),('Query,Page,Clicks,Impressions,CTR,Position','wheel,https://example.org/,4,100,4%,3.2')]:
   p=self.fixture(hdr+'\n'+row+'\n');r=m.parse(p,'gsc',{})['rows'][0];self.assertEqual(r['clicks'],4);self.assertEqual(r['position'],3.2)
 def test_missing_data_and_bad_header(self):
  self.assertIsNone(m.volume('-')['exact']);p=self.fixture('foo,bar\na,b\n');self.assertRaises(ValueError,m.parse,p,'gsc',{})

class PrioritizationTests(unittest.TestCase):
 def test_missing_data_and_measured_data_are_distinct(self):
  import json, subprocess, sys
  script=Path(__file__).with_name('prioritize.py')
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);items=[{'id':'a','title':'A','intent':'x','decision':'enrichir','page':'/blog/a','keywords':['roue'],'commercial_relevance':'forte','product_fit':'direct','organic_competition':'non observée'}]
   (d/'items.json').write_text(json.dumps(items),encoding='utf-8')
   def run(*args): return json.loads(subprocess.check_output([sys.executable,str(script),'--opportunities',str(d/'items.json'),*args]))[0]
   first=run();self.assertEqual(first['google_ads'],'non fourni');self.assertEqual(first['search_console'],'non fourni')
   ads={'kind':'ads','metadata':{'period':'test'},'rows':[{'keyword':'roue','average_monthly':{'raw':'10-100','min':10,'max':100,'exact':None},'advertiser_competition':'High'}]}
   gsc={'kind':'gsc','metadata':{'period':'test'},'rows':[{'query':'roue','page':'https://www.okado.app/blog/a','clicks':2,'impressions':50,'ctr_percent':4,'position':3}]}
   (d/'ads.json').write_text(json.dumps(ads),encoding='utf-8');(d/'gsc.json').write_text(json.dumps(gsc),encoding='utf-8')
   measured=run('--ads',str(d/'ads.json'),'--gsc',str(d/'gsc.json'));self.assertEqual(measured['priority_basis'],first['priority_basis']+2);self.assertIsNone(measured['google_ads'][0]['volume']['exact']);self.assertEqual(measured['search_console'][0]['impressions'],50)
   gsc['rows'][0]['page']=None;(d/'gsc.json').write_text(json.dumps(gsc),encoding='utf-8')
   query_only=run('--ads',str(d/'ads.json'),'--gsc',str(d/'gsc.json'));self.assertEqual(query_only['priority_basis'],first['priority_basis']+1)

if __name__=='__main__':unittest.main()
