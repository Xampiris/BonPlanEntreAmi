# 🎉 Bon Plan Entre Amis

Application web légère permettant à un groupe d'amis de partager leurs compétences, savoir-faire et bons plans sous forme de petites annonces. Aucun backend requis : tout tourne côté client, avec [JSONBin.io](https://jsonbin.io) comme stockage et [imgbb](https://imgbb.com) pour l'upload d'images.

## Fonctionnalités

- Consultation, création, modification et suppression d'annonces (modification/suppression réservées à l'auteur)
- Recherche par mot-clé (titre, description, tags) et filtre par catégorie, combinables
- Tri (plus récentes / alphabétique), mode sombre, partage direct d'une annonce par lien
- Reconnaissance de l'auteur via un pseudo local (pas de compte, pas de mot de passe)
- Interface responsive : grille 3 colonnes (desktop), 2 colonnes (tablette), liste (mobile)

## Stack technique

HTML / CSS / JavaScript vanilla (modules ES, sans build), [Tailwind CSS](https://tailwindcss.com) via CDN. Hébergement statique sur GitHub Pages.

## Configuration

Toute la configuration se trouve dans [`assets/js/config.js`](assets/js/config.js) :

```js
export const CONFIG = {
  JSONBIN_BIN_ID: '...',
  JSONBIN_API_KEY: '...',
  IMGBB_API_KEY: '...',
};
```

### 1. JSONBin.io (stockage des annonces)

1. Crée un compte gratuit sur [jsonbin.io](https://jsonbin.io).
2. Crée un nouveau bin contenant `{"annonces": []}`.
3. Récupère le **Bin ID** et une **Access Key** (Secret Key) depuis ton compte.
4. Renseigne-les dans `JSONBIN_BIN_ID` et `JSONBIN_API_KEY`.

> ⚠️ **Important** : cette clé est intégrée côté client, comme prévu par le cahier des charges (usage privé, lien non public). Cela signifie que **toute personne ayant accès au code source du site (visible publiquement si le dépôt GitHub est public) peut voir cette clé** et l'utiliser pour lire/écrire dans ce bin précis. C'est un compromis assumé pour un groupe d'amis de confiance, mais évite de réutiliser cette clé pour un autre bin sensible. Si tu veux limiter les dégâts, crée une clé JSONBin restreinte à ce bin uniquement (option disponible dans les paramètres de compte JSONBin).

### 2. imgbb (upload d'images)

1. Crée un compte gratuit sur [api.imgbb.com](https://api.imgbb.com/).
2. Génère une clé API gratuite.
3. Renseigne-la dans `IMGBB_API_KEY`.

Sans cette clé, l'onglet "Uploader" du formulaire est désactivé mais l'onglet "Coller une URL" reste utilisable (ex. lien imgur).

### Mode démo sans configuration

Tant que `JSONBIN_BIN_ID` / `JSONBIN_API_KEY` ne sont pas renseignés, l'application stocke automatiquement les annonces dans le `localStorage` du navigateur — pratique pour tester l'interface avant de configurer JSONBin, mais les données ne sont alors pas partagées entre utilisateurs.

## Développement local

Aucune installation n'est nécessaire. Sers simplement le dossier avec un serveur statique (les modules ES ne fonctionnent pas en `file://`) :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## Déploiement sur GitHub Pages

Un workflow GitHub Actions (`.github/workflows/deploy.yml`) est déjà configuré pour déployer automatiquement à chaque push sur `main`.

1. Dans les paramètres du dépôt GitHub : **Settings → Pages → Source**, sélectionne **GitHub Actions**.
2. Pousse sur `main` (ou lance le workflow manuellement via l'onglet Actions).
3. Le site sera disponible à l'adresse `https://<utilisateur>.github.io/<nom-du-repo>/`.

## Structure du projet

```
index.html                  Page unique de l'application
assets/css/styles.css       Styles complémentaires à Tailwind
assets/js/config.js         Clés d'API (JSONBin, imgbb)
assets/js/categories.js     Liste fixe des catégories
assets/js/api.js            Appels JSONBin + imgbb (avec fallback localStorage)
assets/js/utils.js          Fonctions utilitaires (uuid, dates, debounce...)
assets/js/toast.js          Notifications visuelles
assets/js/app.js            Logique principale de l'application
.github/workflows/deploy.yml Déploiement automatique GitHub Pages
```

## Limites connues

- Pas de gestion de conflits en cas d'écritures simultanées par deux utilisateurs (acceptable pour un groupe de 10 à 30 personnes).
- Plan gratuit JSONBin limité à 10 000 requêtes/mois.
- Pas d'administrateur : la modération repose sur la confiance du groupe.
