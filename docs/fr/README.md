# Simulation de Test Hydroponique - Documentation Française

## Table des Matières

1. [Introduction](#introduction)
2. [Concepts Principaux](#concepts-principaux)
3. [Démarrage Rapide](#démarrage-rapide)
4. [Vue d'ensemble de l'Architecture](#vue-densemble-de-larchitecture)
5. [Composants Clés](#composants-clés)
6. [Lectures Complémentaires](#lectures-complémentaires)

## Introduction

La Simulation de Test Hydroponique est un système logiciel complet qui émule du matériel hydroponique pour tester les fonctionnalités de domotique sans équipement physique. Elle simule le comportement complet d'un système hydroponique incluant les capteurs, les actionneurs, et la physique et chimie complexes des solutions nutritives.

### Objectif

Ce simulateur permet aux développeurs de :
- Tester les fonctionnalités de surveillance et de contrôle hydroponique sans matériel physique
- Reproduire des scénarios de test spécifiques de manière cohérente
- Accélérer les tests en accélérant le temps (jusqu'à 1000x)
- Valider la logique d'automatisation avant le déploiement
- Tester les scénarios de défaillance en toute sécurité

### Fonctionnalités Principales

- **Simulation Réaliste de Capteurs** : Capteurs de pH, EC, température et niveau d'eau avec bruit et dérive
- **Contrôle des Actionneurs** : Pompes (eau, nutriments, ajustement pH), lampes de croissance et vannes
- **Modèles Physiques et Chimiques** : Simulation précise de l'évaporation, l'absorption par les plantes, la concentration en nutriments et le tamponnage du pH
- **Accélération Temporelle** : Accélération des simulations pour des tests rapides
- **Persistance d'État** : Sauvegarde et restauration de l'état de simulation
- **API REST** : API HTTP complète pour l'automatisation des tests
- **Intégration Gladys** : Compatibilité totale avec la domotique Gladys

## Concepts Principaux

### Temps Simulé vs Temps Réel

Le simulateur maintient deux échelles de temps :

- **Temps Réel** : Temps d'horloge réel
- **Temps Simulé** : Temps virtuel dans la simulation

L'accélération temporelle permet au temps simulé d'avancer plus rapidement que le temps réel. Par exemple, avec une accélération de 10x, 1 heure de temps simulé passe en 6 minutes de temps réel.

### Capteurs

Les capteurs mesurent l'état du système hydroponique :

- **Capteur pH** : Mesure l'acidité/alcalinité (échelle 0-14)
- **Capteur EC** : Mesure la conductivité électrique (concentration en nutriments)
- **Capteur de Température** : Mesure la température de la solution
- **Capteur de Niveau d'Eau** : Mesure le niveau de remplissage du réservoir (0-100%)

Chaque capteur inclut :
- Valeur de référence configurable
- Bruit de mesure réaliste
- Dérive dans le temps
- Réponse aux actions des actionneurs

### Actionneurs

Les actionneurs contrôlent le système hydroponique :

- **Pompe à Eau** : Ajoute de l'eau fraîche (dilue les nutriments, augmente le niveau d'eau)
- **Pompe à Nutriments** : Ajoute des nutriments (augmente l'EC)
- **Pompe pH Up** : Ajoute une solution alcaline (augmente le pH)
- **Pompe pH Down** : Ajoute une solution acide (diminue le pH)
- **Lampes de Croissance** : Fournit l'éclairage (affecte la température)
- **Vanne de Drainage** : Retire la solution (diminue le niveau d'eau)

### Modèle Physique

Le modèle physique simule les processus naturels :

- **Évaporation** : Perte d'eau au fil du temps
- **Absorption par les Plantes** : Consommation d'eau et de nutriments par les plantes
- **Dérive de Température** : Effets de la température ambiante
- **Tamponnage du pH** : Stabilisation naturelle du pH
- **Concentration en Nutriments** : Changements dus à l'ajout/retrait d'eau

### Scénarios de Test

Les scénarios de test définissent :
- État initial du système (valeurs des capteurs)
- Événements programmés (commandes d'actionneurs, changements de paramètres)
- Conditions de défaillance (défaillances d'actionneurs à des moments spécifiques)

Les scénarios permettent des tests reproductibles de conditions spécifiques.

## Démarrage Rapide

### Installation

\`\`\`bash
npm install
npm run build
\`\`\`

### Exécution du Simulateur

\`\`\`bash
npm start
\`\`\`

Le simulateur démarre avec la configuration par défaut et l'API REST sur le port 3000.

### Accès à l'API

Ouvrez votre navigateur pour voir la documentation interactive de l'API :

\`\`\`
http://localhost:3000/api-docs
\`\`\`

### Exemple d'Utilisation de Base

\`\`\`bash
# Obtenir tous les capteurs
curl http://localhost:3000/api/sensors

# Obtenir la valeur du capteur pH
curl http://localhost:3000/api/sensors/ph-sensor-1

# Activer la pompe à eau
curl -X POST http://localhost:3000/api/actuators/water-pump-1 \\
  -H "Content-Type: application/json" \\
  -d '{"state": true}'

# Obtenir le statut de la simulation
curl http://localhost:3000/api/simulation/status
\`\`\`

## Vue d'ensemble de l'Architecture

### Architecture de Haut Niveau

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                   Systèmes Externes                          │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Domotique Gladys     │    │ Client               │      │
│  │                      │    │ d'Automatisation     │      │
│  └──────────┬───────────┘    └──────────┬───────────┘      │
└─────────────┼──────────────────────────┼──────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Couche API                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Adaptateur           │    │ Serveur              │      │
│  │ d'Intégration Gladys │    │ API REST             │      │
│  └──────────┬───────────┘    └──────────┬───────────┘      │
└─────────────┼──────────────────────────┼──────────────────┘
              │                           │
              └───────────┬───────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Moteur de Simulation                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Noyau de Simulation                       │    │
│  │  - Gestion du Temps                                 │    │
│  │  - Journalisation des Événements                    │    │
│  │  - Gestion d'État                                   │    │
│  └────────────┬───────────────────────────┬───────────┘    │
└───────────────┼───────────────────────────┼────────────────┘
                │                           │
       ┌────────┴────────┐         ┌───────┴────────┐
       ▼                 ▼         ▼                ▼
┌─────────────┐   ┌─────────────┐ ┌──────────┐ ┌──────────┐
│  Capteurs   │   │ Actionneurs │ │ Modèle   │ │ Modèle   │
│  - pH       │   │  - Pompes   │ │ Physique │ │ Chimique │
│  - EC       │   │  - Lampes   │ │          │ │          │
│  - Temp     │   │  - Vannes   │ │          │ │          │
│  - Niveau   │   │             │ │          │ │          │
└─────────────┘   └─────────────┘ └──────────┘ └──────────┘
\`\`\`

### Boucle de Simulation

Le simulateur fonctionne en boucle continue :

\`\`\`
1. Avancer le Temps (TimeManager)
   ↓
2. Traiter les Commandes d'Actionneurs
   ↓
3. Mettre à Jour le Modèle Physique
   ↓
4. Mettre à Jour les Lectures de Capteurs
   ↓
5. Journaliser les Événements
   ↓
6. Retour à l'Étape 1
\`\`\`

Voir [architecture.md](./architecture.md) pour la documentation détaillée de l'architecture.

## Composants Clés

### Noyau de Simulation

L'orchestrateur central qui :
- Gère le cycle de vie de la simulation (démarrer/arrêter/pause/reprendre)
- Coordonne l'avancement du temps
- Traite les commandes d'actionneurs
- Met à jour la physique et les capteurs
- Gère la persistance d'état

### Gestionnaire de Temps

Gère le temps de simulation :
- Suit le temps réel et le temps simulé
- Implémente l'accélération temporelle
- Fournit les deltas de temps pour les calculs physiques

### Capteurs

Chaque type de capteur :
- Maintient une valeur de référence
- Applique un bruit de mesure
- Simule une dérive dans le temps
- Se met à jour depuis le modèle physique

### Actionneurs

Chaque type d'actionneur :
- Répond aux commandes (marche/arrêt, intensité)
- Suit le temps de fonctionnement
- Affecte le modèle physique
- Peut simuler des défaillances

### Modèle Physique

Simule la dynamique du système hydroponique :
- Changements de volume d'eau (évaporation, absorption, pompes)
- Concentration en nutriments (dilution, absorption, dosage)
- Changements de température (dérive ambiante, lampes, chauffage)
- Changements de pH (dérive, tamponnage, ajustement pH)

### Modèle Chimique

Fournit les calculs chimiques :
- Effets de tamponnage du pH
- Concentration en nutriments à partir de l'EC
- Changements de pH dus à l'ajout de nutriments
- Calculs de dilution

## Lectures Complémentaires

- [Détails de l'Architecture](./architecture.md) - Architecture système détaillée
- [Guide Utilisateur](./user-guide.md) - Guide d'utilisation complet
- [Référence API](./api-reference.md) - Documentation de l'API REST
- [Guide de Configuration](./configuration.md) - Options de configuration
- [Guide des Scénarios](./scenarios.md) - Création de scénarios de test
