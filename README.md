# Simulateur et Superviseur de Robot Collaboratif

**Réf. sujet : INFO002** — Développement d'une application de simulation et de supervision de robots collaboratifs JAKA et Universal Robots.

Projet réalisé par **Nermine Douss**, spécialité Cloud/DevOps.

## Objectif du sujet

Développer une application permettant de :
- simuler le fonctionnement d'un robot collaboratif,
- visualiser le robot en 3D,
- simuler ses mouvements,
- envoyer des commandes et suivre son état en temps réel.

## Répartition du travail

- **Développement applicatif** : réalisé avec l'assistance de Claude (Anthropic), sous ma direction et mes choix techniques
- **Infrastructure, déploiement, DevOps** : réalisé personnellement (ma spécialité) — Docker, Terraform, Ansible, CI/CD, cloud Azure

## Architecture

```
├── backend/              API REST + WebSocket (Node.js, Express, ws)
│   ├── src/
│   │   ├── server.js       point d'entrée, câblage Express + WebSocket
│   │   ├── robotEngine.js  logique métier : état du robot, mouvement, cinématique
│   │   └── routes.js       endpoints REST (commandes, angles de joints)
│   └── Dockerfile
├── frontend/              Interface 3D (React, Three.js, Vite)
│   ├── src/
│   │   ├── RobotSimulator.jsx   composant principal (3D + panneau de contrôle)
│   │   └── useRobotSocket.js    connecteur REST + WebSocket vers le backend
│   └── Dockerfile
└── docker-compose.yml     Orchestration des deux services ensemble
```

## Stack technique

| Catégorie | Choix | Justification |
|---|---|---|
| Frontend | React + Three.js + Vite | Rendu 3D interactif performant, écosystème JS demandé par le sujet |
| Backend | Node.js + Express | API REST légère, cohérente avec le frontend en JS |
| Temps réel | WebSocket | Suivi d'état continu, plus adapté que REST pour du polling |
| Commandes | API REST | Actions ponctuelles (start/stop/home), pattern standard |
| Conteneurisation | Docker + Docker Compose | Portabilité, base du déploiement cloud |
| Infrastructure (à venir) | Terraform | Infrastructure as Code sur Azure |
| Configuration (à venir) | Ansible | Configuration automatisée des serveurs |
| CI/CD (à venir) | GitHub Actions | Automatisation build/test/déploiement |
| Réseau/SSL (à venir) | Cloudflare | DNS et certificat SSL |

## Journal de progression

### Étape 1 — Conception du simulateur 3D
Mise en place du rendu 3D avec Three.js. Le bras robotique est modélisé comme une **chaîne cinématique réelle** : chaque articulation (joint) est un groupe 3D parent du suivant, ce qui garantit que faire pivoter une articulation entraîne mécaniquement toutes les suivantes — comme un vrai bras robotique, pas une simple animation.

### Étape 2 — Backend et communication temps réel
Création d'un backend Node.js exposant :
- une **API REST** (`/api/command`, `/api/joints`, `/api/state`) pour les actions ponctuelles,
- un **WebSocket** (`/ws`) diffusant l'état du robot en continu (~20 fois/seconde) à tous les clients connectés.

Ce choix à deux protocoles reproduit une architecture réaliste de supervision industrielle (IoT/robotique) : REST pour piloter, flux continu pour observer.

### Étape 3 — Connexion frontend ↔ backend
Le frontend a été branché au backend via le hook `useRobotSocket`, remplaçant l'état purement local par l'état réel renvoyé par le serveur. Les commandes (Start/Pause/Stop/Home) et les sliders de joints envoient désormais de vraies requêtes au backend, qui fait autorité sur l'état du robot.

### Étape 4 — Ajustement du comportement de mouvement
Le moteur de simulation (`robotEngine.js`) a été affiné pour utiliser une interpolation à **vitesse angulaire constante** plutôt qu'exponentielle, pour un mouvement plus proche du comportement réel d'un bras industriel (démarrage net, arrêt net, vitesse régulière).

### Étape 5 — Durcissement du backend (sécurité et robustesse)
- **Validation des limites de joints côté serveur** : le backend ne fait plus confiance aveuglément aux valeurs reçues, il vérifie que chaque angle envoyé reste dans les limites physiques du robot avant de l'accepter.
- **CORS restreint** : l'API n'autorise plus que l'origine du frontend légitime, configurable par variable d'environnement, au lieu d'accepter n'importe quelle origine.

### Étape 6 — Conteneurisation (Docker)
- Rédaction de Dockerfiles multi-étapes pour le backend (image Node.js Alpine minimale, utilisateur non-root, healthcheck) et le frontend (build React puis service par nginx).
- Orchestration des deux services avec `docker-compose.yml`, testée et validée : les deux conteneurs démarrent, communiquent, et l'application est entièrement fonctionnelle en environnement conteneurisé.

### Étapes suivantes (en cours / à venir)
- [ ] Versioning du code sur GitHub
- [ ] Provisionnement de l'infrastructure Azure avec Terraform
- [ ] Configuration des serveurs avec Ansible
- [ ] Pipeline CI/CD avec GitHub Actions
- [ ] Certificat SSL et DNS via Cloudflare
- [ ] Déclinaison en application mobile installable (Capacitor)

## Limites connues (assumées)

- La cinématique de calcul de position (TCP) est une approximation simplifiée, pas un calcul complet par matrices de transformation DH — suffisant pour une démonstration, mais à noter pour un usage industriel réel.
- Pas de connexion à un robot physique réel : simulation logicielle pure, conforme au sujet ("simuler le fonctionnement").
- Pas de persistance en base de données pour l'instant : l'état vit en mémoire dans le backend (choix assumé pour rester simple, amélioration possible plus tard).

## Lancer le projet en local

Avec Docker (recommandé) :
```bash
docker compose up -d --build
```
Puis ouvrir : http://localhost:8090

Sans Docker (développement) :
```bash
# Terminal 1
cd backend && npm install && npm start

# Terminal 2
cd frontend && npm install && npm run dev
```
