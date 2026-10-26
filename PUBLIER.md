# Publier une nouvelle version de l'extension

Les extensions installées vérifient une fois par jour `telechargement/derniere.json`.
Si la version annoncée est plus récente que la leur, l'icône affiche « MAJ » et propose le téléchargement.

1. Déposer dans `telechargement/` :
   - le zip de la version, nommé `mon-cap-collecte-X.Y.Z.zip` (il reste disponible tel quel) ;
   - une copie du même zip, nommée `mon-cap-collecte.zip` (le bouton de la page d'installation, en secours).
2. Modifier `telechargement/derniere.json` : `version`, `date`, `telechargement` (adresse du zip versionné)
   et une ligne de `nouveautes`, affichée aux parents dans la fenêtre de l'icône.
3. Commit. Les extensions verront la nouvelle version dans les 24 heures.

Le numéro de `derniere.json` doit être exactement celui du `manifest.json` de l'extension du zip.

## Pages du site
- `./` : l'app des téléphones (index.html, sw.js…)
- `installer/` : la page d'installation à envoyer aux parents
- `confidentialite/` : ce que Mon Cap lit, où c'est gardé, qui y a accès
- Le service worker de l'app ne touche pas à ces pages ni à `telechargement/`.
