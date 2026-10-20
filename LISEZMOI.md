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

## Relier l'app au stockage partagé (une fois par téléphone)
Le lien d'installation se crée dans les Réglages de l'extension (« Lien d'installation pour les téléphones »).
Il contient la clé TÉLÉPHONE : ne l'envoyez qu'à vous-même et à votre enfant.

- **Android (Chrome)** : ouvrir le lien, puis ⋮ → « Installer l'application ». C'est tout.
- **iPhone (Safari)** : ouvrir l'adresse de l'app (sans le lien), Partager → « Sur l'écran d'accueil ».
  Ouvrir l'app depuis l'écran d'accueil, puis coller le lien dans « Relier au stockage partagé ».
  (Sur iPhone, l'app installée a son propre stockage, séparé de Safari.)

Ensuite, l'app récupère seule les nouvelles données à chaque ouverture, et partage les coches entre
les téléphones. « Importer un fichier » reste possible en secours.

## Mettre à jour le code
Remplacer `index.html` dans le dépôt. Changer aussi la ligne `const VERSION = 'mon-cap-1'` de
`sw.js` (par exemple `mon-cap-3`) pour que les téléphones prennent la nouvelle version.
Les données et les coches ne sont pas touchées.
