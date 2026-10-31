# CNIVE Frontend — Client React & TypeScript
**Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant (Sénégal)**

Ce dossier contient l'application cliente Web de la plateforme CNIVE, développée avec **React**, **TypeScript**, **Vite** et **TailwindCSS**. Elle communique avec le backend FastAPI pour afficher les tableaux de bord analytiques, gérer les bénéficiaires et coordonner les interventions sociales et sanitaires à Pikine.

---

## 🚀 Démarrage Rapide

### Prerequis
* [Node.js](https://nodejs.org/) (Version 18 ou supérieure recommandée)
* Le backend FastAPI en cours d'exécution (par défaut sur `http://localhost:8001`)

### Installation
```bash
npm install
```

### Lancement en mode développement
```bash
npm run dev
```
L'application sera accessible par défaut sur [http://localhost:5173](http://localhost:5173).

---

## 🛠️ Architecture du Code source (`/src`)

* `/api` : Client HTTP (Axios) configuré avec des intercepteurs pour la gestion des jetons JWT et la résilience aux pannes.
* `/components` : Composants graphiques réutilisables (Boutons, Skeletons, Cartes, Modales, Layout).
* `/context` : Fournisseurs de contexte React (Authentification, Thème sombre/clair).
* `/hooks` : Custom hooks (ex. `useAuth`, `useForm`).
* `/i18n` : Configuration multilingue (`config.ts` gérant le Français et l'Espagnol).
* `/pages` : Vues et écrans principaux de l'application (Dashboard, Profils des élèves, Santé, IA, Cartographie, etc.).
* `/types` : Interfaces et types TypeScript.

---

## 🌐 Internationalisation (i18n)

L'application utilise `react-i18next` pour la traduction des textes. Toutes les clés de traduction sont centralisées dans `src/i18n/config.ts`.
Pour ajouter ou modifier des termes, veuillez modifier les ressources correspondantes :
* `resources.fr.translation` pour le français.
* `resources.es.translation` pour l'espagnol.

---

## 🛡️ Résilience face aux pannes d'API

Le tableau de bord (`src/pages/Dashboard.tsx`) intègre un système d'isolation des erreurs d'API. Si un microservice ou un point de terminaison du backend subit une coupure temporaire :
1. Les autres cartes statistiques continuent d'afficher les données réelles reçues.
2. La carte statistique défaillante affiche un badge **"Erreur"** rouge avec une icône de vigilance au lieu de masquer la panne ou d'afficher un `0` erroné.

---

## 🔄 Synchronisation des types avec le Backend (FastAPI)

Pour garantir une intégrité totale du typage TypeScript avec les schémas Pydantic du backend FastAPI (Recommandation 4 de l'audit), il est conseillé de générer automatiquement les définitions de types.

### Étape 1 : Installer le générateur
```bash
npm install -D openapi-typescript
```

### Étape 2 : Générer les types
Assurez-vous que le serveur backend FastAPI est démarré sur le port `8001` :
```bash
npx openapi-typescript http://localhost:8001/openapi.json --output src/types/api.ts
```

Cette commande génèrera instantanément le fichier `src/types/api.ts` contenant toutes les interfaces de requêtes et réponses de l'API. Vous pourrez ainsi importer et utiliser ces types statiques directement dans vos pages et requêtes Axios, évitant toute désynchronisation accidentelle de format JSON.
