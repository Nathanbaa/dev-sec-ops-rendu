#!/bin/sh

# Script pour exécuter l'analyse SonarQube
# Usage: ./scripts/sonar-scan.sh [SONAR_HOST] [SONAR_TOKEN]
# Sur Mac Apple Silicon (M1/M2/M3), préférer: brew install sonar-scanner puis le script utilisera le binaire local.

SONAR_HOST=${1:-http://localhost:9000}
SONAR_TOKEN=${2:-}

echo "🔍 Démarrage de l'analyse SonarQube..."
echo "📍 SonarQube Server: $SONAR_HOST"

# Vérifier si SonarQube est accessible
if ! curl -f -s "$SONAR_HOST/api/system/status" > /dev/null 2>&1; then
    echo "❌ Erreur: Impossible de se connecter à SonarQube à $SONAR_HOST"
    echo "💡 Assurez-vous que SonarQube est démarré: docker-compose -f docker-compose-sq.yml up -d"
    exit 1
fi

# Sur Mac ARM, Docker avec image x86_64 peut échouer (rosetta/elf). Utiliser sonar-scanner local si dispo.
if command -v sonar-scanner >/dev/null 2>&1; then
    echo "📦 Utilisation du sonar-scanner local (recommandé sur Mac M1/M2/M3)"
    export SONAR_HOST_URL="$SONAR_HOST"
    [ -n "$SONAR_TOKEN" ] && export SONAR_TOKEN="$SONAR_TOKEN"
    if sonar-scanner -Dsonar.host.url="$SONAR_HOST" ${SONAR_TOKEN:+-Dsonar.login=$SONAR_TOKEN}; then
        echo "✅ Analyse SonarQube terminée avec succès!"
        echo "🌐 Consultez les résultats sur: $SONAR_HOST"
        exit 0
    else
        echo "❌ Erreur lors de l'analyse SonarQube"
        exit 1
    fi
fi

# Sinon: Docker (peut échouer sur Apple Silicon avec erreur rosetta/ld-linux)
echo "🔨 Construction de l'image SonarScanner..."
docker build --target SonarScanner -t sonar-scanner:local . || {
    echo "❌ Erreur lors de la construction de l'image"
    exit 1
}

ENV_ARGS=""
if [ -n "$SONAR_TOKEN" ]; then
    ENV_ARGS="-e SONAR_TOKEN=$SONAR_TOKEN"
fi

echo "🚀 Exécution de l'analyse (Docker)..."
docker run --rm \
    -v "$(pwd):/app" \
    -w /app \
    -e SONAR_HOST_URL="$SONAR_HOST" \
    $ENV_ARGS \
    sonar-scanner:local \
    sonar-scanner \
    -Dsonar.host.url="$SONAR_HOST" \
    ${SONAR_TOKEN:+-Dsonar.login=$SONAR_TOKEN}

if [ $? -eq 0 ]; then
    echo "✅ Analyse SonarQube terminée avec succès!"
    echo "🌐 Consultez les résultats sur: $SONAR_HOST"
else
    echo "❌ Erreur lors de l'analyse SonarQube"
    echo "💡 Sur Mac Apple Silicon, installez le scanner en local: brew install sonar-scanner"
    exit 1
fi
