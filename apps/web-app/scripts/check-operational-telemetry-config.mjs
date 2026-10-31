import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
try{
 if(process.env.POSTHOG_OTEL_LOGS_ENABLED!=='true')throw Error('Export OTLP non active dans la configuration fournie');
 if(!process.env.POSTHOG_OTEL_LOGS_TOKEN)throw Error('Token serveur OTLP absent');
 if((process.env.POSTHOG_OTEL_LOGS_HOST||'https://eu.i.posthog.com')!=='https://eu.i.posthog.com')throw Error('La cible doit etre PostHog EU');
 if(process.env.POSTHOG_PROJECT_ID!=='212872'||!process.env.POSTHOG_PERSONAL_API_KEY)throw Error('Verification privee requise : POSTHOG_PROJECT_ID=212872 et cle personnelle locale, jamais NEXT_PUBLIC');
 const response=await fetch('https://eu.posthog.com/api/projects/212872/',{headers:{Authorization:'Bearer '+process.env.POSTHOG_PERSONAL_API_KEY},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Verification projet HTTP '+response.status);
 const project=await response.json();
 if(project.id!==212872||project.api_token!==process.env.POSTHOG_OTEL_LOGS_TOKEN)throw Error('Le token ne correspond pas au token canonique du projet 212872');
 console.log(JSON.stringify({projectId:212872,region:'EU',canonicalTokenVerified:true,exportConfigured:true,retentionVerified:false,note:'Verifier reception et retention Logs dans la cible. Aucun secret affiche, aucun evenement envoye.'}));
}catch(error){console.error(error instanceof Error?error.message:'Configuration non verifiee');process.exitCode=1;}
