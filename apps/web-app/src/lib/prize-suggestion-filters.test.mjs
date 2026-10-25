import assert from "node:assert/strict";
import test from "node:test";
import { BEAUTY_SUBSECTOR_OPTIONS, GENERAL_BEAUTY_SUBSECTOR } from "./merchant-options.ts";
import { beautySuggestionFilterOptions, canFilterBeautySuggestions, filterPrizeSuggestionsBySubsector, UNCLASSIFIED_SUGGESTIONS } from "./prize-suggestion-filters.ts";

const catalog=Object.freeze([
  ...BEAUTY_SUBSECTOR_OPTIONS.map((sub,index) => Object.freeze({id:String(index),label:"Lot homonyme",industry:"Beauté",industrySubsector:sub,description:`Condition${index}`,probability:5,estimatedUnitCost:index})),
  Object.freeze({id:"unclassified",industry:"Beauté",label:"Personnalisé",probability:3,description:"Condition spécifique",estimatedUnitCost:12}),
  Object.freeze({id:"spa-alias",industry:"Beauté",industrySubsector:"Massage & spa",label:"Autre Spa",probability:7,estimatedUnitCost:8}),
]);

test("seul un profil explicitement Beauté généraliste peut filtrer l’union",() => {
  assert.equal(canFilterBeautySuggestions({industry:" Beauté ",industrySubsector:` ${GENERAL_BEAUTY_SUBSECTOR} `}),true);
  for(const sub of [...BEAUTY_SUBSECTOR_OPTIONS.slice(1),"","Institut & soins","Ongles & cils"]) assert.equal(canFilterBeautySuggestions({industry:"Beauté",industrySubsector:sub}),false);
  assert.equal(canFilterBeautySuggestions({industry:"Retail",industrySubsector:GENERAL_BEAUTY_SUBSECTOR}),false);
  assert.equal(canFilterBeautySuggestions(),false);
});

test("tous conserve la même union, les homonymes et l’ordre ; chaque sous-secteur est exact",() => {
  assert.equal(filterPrizeSuggestionsBySubsector(catalog,""),catalog);
  for(const sub of BEAUTY_SUBSECTOR_OPTIONS) {
    const result=filterPrizeSuggestionsBySubsector(catalog,sub);
    assert.deepEqual(result,catalog.filter(s => (s.industrySubsector ?? "").replace("Massage & spa","Massage & Spa") === sub));
    assert.ok(result.every(s => catalog.includes(s)));
  }
  assert.deepEqual(filterPrizeSuggestionsBySubsector(catalog,"Catégorie inconnue"),[]);
});

test("non classé reste accessible séparément et les alias Spa partagent le compteur",() => {
  assert.deepEqual(filterPrizeSuggestionsBySubsector(catalog,UNCLASSIFIED_SUGGESTIONS),[catalog[6]]);
  const options=beautySuggestionFilterOptions(catalog);
  assert.equal(options[0].count,catalog.length);
  assert.equal(options.find(o => o.value === "Massage & Spa").count,2);
  assert.equal(options.find(o => o.value === UNCLASSIFIED_SUGGESTIONS).count,1);
  assert.deepEqual(options.slice(1,7).map(o=>o.value),[...BEAUTY_SUBSECTOR_OPTIONS]);
  assert.equal(beautySuggestionFilterOptions([]).some(o=>o.value === UNCLASSIFIED_SUGGESTIONS),false);
  assert.equal(beautySuggestionFilterOptions([],UNCLASSIFIED_SUGGESTIONS).find(o=>o.value === UNCLASSIFIED_SUGGESTIONS).count,0);
});

test("catégorie vide et ajout futur : comptes calculés depuis les données, sans mutation",() => {
  assert.ok(beautySuggestionFilterOptions([]).every(o=>o.count === 0));
  const before=structuredClone(catalog);
  const expanded=[...catalog,{...catalog[1],id:"new-live-prize"}];
  assert.equal(beautySuggestionFilterOptions(expanded).find(o=>o.value === "Coiffure").count,2);
  assert.equal(filterPrizeSuggestionsBySubsector(expanded,"Coiffure").at(-1),expanded.at(-1));
  assert.deepEqual(catalog,before);
});
