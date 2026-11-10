# Mkaraks Web — Next.js + WordPress headless + PWA hors ligne

## Architecture

```
Navigateur ─► Vercel (Next.js)
               ├─ pages ISR : /, /artistes, /artiste/[slug], /artist/[artiste]/[chanson]
               ├─ /api/auth/*                → vérifie les identifiants auprès de WordPress, pose un cookie httpOnly signé
               ├─ /api/songs/[id]/manifest   → clés AES des 3 fichiers (connectés uniquement)
               ├─ /media/[id]/[type]         → proxy streamé du bucket PRIVÉ (fichiers chiffrés)
               └─ /api/revalidate            → appelé par WordPress à chaque modification
WordPress ─► contenu + comptes (plugin wordpress/mkaraks-headless.php)
GCS privé ─► enc/<chemin>.enc (AES-256-GCM), lisible uniquement par le compte de service de Vercel
```

Le navigateur ne voit jamais `storage.googleapis.com`. Ce qu'il télécharge depuis `/media` est chiffré. La clé n'est remise qu'à une session valide.

## Design (maquette mobile validée → tablette / desktop)
- Tokens dans `src/app/globals.css` (`@theme`) : crème `#FFF8EF`, encre `#1D1033`, rose `#FF2E7E` (bouton à relief `#C8155C`), jaune, turquoise, lilas… Polices Unbounded (titres) + Figtree (texte), icônes Material Symbols Rounded.
- Mise en page :
  - **mobile < 768 px** : identique à la maquette, barre d'onglets en bas, mini-lecteur au-dessus ;
  - **tablette 768–1023 px** : rail d'icônes à gauche, listes en grille auto (1 à 2 colonnes) ;
  - **≥ 1024 px** : barre latérale avec « Mes playlists », connexion en écran partagé, lecteur plein écran avec panneau Tonalité + « À suivre ».
- Les feuilles du bas (tonalité, nouvelle playlist) deviennent des fenêtres centrées à partir de 768 px.
- **Favoris et playlists sont stockés sur l'appareil (IndexedDB)** en attendant des endpoints WordPress pour les synchroniser entre appareils.

## Hors ligne (PWA)
- Le bouton **Télécharger** range les 3 fichiers chiffrés dans le Cache API `mkaraks-media`, et le manifeste (clés + expiration) dans IndexedDB.
- Les clés expirent après `OFFLINE_KEY_DAYS` jours (30 par défaut) sans passage en ligne. Une simple écoute en ligne les renouvelle.
- La **déconnexion** efface tous les téléchargements de l'appareil.
- Le service worker (Serwist) met en cache les pages visitées. Il ne met **jamais** `/media` ni `/api` en cache automatiquement.

## Mise en route

### 1. WordPress (nouveau serveur)
1. Installer `wordpress/mkaraks-headless.php` dans `wp-content/plugins/mkaraks-headless/` et l'activer.
2. Dans `wp-config.php` :
   ```php
   define( 'MKARAKS_HEADLESS_SECRET', '...' );   // = WP_HEADLESS_SECRET
   define( 'MKARAKS_FRONT_URL', 'https://mkaraks.com' );
   define( 'MKARAKS_REVALIDATE_SECRET', '...' ); // = REVALIDATE_SECRET
   ```
3. **Vérifier les noms des méta** (`audio`, `lyrics`, `chord`, `key`) dans JetEngine → Meta Boxes, et ajuster `MKARAKS_META` si besoin.
4. Test : `GET /wp-json/wp/v2/karaoke?per_page=1&_fields=id,mkaraks` doit renvoyer les chemins de fichiers.

### 2. Google Cloud
1. **Compte de lecture** `mkaraks-vercel` : rôle *Lecteur des objets Storage* sur le bucket. Sa clé JSON va dans `GCS_CLIENT_EMAIL` / `GCS_PRIVATE_KEY`.
2. Générer la clé maîtresse (**à sauvegarder dans un coffre**, la perdre rend tout illisible) :
   ```bash
   openssl rand -base64 32
   ```
3. Chiffrer le bucket avec un compte qui a les droits d'écriture. Les originaux ne sont pas touchés :
   ```bash
   MEDIA_MASTER_KEY=... GOOGLE_APPLICATION_CREDENTIALS=./admin.json npm run encrypt-bucket -- --only "rossy/" --dry-run
   MEDIA_MASTER_KEY=... GOOGLE_APPLICATION_CREDENTIALS=./admin.json npm run encrypt-bucket
   ```
   Le script peut être relancé : il saute les fichiers déjà chiffrés. Il faudra le relancer pour chaque nouvelle chanson ajoutée (à automatiser plus tard).

   **Compression appliquée avant chiffrement** (testé sur *Anilan'ny Tiana* : 3,7 Mo → 1,7 Mo, −55 %) :
   - audio → **Opus 48 kbit/s** (Ogg, VBR, ffmpeg fourni par `ffmpeg-static`) ;
   - `lyrics.json` → champs inutiles retirés + gzip (18 Ko → 3 Ko) ;
   - `chord.json` → `start`/`end`/`chord_majmin` + gzip (69 Ko → 1 Ko).

   Lecture : décodeur natif du navigateur, sinon décodeur WebAssembly `ogg-opus-decoder` chargé à la demande (anciens iPhone).
   Test local sans bucket : `node scripts/encrypt-bucket.mjs --local-in ./echantillons --local-out ./sortie`.
   Débit modifiable avec `--bitrate 64k` (relancer avec `--force` pour réencoder).
4. **En dernier**, quand le nouveau site est en ligne : retirer l'accès public (`allUsers`) au bucket. Attention, l'ancien site lit encore `file/` en public.

### 3. Vercel
- Importer le dépôt et renseigner les variables de `.env.example`.
- Domaine `mkaraks.com` sur Vercel, et WordPress sur un sous-domaine (ex. `admin.mkaraks.com`).

### Développement local
```bash
cp .env.example .env.local   # puis remplir
npm run dev                  # le service worker est désactivé en dev
npm run build && npm start   # pour tester la PWA / le hors-ligne
```

## À faire ensuite
- Logos PNG 192/512 et `maskable` (remplacer `public/icon.svg` dans `src/app/manifest.ts`).
- Playlists, profils chanteur et pitch enregistré (CPT `karaoke-playlist`, `singer`), à exposer dans le plugin.
- Inscription et mot de passe oublié (aujourd'hui gérés par WordPress).
- Redirections 301 des anciennes URLs avec slash final si nécessaire.
- Limitation de débit côté `/media` (Vercel Firewall ou Upstash) contre l'aspiration massive.

## Limite de sécurité, honnêtement
Un utilisateur connecté et très motivé peut toujours extraire une clé depuis son navigateur. Le chiffrement rend la copie massive et le partage de fichiers inutiles, mais ce n'est pas un DRM.
