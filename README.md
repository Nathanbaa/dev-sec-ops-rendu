# API DevSecOps — Jour 1

API REST sécurisée (JWT, requêtes préparées, validation) conçue pour un usage pédagogique en DevSecOps. Le projet inclut un pipeline CI/CD (Taskfile), des tests de sécurité et des outils d’analyse (SonarQube, Trivy, OWASP ZAP).

---

## Sommaire

- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Développement local](#développement-local)
- [Configuration](#configuration)
- [API](#api)
- [Tests](#tests)
- [CI/CD (Taskfile)](#cicd-taskfile)
- [Sécurité](#sécurité)
- [Ressources](#ressources)
- [Licence](#licence)
- [Conformité au sujet](#conformité-au-sujet)

---

## Prérequis

| Outil            | Version / remarque                                          |
| ---------------- | ----------------------------------------------------------- |
| Node.js          | ≥ 18                                                        |
| npm              | ≥ 9                                                         |
| Docker & Compose | Pour run et build                                           |
| Task (optionnel) | [taskfile.dev](https://taskfile.dev) pour le pipeline CI/CD |

---

## Démarrage rapide

Pour une évaluation uniquement avec Docker Compose :

```bash
cd demo-devsecops-api-j1
docker-compose up -d
```

- **API :** http://localhost:3000
- **Santé :** http://localhost:3000/api/health

Les utilisateurs par défaut sont créés au premier démarrage :

| Utilisateur | Mot de passe |
| ----------- | ------------ |
| admin       | admin123     |
| user        | password     |
| alice       | alice2024    |

---

## Développement local

```bash
# 1. Démarrer PostgreSQL
docker-compose up -d

# 2. Installer les dépendances
npm install

# 3. Copier la configuration (optionnel)
cp .env.example .env

# 4. Démarrer le serveur
npm run dev
```

Le serveur écoute sur **http://localhost:3000**. La base PostgreSQL est exposée sur **localhost:5432**.

---

## Configuration

Les variables d’environnement sont documentées dans `.env.example`. En production, définir au minimum :

| Variable         | Description                        |
| ---------------- | ---------------------------------- |
| `DB_HOST`        | Hôte PostgreSQL                    |
| `DB_PORT`        | Port PostgreSQL (défaut : 5432)    |
| `DB_USER`        | Utilisateur base                   |
| `DB_PASSWORD`    | Mot de passe (obligatoire en prod) |
| `DB_NAME`        | Nom de la base (défaut : myapp)    |
| `JWT_SECRET`     | Secret pour la signature des JWT   |
| `JWT_EXPIRES_IN` | Expiration du token (défaut : 1h)  |

---

## API

### Endpoints principaux

| Méthode | Chemin             | Description                       |
| ------- | ------------------ | --------------------------------- |
| GET     | `/`                | Documentation et liste des routes |
| GET     | `/api/health`      | Health check                      |
| POST    | `/api/auth/login`  | Authentification (JWT)            |
| GET     | `/api/files?name=` | Téléchargement de fichier         |
| POST    | `/api/users`       | Création d’utilisateur            |
| GET     | `/openapi.yaml`    | Spécification OpenAPI             |
| GET     | `/metrics`         | Métriques Prometheus              |

### Authentification

**POST** `/api/auth/login`

Corps (JSON) : `{ "username": "admin", "password": "admin123" }`

Réponse en succès : `{ "success": true, "token": "<JWT>", "user": { "id", "username", "email", "role" } }`  
Le champ `password` n’est jamais renvoyé.

### Création d’utilisateur

**POST** `/api/users`

Corps (JSON) : `{ "email": "user@example.com", "password": "motdepasse8caracteres" }`  
Le rôle est toujours fixé à `user` côté serveur ; la validation exige un email valide et un mot de passe d’au moins 8 caractères.

---

## Tests

### Requêtes manuelles (REST Client)

1. Installer l’extension **REST Client** (VSCode : `humao.rest-client`).
2. Ouvrir `api-tests.http`.
3. Exécuter les requêtes via « Send Request ».

Les scénarios couvrent le login (dont tentatives d’injection SQL), le path traversal sur `/api/files` et la création d’utilisateurs avec validation.

### Tests unitaires

```bash
npm run test          # Exécution
npm run test:coverage # Avec couverture
```

Les tests de sécurité vérifient notamment :

- Rejet des path traversal sur `/api/files`
- Absence de bypass d’authentification par injection SQL sur le login
- Validation des champs sur `/api/users` (email, longueur du mot de passe)

---

## CI/CD (Taskfile)

Avec [Task](https://taskfile.dev/) installé, les commandes suivantes sont disponibles :

| Commande              | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `task --list`         | Lister toutes les tâches                                |
| `task pre-commit`     | Lint + tests (avant commit)                             |
| `task 0-lint`         | ESLint                                                  |
| `task 1-compile`      | Vérification syntaxe Node                               |
| `task 2-build`        | Build de l’image Docker                                 |
| `task 3-test`         | Tests unitaires                                         |
| `task deps-scan`      | `npm audit` (dépendances)                               |
| `task sonar-scan`     | Analyse SonarQube (nécessite SonarQube + `SONAR_TOKEN`) |
| `task trivy-scan`     | Scan de l’image Docker (Trivy)                          |
| `task owasp-zap`      | Scan DAST avec OWASP ZAP (app + OpenAPI)                |
| `task branch-feature` | Phase branch-feature (lint, compile, test, build)       |
| `task pull-request`   | Phase Pull Request (toutes validations + sonar + trivy) |
| `task staging`        | Phase Staging (validations avant déploiement)           |
| `task production`     | Phase Production (pipeline complet)                     |
| `task nightly`        | Phase Nightly (sonar, trivy, ZAP)                       |
| `task ci`             | Alias de `pull-request`                                 |
| `task push`           | Pipeline puis `git push`                                |

**SonarQube**

- Démarrer : `task sonarqube-up`
- Analyse : définir `SONAR_TOKEN` (par ex. dans `.env`) puis `task sonar-scan`
- Sur Mac Apple Silicon (M1/M2/M3), le script privilégie un `sonar-scanner` installé en local : `brew install sonar-scanner`

**Quality gate :** `sonar.qualitygate.wait=true` est configuré ; le pipeline peut échouer si la quality gate n’est pas passée.

---

## Sécurité

Mesures mises en place dans cette version :

- **Authentification :** JWT, mots de passe hashés (bcrypt), requêtes préparées (aucune concaténation SQL).
- **Fichiers :** Contrôle strict du chemin (pas de path traversal), vérification que le fichier résolu reste sous le répertoire autorisé.
- **Utilisateurs :** Requêtes préparées, rôle forcé à `user`, validation (express-validator), pas d’exposition de stack trace en production.
- **Configuration :** Secrets et configuration via variables d’environnement (pas de mots de passe en dur en production).
- **Logs :** Winston avec rotation ; en production les logs sont aussi envoyés sur la sortie standard pour une collecte dans Docker.

---

## Ressources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Task](https://taskfile.dev/)

---

## Licence

MIT - À des fins éducatives uniquement
