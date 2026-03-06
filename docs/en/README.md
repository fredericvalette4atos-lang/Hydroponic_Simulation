# Hydroponic Test Simulation - English Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Main Concepts](#main-concepts)
3. [Getting Started](#getting-started)
4. [Architecture Overview](#architecture-overview)
5. [Key Components](#key-components)
6. [Further Reading](#further-reading)

## Introduction

The Hydroponic Test Simulation is a comprehensive software system that emulates hydroponic hardware for testing home automation features without physical equipment. It simulates the complete behavior of a hydroponic system including sensors, actuators, and the complex physics and chemistry of nutrient solutions.

### Purpose

This simulator enables developers to:
- Test hydroponic monitoring and control features without physical hardware
- Reproduce specific test scenarios consistently
- Accelerate testing by speeding up time (up to 1000x)
- Validate automation logic before deployment
- Test failure scenarios safely

### Key Features

- **Realistic Sensor Simulation**: pH, EC, temperature, and water level sensors with noise and drift
- **Actuator Control**: Pumps (water, nutrient, pH adjustment), grow lights, and valves
- **Physics & Chemistry Models**: Accurate simulation of evaporation, plant uptake, nutrient concentration, and pH buffering
- **Time Acceleration**: Speed up simulations for rapid testing
- **State Persistence**: Save and restore simulation state
- **REST API**: Complete HTTP API for test automation
- **Gladys Integration**: Full compatibility with Gladys home automation

## Main Concepts

### Simulation Time vs Real Time

The simulator maintains two time scales:

- **Real Time**: Actual wall-clock time
- **Simulated Time**: Virtual time within the simulation

Time acceleration allows simulated time to advance faster than real time. For example, with 10x acceleration, 1 hour of simulated time passes in 6 minutes of real time.

### Sensors

Sensors measure the state of the hydroponic system:

- **pH Sensor**: Measures acidity/alkalinity (0-14 scale)
- **EC Sensor**: Measures electrical conductivity (nutrient concentration)
- **Temperature Sensor**: Measures solution temperature
- **Water Level Sensor**: Measures reservoir fill level (0-100%)

Each sensor includes:
- Configurable baseline value
- Realistic measurement noise
- Drift over time
- Response to actuator actions

### Actuators

Actuators control the hydroponic system:

- **Water Pump**: Adds fresh water (dilutes nutrients, raises water level)
- **Nutrient Pump**: Adds nutrients (increases EC)
- **pH Up Pump**: Adds alkaline solution (increases pH)
- **pH Down Pump**: Adds acidic solution (decreases pH)
- **Grow Lights**: Provides illumination (affects temperature)
- **Drain Valve**: Removes solution (lowers water level)

### Physics Model

The physics model simulates natural processes:

- **Evaporation**: Water loss over time
- **Plant Uptake**: Water and nutrient consumption by plants
- **Temperature Drift**: Ambient temperature effects
- **pH Buffering**: Natural pH stabilization
- **Nutrient Concentration**: Changes due to water addition/removal

### Test Scenarios

Test scenarios define:
- Initial system state (sensor values)
- Scheduled events (actuator commands, parameter changes)
- Failure conditions (actuator failures at specific times)

Scenarios enable reproducible testing of specific conditions.

## Getting Started

### Installation

\`\`\`bash
npm install
npm run build
\`\`\`

### Running the Simulator

\`\`\`bash
npm start
\`\`\`

The simulator starts with default configuration and REST API on port 3000.

### Accessing the API

Open your browser to view interactive API documentation:

\`\`\`
http://localhost:3000/api-docs
\`\`\`

### Basic Usage Example

\`\`\`bash
# Get all sensors
curl http://localhost:3000/api/sensors

# Get pH sensor value
curl http://localhost:3000/api/sensors/ph-sensor-1

# Turn on water pump
curl -X POST http://localhost:3000/api/actuators/water-pump-1 \\
  -H "Content-Type: application/json" \\
  -d '{"state": true}'

# Get simulation status
curl http://localhost:3000/api/simulation/status
\`\`\`

## Architecture Overview

### High-Level Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     External Systems                         │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Gladys Home          │    │ Test Automation      │      │
│  │ Automation           │    │ Client               │      │
│  └──────────┬───────────┘    └──────────┬───────────┘      │
└─────────────┼──────────────────────────┼──────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Gladys Integration   │    │ REST API             │      │
│  │ Adapter              │    │ Server               │      │
│  └──────────┬───────────┘    └──────────┬───────────┘      │
└─────────────┼──────────────────────────┼──────────────────┘
              │                           │
              └───────────┬───────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Simulation Engine                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Simulation Core                        │    │
│  │  - Time Management                                  │    │
│  │  - Event Logging                                    │    │
│  │  - State Management                                 │    │
│  └────────────┬───────────────────────────┬───────────┘    │
└───────────────┼───────────────────────────┼────────────────┘
                │                           │
       ┌────────┴────────┐         ┌───────┴────────┐
       ▼                 ▼         ▼                ▼
┌─────────────┐   ┌─────────────┐ ┌──────────┐ ┌──────────┐
│  Sensors    │   │  Actuators  │ │ Physics  │ │Chemistry │
│  - pH       │   │  - Pumps    │ │ Model    │ │ Model    │
│  - EC       │   │  - Lights   │ │          │ │          │
│  - Temp     │   │  - Valves   │ │          │ │          │
│  - Level    │   │             │ │          │ │          │
└─────────────┘   └─────────────┘ └──────────┘ └──────────┘
\`\`\`

### Simulation Loop

The simulator operates in a continuous loop:

\`\`\`
1. Advance Time (TimeManager)
   ↓
2. Process Actuator Commands
   ↓
3. Update Physics Model
   ↓
4. Update Sensor Readings
   ↓
5. Log Events
   ↓
6. Return to Step 1
\`\`\`

See [architecture.md](./architecture.md) for detailed architecture documentation.

## Key Components

### Simulation Core

The central orchestrator that:
- Manages simulation lifecycle (start/stop/pause/resume)
- Coordinates time advancement
- Processes actuator commands
- Updates physics and sensors
- Handles state persistence

### Time Manager

Manages simulation time:
- Tracks real time and simulated time
- Implements time acceleration
- Provides time deltas for physics calculations

### Sensors

Each sensor type:
- Maintains baseline value
- Applies measurement noise
- Simulates drift over time
- Updates from physics model

### Actuators

Each actuator type:
- Responds to commands (on/off, intensity)
- Tracks runtime
- Affects physics model
- Can simulate failures

### Physics Model

Simulates hydroponic system dynamics:
- Water volume changes (evaporation, uptake, pumps)
- Nutrient concentration (dilution, uptake, dosing)
- Temperature changes (ambient drift, lights, heating)
- pH changes (drift, buffering, pH adjustment)

### Chemistry Model

Provides chemistry calculations:
- pH buffering effects
- Nutrient concentration from EC
- pH changes from nutrient addition
- Dilution calculations

## Further Reading

- [Architecture Details](./architecture.md) - Detailed system architecture
- [User Guide](./user-guide.md) - Complete usage guide
- [API Reference](./api-reference.md) - REST API documentation
- [Configuration Guide](./configuration.md) - Configuration options
- [Scenario Guide](./scenarios.md) - Creating test scenarios
