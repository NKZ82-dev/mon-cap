# Mon Cap — application (PWA)

Application d'organisation scolaire, installable sur iPhone et Android.
**Ce dépôt ne contient que le code.** Aucune donnée d'élève n'y figure : les données sont importées
sur chaque téléphone et y restent.

## Mettre en ligne (GitHub Pages)
1. Sur GitHub, créer un dépôt (par exemple `mon-cap`). Un nom neutre est préférable.
2. Y déposer tous les fichiers de ce dossier (glisser-déposer dans « Add file → Upload files »),
   en gardant le dossier `icons`.
3. Settings → Pages → « Deploy from a branch » → branche `main`, dossier `/ (root)` → Save.
4. Après une minute, l'app est en ligne à `https://<votre-compte>.github.io/mon-cap/`.

## Installer sur le téléphone
- **Android (Chrome)** : ouvrir l'adresse, menu ⋮ → « Installer l'application ».
- **iPhone (Safari obligatoirement)** : ouvrir l'adresse, bouton Partager → « Sur l'écran d'accueil ».

## Charger les données (dans l'app installée)
Sur iPhone, l'app installée a son propre stockage, distinct de Safari : l'import doit se faire
**depuis l'app installée**, pas depuis Safari.
1. Toucher « Importer un fichier » et choisir le **fichier de collecte** téléchargé par l'extension
   (`collecte-AAAA-MM-JJ.json`). L'app le convertit elle-même ; les profs, locaux, récups et activités
   en font partie.
2. Pour mettre à jour : en bas de l'onglet Jour, « Mettre à jour », puis importer la nouvelle collecte.

Pour faire passer un fichier sur l'iPhone : AirDrop, l'app Fichiers ou iCloud Drive.
Sur Android : Google Drive ou un câble USB.

## Mettre à jour le code
Remplacer `index.html` dans le dépôt. Changer aussi la ligne `const VERSION = 'mon-cap-1'` de
`sw.js` (par exemple `mon-cap-3`) pour que les téléphones prennent la nouvelle version.
Les données et les coches ne sont pas touchées.
