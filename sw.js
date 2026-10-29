/* Mon Cap — service worker : l'app fonctionne hors connexion.
   Aucune donnée personnelle n'est ici : les données restent dans le stockage du téléphone. */
const VERSION = 'mon-cap-23';
const COQUILLE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Le reste du site (page d'installation, confidentialité, téléchargements de l'extension) n'est pas l'app :
  // toujours depuis le réseau, jamais remplacé par l'app ni gardé en cache
  const racine = new URL('./', location.href).pathname;
  const chemin = url.pathname.startsWith(racine) ? url.pathname.slice(racine.length) : null;
  if (url.origin === location.origin && chemin !== null && /^(installer|confidentialite|telechargement|aide|nouveautes)(\/|$|\.)/.test(chemin)) return;
  // La page de l'app : réseau d'abord (pour recevoir les mises à jour), cache si hors connexion
  if ((req.mode === 'navigate' && url.origin === location.origin) || url.pathname.endsWith('/index.html')) {
    // cache: 'no-cache' : toujours demander à GitHub si la page a changé (réponse légère si elle n'a pas changé),
    // au lieu de garder jusqu'à 10 minutes une version peut-être périmée
    e.respondWith(fetch(new URL('./index.html', location.href).href, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Polices et fichiers fixes : cache d'abord
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); }
      return r;
    })));
  }
});
