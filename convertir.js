/* Mon Cap — convertit une collecte brute de l'extension vers les données de l'app.
   Utilisable dans le navigateur (app) et dans l'extension. Aucune donnée personnelle ici :
   le lien prof → matière vient du profil. */
/* Emoji d'une activité d'après son nom (et le texte qui l'annonce). L'ordre compte :
   « tennis de table » avant « tennis », « football américain » avant « football ». 🏅 par défaut. */
const EMOJIS_ACTIVITE=[
  [/basket/,'🏀'],[/football am[ée]ricain|flag.?football/,'🏈'],[/soccer|football|futsal/,'⚽'],[/hockey/,'🏒'],
  [/volley/,'🏐'],[/badminton/,'🏸'],[/tennis de table|ping.?pong/,'🏓'],[/tennis/,'🎾'],[/natation|nage|piscine|aquati/,'🏊'],
  [/athl[ée]tisme|cross|course [aà] pied|\bcourse\b|marathon|\brun/,'🏃'],[/planche [aà] neige|snowboard/,'🏂'],[/\bski\b|ski alpin|ski de fond/,'⛷️'],
  [/patin/,'⛸️'],[/gymnasti|trampoline/,'🤸'],[/escalade|grimpe/,'🧗'],[/judo|karat[ée]|taekwondo|arts? martia|jiu/,'🥋'],[/boxe/,'🥊'],
  [/v[ée]lo|cyclisme|vtt/,'🚴'],[/baseball|softball/,'⚾'],[/rugby/,'🏉'],[/golf/,'⛳'],[/ultimate|frisbee/,'🥏'],[/cheer/,'📣'],
  [/danse/,'💃'],[/chorale|\bchant\b|vocal/,'🎤'],[/musique|harmonie|orchestre|band|guitare|piano|violon/,'🎵'],
  [/th[ée][aâ]tre|impro/,'🎭'],[/[ée]checs/,'♟️'],[/robot/,'🤖'],[/science|g[ée]nie/,'🔬'],[/arts? plastique|dessin|peinture|\bart\b/,'🎨'],
  [/d[ée]bat|[ée]loquence/,'🗣️'],[/jeux? vid[ée]o|e.?sport/,'🎮'],[/plein air|camping/,'🏕️'],[/lecture|livre|biblioth/,'📚']];
function emojiActivite(...textes){
  const t=textes.join(' ').toLowerCase().normalize('NFC');
  for(const [re,e] of EMOJIS_ACTIVITE) if(re.test(t)) return e;
  return '🏅';
}

/* Profil construit à partir de la collecte : profs et locaux (Horaire), récups (consignes Classroom),
   activités hebdomadaires (CapNet). Aucune saisie à la main. */
function construireProfil(col){
  const coba=col.coba||{}, cr=col.classroom||{}, hor=coba.horaire||{}, P={type:'mon-cap-profil',version:2,profs:{},activites:[],cycle:null};
  const C3=c=>(c||'').slice(0,3).toUpperCase();
  // noms complets connus par le Suivi : « Tremblay Roy, Marie »
  const complets=[...new Set(((coba.suivi||{}).entrees||[]).map(e=>e.enseignant).filter(Boolean))];
  const nomComplet=abr=>{
    const [nom,ini]=abr.split(',').map(x=>(x||'').trim());
    const racine=(nom||'').split(/[-\s]/)[0].toLowerCase();
    const t=complets.find(c=>c.split(',')[0].toLowerCase().startsWith(racine)&&(!ini||(c.split(',')[1]||'').trim().toLowerCase().startsWith(ini.replace(/\./g,'').slice(0,1).toLowerCase())));
    if(t){const [n,p]=t.split(',').map(x=>x.trim());return p?p+' '+n:n;}
    return ini?ini+' '+nom:nom;   // forme abrégée de l'Horaire, telle quelle
  };
  const parCours={};
  for(const k of hor.cases||[]){const c=C3(k.cours);(parCours[c]=parCours[c]||{profs:{},locaux:{}});
    parCours[c].profs[k.prof]=(parCours[c].profs[k.prof]||0)+1; parCours[c].locaux[k.local]=(parCours[c].locaux[k.local]||0)+1;}
  const parFreq=o=>Object.keys(o).sort((a,b)=>o[b]-o[a]);
  for(const [c,v] of Object.entries(parCours)) P.profs[c]={p:nomComplet(parFreq(v.profs)[0]),loc:parFreq(v.locaux).join(' ou ')};
  // récups annoncées dans une consigne Classroom : on garde la phrase exacte du prof
  const CRC=nom=>{const n=(nom||'').toLowerCase();if(/math/.test(n))return'MAT';if(/fran/.test(n))return'FRA';if(/english|angl/.test(n))return'ANG';
    if(/hist/.test(n))return'HIS';if(/g[ée]o/.test(n))return'GEO';if(/scien/.test(n))return'SCT';
    if(/arts?\s*plastique/.test(n))return'ART';if(/ate|cr[ée]atic/.test(n))return'ATE';return null;};
  for(const p of cr.publications||[]) for(const e of p.elements||[]){
    const code=CRC(p.cours); if(!code||!P.profs[code]||P.profs[code].rec)continue;
    const phrase=(e.detail||'').split(/\n|(?<=[.!?])\s+/).find(x=>/r[ée]cup[ée]ration/i.test(x)&&/\d{1,2}\s*h\s*\d{2}/.test(x));
    if(phrase){P.profs[code].rec=phrase.trim().replace(/[`´]+$/,'');P.profs[code].src='C';}
  }
  // Activités : CapNet donne l'inscription et la période ; l'horaire vient d'un courriel
  // (« Jours : Mardi et jeudi, de 15 h à 16 h 30 », « Lieu : … »). On les associe par un mot-clé commun.
  const JOURS={dimanche:0,lundi:1,mardi:2,mercredi:3,jeudi:4,vendredi:5,samedi:6};
  const auj=(col.collecte_le||'').slice(0,10);
  const sansAc=x=>(x||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const motsCles=t=>sansAc(t).split(/[^a-z0-9]+/).filter(w=>w.length>=5&&!['groupe','activite','activites','saison','reservistes'].includes(w));
  const horaires=[];
  for(const m of coba.courriels||[]){
    const tx=m.texte||''; const lj=tx.match(/Jours?\s*:\s*([^\n]+)/i); if(!lj)continue;
    const jours=Object.entries(JOURS).filter(([n])=>new RegExp(n,'i').test(lj[1])).map(([,v])=>v); if(!jours.length)continue;
    const hh=lj[1].match(/de\s+(\d{1,2})\s*h\s*(\d{2})?\s*à\s*(\d{1,2})\s*h\s*(\d{2})?/i)||[];
    const lieu=(tx.match(/Lieu\s*:\s*([^\n]+)/i)||[])[1];
    horaires.push({objet:m.objet||'',texte:tx,jours,hh,lieu:lieu&&lieu.trim(),de:m.expediteur||''});
  }
  const inscrites=(Array.isArray(coba.activites)?coba.activites:[]).filter(a=>(!a.statut||/inscrit/i.test(a.statut))&&(!a.fin||a.fin>=auj));
  for(const h of horaires){
    const mh=new Set([...motsCles(h.objet),...motsCles(h.texte.slice(0,300))]);
    // « basketball » ↔ « Lions Basketball » ; « basket » seul est trop court pour un mot-clé, on teste aussi la racine
    const act=inscrites.find(a=>motsCles(a.titre).some(w=>mh.has(w)||[...mh].some(x=>x.startsWith(w.slice(0,6))||w.startsWith(x.slice(0,6)))));
    const titre=act?(act.titre.split(' - ')[0].trim()):(h.objet||'Activité');
    const d=h.hh;
    P.activites.push({id:'act-'+sansAc(titre).replace(/[^a-z0-9]+/g,'-').slice(0,30),titre,code:'SPO',emoji:emojiActivite(titre,h.objet),jours:h.jours,
      heure:d[1]?(+d[1])+'h'+(d[2]||'00'):'',debut:act?act.debut:null,jusqu_au:act?act.fin:null,
      note:(d[1]?'De '+(+d[1])+'h'+(d[2]||'00')+' à '+(+d[3])+'h'+(d[4]||'00'):'')+(h.lieu?', '+h.lieu:'')+'. Horaire annoncé par courriel'+(h.de?' ('+h.de+')':'')+'.'});
  }
  if(hor.foyer)P.groupe=hor.foyer;
  return P;
}

function convertirCollecte(col, profilExterne){
const coba=col.coba||{}, cr=col.classroom||{};
const profil=construireProfil(col);
// compléter avec un profil importé à la main (ancien format), sans écraser ce qui vient de la collecte
if(profilExterne){for(const [c,v] of Object.entries(profilExterne.profs||{}))if(!profil.profs[c])profil.profs[c]=v;
  if(!profil.activites.length&&profilExterne.activites)profil.activites=profilExterne.activites;
  if(profilExterne.cycle)profil.cycle=profilExterne.cycle;}
// nom de famille du prof -> code de matière, tiré du profil (ex. « Tremblay » -> SCT)
const PROF2CODE={};
for(const [code,p] of Object.entries((profil&&profil.profs)||{})){const n=(p.p||'').trim().split(/\s+/).pop(); if(n&&!PROF2CODE[n])PROF2CODE[n]=code;}

// --- Code de cours à 3 lettres (MAT, FRA…) à partir du code Coba (ex. MAT201) ou du cours Classroom ---
const CODE3=c=>(c||'').slice(0,3).toUpperCase();
const COURS_CONNUS={MAT:1,FRA:1,ANG:1,HIS:1,GEO:1,SCT:1,ART:1,ATE:1,CCQ:1,DRA:1,EDU:1};
// Classroom : "Mathématique(201)" -> MAT, "ATE groupe A" -> ATE, "English" -> ANG, "Géographie" -> GEO
const CR2CODE=nom=>{const n=(nom||'').toLowerCase();
  if(/math/.test(n))return'MAT'; if(/fran/.test(n))return'FRA'; if(/english|angl/.test(n))return'ANG';
  if(/hist/.test(n))return'HIS'; if(/g[ée]o/.test(n))return'GEO'; if(/scien|sct/.test(n))return'SCT';
  if(/arts?\s*plastique/.test(n))return'ART';
  if(/ate|cr[ée]atic|tinker|impression|fablab/.test(n))return'ATE'; if(/cit|ccq/.test(n))return'CCQ';
  if(/dram|th[ée][aâ]/.test(n))return'DRA'; if(/[ée]duc|sport|endurance/.test(n))return'EDU'; return null;};

// --- Normaliser une heure "08:05" -> "8h05" ---
const hh=t=>{const m=(t||'').match(/(\d{1,2}):(\d{2})/);return m?(+m[1])+'h'+m[2]:'';};

// --- AGENDA daté : { "AAAA-MM-JJ": { cycle:5, periodes:[{h:"8h05",code:"MAT"},…] } } ---
// Horaire régulier : cours à 8h05, 9h30, 12h15, 13h40, dîner 10h55–12h10.
// Sport-études : trois cours le matin (le 3e à 10h55), dîner à 12h10. On ne bascule que si
// l'agenda a des cours à 10h55 et aucun à 12h15. Un agenda régulier, même avec une heure
// isolée à 10h55, garde les heures actuelles.
const heuresAgenda=new Set();
for(const j of coba.agenda||[]) for(const c of j.cours||[]) if(c.groupe&&c.heure) heuresAgenda.add(c.heure);
const SPORT=heuresAgenda.has('10:55')&&!heuresAgenda.has('12:15');
const DEBUTS=SPORT?['08:05','09:30','10:55']:['08:05','09:30','12:15','13:40','15:05'];
const DINER=SPORT?['12:10','13:10']:['10:55','12:10'];
const AGENDA={};
for(const j of coba.agenda||[]){
  // seules les heures de début de période sont des cours ; « 23:59 » est une heure limite de remise
  const per=(j.cours||[]).filter(c=>DEBUTS.includes(c.heure)).map(c=>({s:c.heure,code:CODE3(c.cours)})).sort((a,b)=>a.s.localeCompare(b.s));
  AGENDA[j.date]={cycle:j.jour_cycle||null,periodes:per};
}
// Jours de semaine sans aucun cours dans l'agenda (congés, journées pédagogiques), sur la période couverte
const CONGES={};
{ const dates=Object.keys(AGENDA).sort(); if(dates.length){ const d=new Date(dates[0]+'T12:00'), fin=new Date(dates[dates.length-1]+'T12:00');
  for(;d<=fin;d.setDate(d.getDate()+1)){ const w=d.getDay(), k=d.toISOString().slice(0,10);
    if(w>0&&w<6&&(!AGENDA[k]||!AGENDA[k].periodes.length)) CONGES[k]='Aucun cours à l’agenda'; } } }

// --- TRAVAUX / ÉVALUATIONS depuis Coba ---
const TYPE=(cat,trav)=>{const t=((cat||'')+' '+(trav||'')).toLowerCase();
  if(/examen|exam\b|test\b/.test(t))return'exam';
  if(/\bsae\b/.test(t))return'sae';
  if(/projet|recherche|bd\b|pr[ée]sentation/.test(t))return'projet';
  if(/dict[ée]e/.test(t))return'test';
  return'devoir';};
const slug=s=>(s||'').toLowerCase().normalize('NFKD').replace(/[^\w]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
const auj=col.collecte_le.slice(0,10);
const ITEMS=[];
for(const t of coba.travaux||[]){
  if(t.date_completee)continue;                  // déjà remis
  if((t.resultat_brut||'').trim())continue;       // déjà noté -> ira dans NOTES
  const code=CODE3(t.cours);
  if(!t.date_due)continue;
  const o={src:'P'};
  if(t.heure_due)o.time=hh(t.heure_due);
  if(t.description)o.note=t.description;
  ITEMS.push({id:slug(code+'-'+t.travail),d:t.date_due,c:code,t:t.travail,ty:TYPE(t.categorie,t.travail),...o});
}

// --- Heure affichée : la période de cours où l'agenda place le travail ; « 23h59 » n'est qu'une heure limite ---
const cleT=t=>(t||'').toLowerCase().replace(/\s+/g,'');
const PERIODE={};
for(const j of coba.agenda||[]) for(const c of j.cours||[]) for(const titre of c.travaux_lies||[]) PERIODE[j.date+'|'+cleT(titre)]=c.heure;
for(const it of ITEMS){
  const p=PERIODE[it.d+'|'+cleT(it.t)];
  if(p&&DEBUTS.includes(p)) it.time=hh(p);
  else if(it.time==='23h59') delete it.time;
}

// --- Travaux annoncés SEULEMENT dans l'agenda (pas encore dans Travaux) ---
const vus=new Set(ITEMS.map(i=>i.c+'|'+i.t.toLowerCase().replace(/\s+/g,'')));
for(const j of coba.agenda||[]) for(const c of j.cours||[]) for(const titre of c.travaux_lies||[]){
  const code=CODE3(c.cours), k=code+'|'+titre.toLowerCase().replace(/\s+/g,'');
  if(vus.has(k))continue; vus.add(k);
  ITEMS.push({id:slug('ag-'+code+'-'+titre),d:j.date,c:code,t:titre,ty:TYPE('',titre),src:'P',time:hh(c.heure),fromAgenda:1});
}

// --- NOTES (résultats) et compétences ---
const GRADES=[];
for(const t of coba.travaux||[]){
  const r=t.resultat; if(!r)continue;
  if(r.type==='points'||r.type==='pourcentage'){const p=r.pct; if(p==null)continue;
    GRADES.push({c:CODE3(t.cours),d:t.date_due||t.date_assignee,p:Math.round(p),l:t.travail+(r.type==='points'?` (${r.obtenu}/${r.sur})`:'')});}
  else if(r.type==='cote')   // A, B, C+… : gardée telle quelle, jamais convertie en pourcentage
    GRADES.push({c:CODE3(t.cours),d:t.date_due||t.date_assignee,p:null,cote:r.cote,l:t.travail});
}
// Notes provisoires de Coba, par compétence (seules celles qui ont une valeur)
const PROVISOIRES={};
for(const c of coba.competences||[]){
  const m=String(c.note_provisoire||'').match(/([\d.,]+)\s*%/); if(!m)continue;
  (PROVISOIRES[CODE3(c.cours)]=PROVISOIRES[CODE3(c.cours)]||[]).push({nom:c.nom,ponderation:c.ponderation,note:Math.round(parseFloat(m[1].replace(',','.')))});
}
// NOGRADE : travaux dont la date due est passée, sans résultat
const NOGRADE=[];
for(const t of coba.travaux||[]){
  if((t.resultat_brut||'').trim())continue;
  if(t.date_due&&t.date_due<auj&&!t.date_completee) NOGRADE.push([CODE3(t.cours),t.travail,t.date_due]);
}

// --- SUIVI ---
const sv=coba.suivi||{};
const somme=sv.sommaire_coba||{};
const pos=somme['Commentaire positif']||0;
const tips=Object.entries(somme).filter(([k])=>!/positif|aucun/i.test(k)).reduce((a,[,v])=>a+v,0);
const SUIVI={pos,tips,entrees:(sv.entrees||[]).map(e=>({d:(e.date_libelle||'').slice(0,10),c:null,type:e.type,comm:e.commentaire,detail:e.detail||'',prof:e.enseignant}))};

// --- CONSIGNES EN ÉTAPES depuis Classroom ---
// Rattachement à un travail Coba par un mot significatif commun, dans le même cours.
const sansAcc=x=>(x||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
const VIDES=new Set(['examen','etude','sections','section','etape','partie','travail','devoir','document','plan','questions','consignes','sujet']);
const mots=t=>new Set(sansAcc(t).split(/[^a-z0-9]+/).filter(w=>w.length>=5&&!VIDES.has(w)));
const CONSIGNES=[];
for(const p of cr.publications||[]) for(const e of p.elements||[]){
  if(!(e.etapes&&e.etapes.length))continue;
  const code=CR2CODE(p.cours), m=mots(e.titre);
  const corresp=(coba.travaux||[]).filter(t=>CODE3(t.cours)===code&&[...mots(t.travail)].some(w=>m.has(w)));
  const steps=e.etapes.map(x=>x.texte);
  if(corresp.length){
    const avenir=corresp.filter(t=>t.date_due&&t.date_due>=auj&&!(t.resultat_brut||'').trim());
    for(const t of avenir){const it=ITEMS.find(i=>i.c===code&&i.t===t.travail); if(it){it.steps=steps; it.src='PC'; it.stepsDe=e.titre;}}
    continue;   // rattachée : à venir -> dans la fiche ; passée -> écartée
  }
  if(e.nature_date==='echeance'&&e.date&&e.date<auj)continue;                       // échéance passée
  const age=e.date?Math.round((new Date(auj)-new Date(e.date))/864e5):0;
  if(e.nature_date!=='aucune_echeance'&&e.nature_date!=='echeance'&&age>21)continue;   // matériel ancien
  CONSIGNES.push({id:slug('cons-'+code+'-'+e.titre),d:e.date||auj,c:code||'EVT',t:e.titre,ty:'consigne',src:'C',steps,
    quand:e.nature_date==='echeance'?'Échéance : '+e.date:e.nature_date==='aucune_echeance'?'Aucune échéance':'Publié le '+e.date});
}

// --- RÉCUPS et faits depuis les courriels (IA) ---
const RECUPS=[];
for(const m of coba.courriels||[]) for(const f of ((m.extraction||{}).elements||[])){
  if(f.a_valider)continue;
  if(f.type==='recuperation'&&f.date){
    const code=CR2CODE(m.objet)||PROF2CODE[(m.expediteur||'').trim().split(/\s+/).pop()]||null;
    const h=(f.citation||'').match(/(\d{1,2})\s*h\s*(\d{2})/); const loc=(f.citation||'').match(/local\s+([A-Z]?\d+[A-Z]?)/i);
    RECUPS.push({id:slug('rec-'+f.date),d:f.date,ty:'recup',c:code||'EVT',t:'Récupération',time:h?(+h[1])+'h'+h[2]:'',note:(loc?'Local '+loc[1]+'. ':'')+'Annoncée par courriel par '+m.expediteur+'.',src:'P'});
  }
}
// --- ANNONCES CLASSROOM (résumés des tuteurs) ---
// 1. Calendriers datés, ligne par ligne, sans IA : « October 22nd: New Kid chap.9-10 », « 22 octobre : … ».
//    Les lignes de test/examen sont ignorées : les évaluations viennent de la page Travaux de Coba.
// 2. Récups et événements trouvés par l'IA, rattachés au cours de l'annonce.
const MOIS_EN2={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const MOIS_FR2={janv:1,févr:2,fevr:2,mars:3,avr:4,mai:5,juin:6,juil:7,août:8,aout:8,sept:9,oct:10,nov:11,déc:12,dec:12};
const ANNONCES=[];
const heureTexte=s=>{const m=(s||'').match(/\b(\d{1,2})(?:[:h](\d{2}))?\s*(am|pm)\b/i)||(s||'').match(/\b(\d{1,2})\s*[h:]\s*(\d{2})?/i);
  if(!m)return'';let h=+m[1];if(m[3]&&/pm/i.test(m[3])&&h<12)h+=12;return h+'h'+(m[2]||'00');};
// Le cours d'une annonce : celui de son AUTEUR quand c'est sans ambiguïté (un résumé mal découpé ne peut
// plus ranger le calendrier d'anglais sous Créatic). Un prof qui a deux cours garde le cours lu dans le résumé.
const normNom=x=>(x||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]+/g,' ').trim();
const coursDeLAuteur=auteur=>{const n=normNom(auteur);if(!n)return[];
  return Object.entries((profil&&profil.profs)||{}).filter(([c,p])=>{const q=normNom(p.p);return q&&(q===n||n.endsWith(' '+q.split(' ').pop())&&q.split(' ').length===1||n.includes(q));}).map(([c])=>c);};
const codeAnnonce=a=>{const lu=CR2CODE(a.cours),cand=coursDeLAuteur(a.auteur);
  if(lu&&cand.includes(lu))return lu; if(cand.length===1)return cand[0]; return lu||cand[0]||'EVT';};
for(const a of cr.annonces||[]){
  const code=codeAnnonce(a), pub=(a.publie_le||'').slice(0,10);
  const an=mo=>{let y=+pub.slice(0,4)||+auj.slice(0,4);if(pub&&mo<+pub.slice(5,7)-6)y++;return y;};
  const changeant=/might change|may change|peuvent changer|sujettes? à changement/i.test(a.texte||'');
  const quand=pub?' du '+pub:'';
  for(const l of (a.texte||'').split('\n')){
    let m,d=null,t=null;
    if((m=l.match(/^\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[:\-–]\s*(.+)$/i))){const mo=MOIS_EN2[m[1].toLowerCase()];d=an(mo)+'-'+String(mo).padStart(2,'0')+'-'+m[2].padStart(2,'0');t=m[3];}
    else if((m=l.match(/^\s*(\d{1,2})(?:er)?\s+(janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec)[a-zéû]*\.?\s*[:\-–]\s*(.+)$/i))){const mo=MOIS_FR2[m[2].toLowerCase()];d=an(mo)+'-'+String(mo).padStart(2,'0')+'-'+m[1].padStart(2,'0');t=m[3];}
    if(!d||!t)continue;
    t=t.trim(); if(/\b(test|examen|exam|quiz|évaluation)\b/i.test(t))continue;
    ANNONCES.push({id:slug('ann-'+code+'-'+d+'-'+t),d,c:code,t,ty:/r[ée]vision|review|class\b/i.test(t)?'event':'devoir',src:'C',fromAnnonce:1,
      note:'Annonce Classroom'+quand+(a.auteur?' ('+a.auteur+')':'')+'.'+(changeant?' Le prof précise que ces dates peuvent changer.':'')});
  }
  for(const f of ((a.extraction||{}).elements||[])){
    if(f.a_valider||!f.date)continue;
    if(f.type==='recuperation'){
      const locs=[...new Set(((f.citation||'').match(/\b[A-Z]\d{3}[A-Z]?\b/g)||[]))], loc=locs.length===1?[null,locs[0]]:null;   // plusieurs locaux cités : la phrase du prof fait foi
      RECUPS.push({id:slug('rec-'+code+'-'+f.date+'-'+heureTexte(f.heure_ou_periode||f.citation)),d:f.date,ty:'recup',c:code,t:'Récupération',time:heureTexte(f.heure_ou_periode||f.citation),
        note:(loc?'Local '+loc[1]+'. ':'')+'« '+(f.citation||'').trim()+' » — annonce Classroom'+(a.auteur?' de '+a.auteur:'')+'.',src:'C'});
    } else if(f.type==='evenement'){
      ANNONCES.push({id:slug('ann-ev-'+code+'-'+f.date+'-'+(f.titre||'')),d:f.date,c:code,t:f.titre||'Activité',ty:'event',src:'C',time:heureTexte(f.heure_ou_periode||f.citation),
        note:'Annonce Classroom'+(a.auteur?' ('+a.auteur+')':'')+'.',fromAnnonce:1});
    }
  }
}
// une même annonce lue dans plusieurs résumés : un seul exemplaire de chaque élément
{const vus=new Set();for(let i=ANNONCES.length-1;i>=0;i--){if(vus.has(ANNONCES[i].id))ANNONCES.splice(i,1);else vus.add(ANNONCES[i].id);}}
// une même récup annoncée plusieurs fois (rappel la veille, etc.) : une seule fois
{const vus=new Set();for(let i=RECUPS.length-1;i>=0;i--){const k=RECUPS[i].c+'|'+RECUPS[i].d+'|'+RECUPS[i].time;if(vus.has(k))RECUPS.splice(i,1);else vus.add(k);}}

// --- ÉVALUATIONS ANNONCÉES SUR CLASSROOM (texte des travaux et du matériel, annonces, faits de l'IA) ---
// Une phrase qui parle d'une évaluation ET donne une date en clair. Croisée avec Coba (même matière, à 3 jours près) :
// - déjà dans Coba : la fiche s'enrichit du texte du prof (« Sur Classroom ») ;
// - absente de Coba : l'évaluation est ajoutée, avec la mention « Annoncé sur Classroom ».
const RE_EVAL=/\b(test|examen|exam|quiz|[ée]valuation|dict[ée]e|contr[ôo]le|sae)\b/i;
const RE_DATE_FR=/\b(\d{1,2})(?:er)?\s+(janv|f[ée]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[ée]c)[a-zéû]*\.?/i;
const RE_DATE_EN=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
const MOIS_N={janv:1,fevr:2,févr:2,mars:3,avr:4,mai:5,juin:6,juil:7,aout:8,août:8,sept:9,oct:10,nov:11,dec:12,déc:12};
function datesEvaluation(texte,ref){
  const r=(ref||auj).slice(0,10),out=[];
  const an=mo=>{let y=+r.slice(0,4);if(mo<+r.slice(5,7)-6)y++;return y;};
  for(const ligne of (texte||'').split(/\n|(?<=[.!?])\s+/)){
    if(!RE_EVAL.test(ligne))continue;
    let m=ligne.match(RE_DATE_FR),d=null;
    if(m){const mo=MOIS_N[m[2].toLowerCase().replace('é','e').replace('û','u').slice(0,4)]||MOIS_N[m[2].toLowerCase().slice(0,4)]||MOIS_N[m[2].toLowerCase().slice(0,3)];if(mo)d=an(mo)+'-'+String(mo).padStart(2,'0')+'-'+m[1].padStart(2,'0');}
    else if((m=ligne.match(RE_DATE_EN))){const mo=MOIS_EN2[m[1].toLowerCase()];d=an(mo)+'-'+String(mo).padStart(2,'0')+'-'+m[2].padStart(2,'0');}
    if(d)out.push({d,ligne:ligne.trim(),mot:ligne.match(RE_EVAL)[1]});
  }
  return out;
}
const CANDIDATS=[];
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
// 1. texte des travaux et du matériel Classroom
for(const p of cr.publications||[]) for(const e of p.elements||[]){
  const code=CR2CODE(p.cours); if(!code)continue;
  for(const x of datesEvaluation((e.titre||'')+'\n'+(e.detail||''),e.date||auj))
    CANDIDATS.push({d:x.d,c:code,t:cap(x.mot.toLowerCase())+' ('+(e.titre||p.cours)+')',texte:(e.detail||x.ligne).trim(),source:'Classroom, '+(e.titre||p.cours)+(e.date_libelle?' ('+e.date_libelle.replace(/^Publié\s*:\s*/i,'publié ')+')':'')});
}
// 2. annonces des profs (y compris les lignes « Test » des calendriers)
for(const a of cr.annonces||[]){
  const code=codeAnnonce(a);
  for(const x of datesEvaluation(a.texte,a.publie_le)){
    const apres=(x.ligne.split(/[:\-–]\s*/).slice(1).join(' : ')||x.ligne).trim();
    CANDIDATS.push({d:x.d,c:code,t:apres.length<60?apres:cap(x.mot.toLowerCase()),texte:x.ligne,source:'Annonce Classroom'+(a.auteur?' de '+a.auteur:'')});
  }
  for(const f of ((a.extraction||{}).elements||[])) if(f.type==='examen'&&f.date&&!f.a_valider)
    CANDIDATS.push({d:f.date,c:code,t:f.titre||'Évaluation',texte:(f.citation||'').trim(),source:'Annonce Classroom'+(a.auteur?' de '+a.auteur:'')});
}
// 3. examens trouvés par l'IA dans les courriels de l'école
for(const m of coba.courriels||[]){
  if(m.suivi||m.ia_ignore)continue;
  for(const f of ((m.extraction||{}).elements||[])) if(f.type==='examen'&&f.date&&!f.a_valider){
    const code=CR2CODE(m.objet)||PROF2CODE[(m.expediteur||'').trim().split(/\s+/).pop()]; if(!code)continue;
    CANDIDATS.push({d:f.date,c:code,t:f.titre||'Évaluation',texte:(f.citation||'').trim(),source:'Courriel'+(m.expediteur?' de '+m.expediteur:'')});
  }
}
const EVALS_CLASSROOM=[];
{const ecart=(a,b)=>Math.abs((Date.parse(a+'T12:00')-Date.parse(b+'T12:00'))/864e5);
 const evalsCoba=ITEMS.filter(i=>/^(exam|sae|test)$/.test(i.ty));
 for(const k of CANDIDATS){
   const cible=evalsCoba.find(i=>i.c===k.c&&ecart(i.d,k.d)<=3)||EVALS_CLASSROOM.find(i=>i.c===k.c&&i.d===k.d);
   const comp={source:k.source,texte:k.texte};
   if(cible){cible.complements=cible.complements||[];if(!cible.complements.some(c=>c.texte===comp.texte))cible.complements.push(comp);continue;}
   const ty=/dict[ée]e/i.test(k.t)?'test':'exam';
   EVALS_CLASSROOM.push({id:slug('cl-ev-'+k.c+'-'+k.d),d:k.d,c:k.c,t:k.t,ty,src:'C',fromClassroom:1,complements:[comp]});
 }}

// --- ÉVÉNEMENTS annoncés par courriel (match, atelier, activité) : datés et validés seulement.
// Les examens et travaux restent ceux de la page Travaux de Coba, qui fait foi.
const EVENEMENTS=[], vusEv=new Set();
const motsAct=(profil.activites||[]).map(a=>({a,mots:(a.titre||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>=5)}));
for(const m of coba.courriels||[]){
  if(m.suivi||m.ia_ignore)continue;
  for(const f of ((m.extraction||{}).elements||[])){
    if(f.a_valider||f.type!=='evenement'||!f.date)continue;
    const cle=f.date+'|'+(f.titre||'').toLowerCase().replace(/\s+/g,''); if(vusEv.has(cle))continue; vusEv.add(cle);
    // activité de l'élève concernée ? (ex. un match de basket) -> son code et son emoji
    const zone=((m.objet||'')+' '+(m.texte||'').slice(0,600)).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
    const act=motsAct.find(x=>x.mots.some(w=>zone.includes(w)||zone.includes(w.slice(0,6))));
    const code=act?'SPO':(CR2CODE(m.objet)||PROF2CODE[(m.expediteur||'').trim().split(/\s+/).pop()]||'EVT');
    const h=(f.heure_ou_periode||f.citation||'').match(/\b(\d{1,2})\s*[h:]\s*(\d{2})?/i);   // « 15h00 », « 10:00 Am », « 10h »
    const o={src:'P',note:(f.details?f.details+' ':'')+'Annoncé par courriel'+(m.expediteur?' ('+m.expediteur+')':'')+'.',fromCourriel:1};
    if(h)o.time=(+h[1])+'h'+(h[2]||'00');
    if(act){o.emoji=act.a.emoji;o.nomCourt=act.a.titre;}
    // titre court ou générique (« Atelier 1 ») : préfixé par l'objet du courriel (« Club photo : Atelier 1 »)
    let t=(f.titre||'').trim(); const obj=(m.objet||'').replace(/^(re|tr|fwd?)\s*:\s*/gi,'').trim();
    const generique=/^(atelier|s[ée]ance|rencontre|cours|partie|session|activit[ée]|[ée]v[ée]nement|groupe|bloc)\s*\d*$/i.test(t);
    if(!t)t=obj||'Événement'; else if(obj&&generique&&!obj.toLowerCase().includes(t.toLowerCase()))t=obj+' : '+t;
    EVENEMENTS.push({id:slug('crl-'+f.date+'-'+t),d:f.date,c:code,t,ty:'event',...o});
  }
}

return {
  type:'mon-cap-donnees',version:1,
  genere_le:col.collecte_le,
  diner:DINER,
  agenda:AGENDA,
  conges:CONGES,
  items:ITEMS.concat(ANNONCES,EVALS_CLASSROOM),
  grades:GRADES,
  provisoires:PROVISOIRES,
  nograde:NOGRADE,
  suivi:SUIVI,
  consignes:CONSIGNES,
  recups:RECUPS,
  evenements:EVENEMENTS,
  profil
};
}
if(typeof module!=='undefined')module.exports={convertirCollecte,construireProfil,emojiActivite};
