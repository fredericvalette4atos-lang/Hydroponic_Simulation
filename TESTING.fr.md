# Guide de Test

Documentation complète des tests pour le système de simulation de test hydroponique.

## Démarrage Rapide

### Exécuter les Tests d'Interface

**Windows (PowerShell):**
```powershell
.\scripts\test-interface.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/test-interface.sh
./scripts/test-interface.sh
```

## Suites de Test

### 1. Suite de Test d'Interface

Test complet de toutes les interfaces web et points de terminaison API.

**Ce qu'il teste:**
- ✓ Connectivité du serveur
- ✓ Page d'accueil chargée correctement
- ✓ Interface du tableau de bord chargée et avec tous les composants
- ✓ Documentation API Swagger UI
- ✓ API des capteurs (liste et valeurs individuelles)
- ✓ API des actionneurs (liste des actionneurs disponibles)
- ✓ Points de terminaison de contrôle de la simulation
- ✓ API de configuration
- ✓ Validation du format de réponse

**Sortie attendue:**
```
SUITE DE TEST D'INTERFACE DE SIMULATION HYDROPONIQUE
Version 1.0.0

========================================
Test de Connectivité
========================================
  [PASS] - Connexion au Serveur
         Statut: 200

[... plus de tests ...]

========================================
RÉSUMÉ DES TESTS
========================================
  Tests Réussis: 24 / 24 (100%)

  [SUCCESS] TOUS LES TESTS RÉUSSIS!

Liens Rapides:
   Page d'Accueil:  http://localhost:3000
   Tableau de Bord:     http://localhost:3000/dashboard
   Documentation API:      http://localhost:3000/api-docs
```

### 2. Tests Unitaires

Test des composants et fonctions individuels.

```bash
npm test
```

### 3. Tests Basés sur les Propriétés

Test des propriétés universelles sur tous les entrées en utilisant fast-check.

```bash
npm run test:coverage
```

### 4. Tests d'Intégration

Test des flux de travail complets et des interactions entre composants.

```bash
npm test -- tests/integration
```

## Couverture de Test

### Interfaces Web
- **Page d'Accueil** (`http://localhost:3000`)
  - Charge avec succès
  - Contient des liens de navigation
  - Affiche la section des liens rapides

- **Tableau de Bord** (`http://localhost:3000/dashboard`)
  - Charge avec succès
  - Affiche toutes les cartes de capteurs
  - Affiche les contrôles des actionneurs
  - A des boutons de contrôle de simulation
  - Se connecte à l'API et met à jour les données

- **Documentation API** (`http://localhost:3000/api-docs`)
  - Swagger UI charge
  - Affiche tous les points de terminaison
  - Permet de tester les points de terminaison

### Points de Terminaison API

#### Capteurs
- `GET /api/sensors` - Lister tous les capteurs
- `GET /api/sensors/:id` - Obtenir la valeur du capteur individuel

#### Actionneurs
- `GET /api/actuators` - Lister tous les actionneurs
- `POST /api/actuators/:id` - Envoyer une commande d'actionneur

#### Simulation
- `GET /api/simulation/status` - Obtenir le statut de la simulation
- `POST /api/simulation/start` - Démarrer la simulation
- `POST /api/simulation/stop` - Arrêter la simulation
- `POST /api/simulation/pause` - Pause la simulation
- `POST /api/simulation/resume` - Reprendre la simulation
- `POST /api/simulation/time-acceleration` - Définir l'accélération du temps

#### Configuration
- `GET /api/config` - Obtenir la configuration complète
- `POST /api/config` - Mettre à jour la configuration
- `GET /api/config/reservoir` - Obtenir la configuration du réservoir
- `POST /api/config/reservoir` - Mettre à jour la configuration du réservoir
- `GET /api/config/sensors` - Obtenir la configuration des capteurs
- `POST /api/config/sensors` - Mettre à jour la configuration des capteurs
- `GET /api/config/actuators` - Obtenir la configuration des actionneurs
- `POST /api/config/actuators` - Mettre à jour la configuration des actionneurs
- `GET /api/config/physics` - Obtenir la configuration de la physique
- `POST /api/config/physics` - Mettre à jour la configuration de la physique
- `GET /api/config/simulation` - Obtenir la configuration de la simulation
- `POST /api/config/simulation` - Mettre à jour la configuration de la simulation
- `GET /api/config/logging` - Obtenir la configuration de la journalisation
- `POST /api/config/logging` - Mettre à jour la configuration de la journalisation

### Format de Réponse
Toutes les réponses API incluent:
- `success` - Booléen indiquant le succès/l'échec
- `data` - Données de réponse (en cas de succès)
- `error` - Message d'erreur (en cas d'échec)
- `timestamp` - Horodatage Unix
- `simulatedTime` - Temps simulé actuel en secondes

## Exécution des Tests

### Prérequis
1. Construire le projet: `npm run build`
2. Démarrer le serveur: `npm start`
3. Dans un autre terminal, exécuter les tests

### Suite de Test Complète
```bash
# Exécuter tous les tests
npm test

# Exécuter avec couverture
npm run test:coverage

# Exécuter un fichier de test spécifique
npm test -- tests/integration/rest-api-interface.test.ts
```

### Tests d'Interface Uniquement
```bash
# PowerShell
.\scripts\test-interface.ps1

# Bash
./scripts/test-interface.sh

# Avec URL personnalisée
./scripts/test-interface.sh http://localhost:8080
```

## Intégration Continue

### Exemple GitHub Actions
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm start &
      - run: sleep 5
      - run: ./scripts/test-interface.sh
      - run: npm test
```

## Dépannage

### Les tests échouent avec "Impossible de se connecter"
- Assurez-vous que le serveur est en cours d'exécution: `npm start`
- Vérifiez que le port 3000 n'est pas bloqué
- Essayez un port personnalisé: `./scripts/test-interface.sh http://localhost:8080`

### Certaines valeurs de capteur sont NaN
- C'est normal lors de l'initialisation
- Attendez quelques secondes pour que la simulation se stabilise
- Réexécutez les tests

### Le tableau de bord n'affiche aucune donnée
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que l'API répond: `curl http://localhost:3000/api/sensors`
- Vérifiez l'onglet réseau dans les outils de développement du navigateur

### Les tests expirent
- Augmentez le délai d'expiration dans la configuration de test
- Vérifiez les journaux du serveur pour les erreurs
- Vérifiez la connectivité réseau

## Test de Performance

Surveiller les performances de la simulation:

```bash
# Vérifier la progression du temps simulé
curl http://localhost:3000/api/simulation/status | jq '.data.simulatedTime'

# Surveiller les mises à jour des capteurs
watch -n 1 'curl -s http://localhost:3000/api/sensors/ph-sensor-1 | jq ".data.value"'

# Vérifier l'accélération du temps
curl http://localhost:3000/api/simulation/status | jq '.data.timeAcceleration'
```

## Résultats des Tests

### Résultats Attendus
- Tous les 24 tests d'interface doivent réussir
- Tous les tests unitaires doivent réussir
- Tous les tests basés sur les propriétés doivent réussir
- Tous les tests d'intégration doivent réussir

### Exemple de Sortie
```
Tests Réussis: 24 / 24 (100%)

[SUCCESS] TOUS LES TESTS RÉUSSIS!

Capteurs: 4 trouvés
  * ph-sensor-1 - ph [pH]
  * ec-sensor-1 - ec [mS/cm]
  * temp-sensor-1 - temperature [°C]
  * water-level-sensor-1 - water_level [%]

Actionneurs: 6 trouvés
  * water-pump-1 - pump
  * nutrient-pump-1 - pump
  * ph-up-pump-1 - pump
  * ph-down-pump-1 - pump
  * grow-light-1 - light
  * drain-valve-1 - valve

Statut:
  * En cours d'exécution: True
  * Accélération du temps: 1x
  * Temps simulé: 123.45s
```

## Ajout de Nouveaux Tests

### Script PowerShell
```powershell
function Test-YourFeature {
    Write-TestHeader "Votre Fonctionnalité"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/your-endpoint" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        $passed = $response.success -eq $true
        Write-TestResult "Votre Test" $passed
        
        return $passed
    } catch {
        Write-TestResult "Votre Test" $false "Erreur: $_"
        return $false
    }
}
```

### Script Bash
```bash
test_your_feature() {
    print_header "Votre Fonctionnalité"
    
    response=$(curl -s "$BASE_URL/api/your-endpoint")
    
    if echo "$response" | grep -q '"success":true'; then
        print_result "Votre Test" true
    else
        print_result "Votre Test" false
        return 1
    fi
}
```

## Documentation

- [README.md](README.md) - Aperçu du projet
- [docs/en/architecture.md](docs/en/architecture.md) - Architecture du système
- [scripts/README.md](scripts/README.md) - Documentation des scripts de test
- [examples/DASHBOARD_INTEGRATION.md](examples/DASHBOARD_INTEGRATION.md) - Guide d'intégration du tableau de bord

---

**Créé**: 6 mars 2026  
**Statut**: Prêt pour Utilisation  
**Version**: 1.0.0
