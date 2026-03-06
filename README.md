# Hydroponic Test Simulation

[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](TESTING.md#coverage-guide)
[![Tests](https://img.shields.io/badge/tests-1022%2B-brightgreen)](TESTING.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A comprehensive test simulation system for hydroponic integration within the Gladys open source home automation project. This simulator enables developers to test hydroponic monitoring and control features without requiring physical hardware.

## 🚀 Quick Start Links

Once the simulator is running on port 3000:

- **[Welcome Page](http://localhost:3000)** - Central hub with all links
- **[API Documentation (Swagger UI)](http://localhost:3000/api-docs)** - Interactive API explorer and testing
- **[Dashboard](http://localhost:3000/dashboard)** - Real-time monitoring and control interface
- **Architecture Guide** - See `docs/en/architecture.md` in your project
- **MCP Integration** - See `docs/MCP_INTEGRATION.md` in your project

## Features

- **Realistic Sensor Simulation**: pH, EC, temperature, and water level sensors with configurable noise and drift
- **Actuator Control**: Pumps (water, nutrient, pH adjustment), grow lights, and valves
- **Physics & Chemistry Models**: Accurate simulation of hydroponic system dynamics including evaporation, plant uptake, nutrient concentration, and pH buffering
- **Gladys Integration**: Full compatibility with Gladys home automation device API
- **REST API**: Complete REST API for test automation and external control
- **Interactive API Documentation**: [Swagger UI](http://localhost:3000/api-docs) for exploring and testing all endpoints
- **Time Acceleration**: Speed up simulations by up to 1000x for rapid testing
- **State Persistence**: Save and restore simulation state for pause/resume workflows
- **Test Scenarios**: Load predefined scenarios with initial conditions, events, and failure simulations
- **Comprehensive Logging**: Configurable logging with rotation policies

## Installation

```bash
npm install
```

## Quick Start

### 1. Build the project

```bash
npm run build
```

### 2. Run the simulator

```bash
npm start
```

This will start the simulator with the default configuration and REST API server on port 3000.

### 3. Access the API

#### Interactive API Documentation (Swagger UI)

Open your browser and navigate to:

```
http://localhost:3000/api-docs
```

The Swagger UI provides interactive API documentation where you can:
- Browse all available endpoints
- View request/response schemas
- Test API calls directly from your browser
- See example requests and responses

#### Command Line (curl)

You can also use curl to interact with the API:

```bash
# Get all sensors
curl http://localhost:3000/api/sensors

# Get specific sensor value
curl http://localhost:3000/api/sensors/ph-sensor-1

# Get simulation status
curl http://localhost:3000/api/simulation/status

# Control an actuator
curl -X POST http://localhost:3000/api/actuators/water-pump-1 \
  -H "Content-Type: application/json" \
  -d '{"state": true}'
```

## Usage

### Command Line Options

```bash
node dist/main.js [options]

Options:
  -c, --config <path>   Path to configuration file (default: ./examples/default-config.json)
  -p, --port <number>   API server port (default: 3000)
  -h, --help            Display help message

Examples:
  node dist/main.js
  node dist/main.js --config ./my-config.json
  node dist/main.js --port 8080
  node dist/main.js --config ./my-config.json --port 8080
```

### Development Mode

Run the simulator in development mode with auto-reload:

```bash
npm run start:dev
```

### Configuration

Create a configuration file (JSON format) to customize the simulation. See `examples/default-config.json` for a complete example.

#### Configuration Structure

```json
{
  "reservoir": {
    "capacity": 50,              // Reservoir capacity in liters
    "initialWaterLevel": 80      // Initial water level (0-100%)
  },
  "sensors": {
    "ph": {
      "id": "ph-sensor-1",
      "baseline": 6.5,           // Initial pH value (0-14)
      "noiseStdDev": 0.1,        // Measurement noise (±0.1 pH)
      "driftRate": 0.05          // Drift rate (pH units/hour)
    },
    "ec": { /* ... */ },
    "temperature": { /* ... */ },
    "waterLevel": { /* ... */ }
  },
  "actuators": {
    "pumps": [
      {
        "id": "water-pump-1",
        "type": "water",         // Types: water, nutrient, ph_up, ph_down
        "flowRate": 2.0,         // Flow rate in liters/hour
        "failureProbability": 0.001
      }
    ],
    "lights": [ /* ... */ ],
    "valves": [ /* ... */ ]
  },
  "physics": {
    "evaporationRate": 0.1,      // Liters/hour
    "plantUptakeRate": 0.05,     // Liters/hour
    "nutrientUptakeRate": 5,     // PPM/hour
    "ambientTemperature": 22,    // Celsius
    "temperatureDriftRate": 0.5, // Celsius/hour
    "phDriftRate": 0.1,          // pH units/hour
    "bufferCapacity": 0.3        // pH buffering (0-1)
  },
  "simulation": {
    "tickRate": 10,              // Updates per second
    "timeAcceleration": 1        // Time acceleration factor (1-1000)
  },
  "logging": {
    "level": "info",             // Levels: debug, info, warning, error
    "filepath": "./logs/simulation.log",
    "rotationPolicy": "daily"    // Policies: daily, size
  }
}
```

### Test Scenarios

Load predefined test scenarios to reproduce specific testing conditions:

```bash
# Via API
curl -X POST http://localhost:3000/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"filepath": "./examples/scenarios/ph-adjustment.json"}'
```

See `examples/scenarios/` for example scenarios.

#### Scenario Structure

```json
{
  "name": "pH Adjustment Test",
  "description": "Test pH adjustment with pH-up pump",
  "initialState": {
    "ph": 5.5,
    "ec": 1.8,
    "temperature": 22,
    "waterLevel": 80
  },
  "events": [
    {
      "time": 10,                // Simulated seconds from start
      "type": "actuator_command",
      "target": "ph-up-pump-1",
      "value": { "active": true }
    }
  ],
  "failures": [
    {
      "actuatorId": "water-pump-1",
      "failureTime": 300,        // Simulated seconds
      "duration": 60             // Failure duration in seconds
    }
  ]
}
```

## REST API Reference

The REST API provides programmatic access to all simulation features. For interactive documentation, visit `http://localhost:3000/api-docs` when the simulator is running.

### API Documentation

- **Swagger UI**: http://localhost:3000/api-docs (interactive documentation)
- **OpenAPI JSON**: http://localhost:3000/api-docs.json (machine-readable spec)

### Configuration Management

The API also supports dynamic configuration updates:

#### Get full configuration
```
GET /api/config
```

#### Update configuration
```
POST /api/config
```

Request body:
```json
{
  "reservoir": { "capacity": 50 },
  "sensors": { "ph": { "baseline": 6.5 } },
  "physics": { "evaporationRate": 0.1 }
}
```

#### Get specific configuration sections
```
GET /api/config/reservoir
GET /api/config/sensors
GET /api/config/actuators
GET /api/config/physics
GET /api/config/simulation
GET /api/config/logging
```

#### Update specific configuration sections
```
POST /api/config/reservoir
POST /api/config/sensors
POST /api/config/actuators
POST /api/config/physics
POST /api/config/simulation
POST /api/config/logging
```

### Sensors

#### List all sensors
```
GET /api/sensors
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "ph-sensor-1",
      "type": "ph",
      "value": 6.52,
      "unit": "pH"
    }
  ],
  "timestamp": 1234567890,
  "simulatedTime": 123.45
}
```

#### Get sensor value
```
GET /api/sensors/:id
```

### Actuators

#### List all actuators
```
GET /api/actuators
```

#### Send actuator command
```
POST /api/actuators/:id
```

Request body:
```json
{
  "state": true,      // true = on, false = off
  "intensity": 75     // Optional: for lights (0-100%)
}
```

### Simulation Control

#### Get simulation status
```
GET /api/simulation/status
```

Response:
```json
{
  "success": true,
  "data": {
    "running": true,
    "paused": false,
    "simulatedTime": 123.45,
    "realTime": 12.34,
    "timeAcceleration": 10
  }
}
```

#### Start simulation
```
POST /api/simulation/start
```

#### Stop simulation
```
POST /api/simulation/stop
```

#### Pause simulation
```
POST /api/simulation/pause
```

#### Resume simulation
```
POST /api/simulation/resume
```

#### Set time acceleration
```
POST /api/simulation/time-acceleration
```

Request body:
```json
{
  "factor": 10    // 1-1000x
}
```

### Scenarios

#### Load scenario
```
POST /api/scenario
```

Request body:
```json
{
  "filepath": "./examples/scenarios/ph-adjustment.json"
}
```

### State Persistence

#### Save state
```
POST /api/state/save
```

Request body:
```json
{
  "filepath": "./saved-state.json"
}
```

#### Load state
```
POST /api/state/load
```

Request body:
```json
{
  "filepath": "./saved-state.json"
}
```

## Gladys Integration

The simulator exposes all sensors and actuators as Gladys-compatible devices. Use the `GladysIntegrationAdapter` to discover devices and interact with them through the Gladys device API.

```typescript
import { GladysIntegrationAdapter } from './integration/gladys-integration-adapter';

// Discover all devices
const devices = gladysAdapter.discoverDevices();

// Get sensor value
const phValue = gladysAdapter.getSensorValue('gladys-sensor-ph-sensor-1');

// Send actuator command
gladysAdapter.sendActuatorCommand('gladys-actuator-water-pump-1', {
  actuatorId: 'water-pump-1',
  action: 'on',
  value: 1,
  timestamp: Date.now()
});
```

### Gladys Dashboard

A complete, ready-to-use dashboard is included for monitoring and controlling the hydroponic system:

- **Location**: `examples/gladys-dashboard-example.html` or `http://localhost:3000/dashboard`
- **Features**: Real-time sensor monitoring, actuator controls, alerts, simulation controls
- **Integration Guide**: See `examples/DASHBOARD_INTEGRATION.md` for detailed setup instructions

Access the dashboard:
```bash
# Start the simulation first
npm start

# Then open in your browser
http://localhost:3000/dashboard
```

The dashboard provides:
- Visual sensor readings with color-coded optimal ranges
- Toggle switches for all actuators
- Automatic alerts for out-of-range values
- Simulation control (start, pause, stop, time acceleration)
- Responsive design for desktop and mobile

#### Dashboard Logic & Data Flow

The dashboard operates on a real-time polling mechanism that continuously synchronizes with the simulation API:

**Update Cycle (Every 2 seconds):**
1. **Fetch Data** - Retrieves all sensor values and simulation status from the API
2. **Process Values** - Rounds decimals and calculates visualization metrics
3. **Determine Health Status** - Compares values against optimal ranges
4. **Update UI** - Displays values with color-coded indicators (green/yellow/red)
5. **Check Alerts** - Triggers warnings for out-of-range conditions

**Color-Coded Health Indicators:**
- **Green (✓)** - Value is within optimal range
- **Yellow (⚠️)** - Value is slightly off (80%-120% of optimal threshold)
- **Red (🚨)** - Value is critically off (<80% or >120% of optimal threshold)

**Sensor Thresholds:**
- **pH**: Optimal 5.5-6.5 | Warning 4.4-7.8 | Critical <4.4 or >7.8
- **EC**: Optimal 1.5-2.5 mS/cm | Warning 1.2-3.0 | Critical <1.2 or >3.0
- **Temperature**: Optimal 18-24°C | Warning 14-28 | Critical <14 or >28
- **Water Level**: Minimum 20% | Warning <40% | Critical <20%

**User Interactions:**
- **Actuator Controls** - Toggle switches send `POST /api/actuators/{id}` commands
- **Simulation Controls** - Start/pause/stop buttons control simulation state
- **Time Acceleration** - Slider adjusts simulation speed (1-100x)
- **Scenario Loading** - Load predefined test scenarios with initial conditions

**Data Flow:**
```
Browser Dashboard (every 2 seconds)
    ↓
Fetch API Data (4 sensors + simulation status)
    ↓
Process & Calculate (round values, determine colors)
    ↓
Update UI (display values, update bars, show alerts)
    ↓
User Interaction (toggle actuators, control simulation)
    ↓
Send Commands to API
```

This architecture enables real-time monitoring without requiring WebSocket connections, making the dashboard lightweight and easy to integrate with any HTTP-based API.

## Testing

### Test Coverage

The project maintains **100% code coverage** across all metrics with **1022+ tests**:

| Metric | Coverage | Tests |
|--------|----------|-------|
| Statements | 100% | 1022+ |
| Branches | 100% | |
| Functions | 100% | |
| Lines | 100% | |

**Coverage by Module**:
- Core (simulation-core, time-manager, event-logger, state-persistence): 100%
- Sensors (pH, EC, temperature, water level): 100%
- Actuators (pump, light, valve): 100%
- Physics (hydroponic model, chemistry model): 100%
- API (REST API server): 100%
- Configuration (loader, scenario loader): 100%
- Integration (Gladys adapter): 100%
- Utils (noise generator, schema validator): 100%

### Run all tests

```bash
npm test
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Test Types

- **Unit Tests**: Test individual components and functions
- **Property-Based Tests**: Test universal properties across all inputs using fast-check
- **Integration Tests**: Test complete workflows and component interactions

### Coverage Guide

For detailed information on test patterns, coverage metrics, and best practices, see [TESTING.md](TESTING.md#coverage-guide).

## Time Acceleration

Speed up simulations for rapid testing of long-duration scenarios:

```bash
# Set 10x acceleration via API
curl -X POST http://localhost:3000/api/simulation/time-acceleration \
  -H "Content-Type: application/json" \
  -d '{"factor": 10}'
```

Time acceleration affects all time-dependent behaviors:
- Sensor drift
- Evaporation and plant uptake
- Temperature changes
- pH drift
- Actuator effects

## Logging

Logs are written to the configured file path with automatic rotation. Log levels:

- **debug**: Detailed information for debugging
- **info**: General informational messages
- **warning**: Warning messages for potential issues
- **error**: Error messages for failures

View logs:
```bash
tail -f logs/simulation.log
```

## Project Structure

```
src/
├── main.ts         # Main application entry point
├── index.ts        # Library exports
├── types.ts        # TypeScript type definitions
├── core/           # Simulation engine core
│   ├── simulation-core.ts
│   ├── time-manager.ts
│   ├── event-logger.ts
│   └── state-persistence.ts
├── sensors/        # Sensor implementations
│   ├── ph-sensor.ts
│   ├── ec-sensor.ts
│   ├── temperature-sensor.ts
│   └── water-level-sensor.ts
├── actuators/      # Actuator implementations
│   ├── pump-actuator.ts
│   ├── light-actuator.ts
│   └── valve-actuator.ts
├── physics/        # Physics and chemistry models
│   ├── hydroponic-physics-model.ts
│   └── chemistry-model.ts
├── integration/    # Gladys integration adapter
│   └── gladys-integration-adapter.ts
├── api/            # REST API server
│   └── rest-api-server.ts
├── config/         # Configuration management
│   ├── configuration-loader.ts
│   └── scenario-loader.ts
├── schemas/        # JSON schemas
│   └── schemas.ts
└── utils/          # Utility functions
    ├── noise-generator.ts
    └── schema-validator.ts

tests/
├── unit/           # Unit tests
├── property/       # Property-based tests
├── integration/    # Integration tests
└── fixtures/       # Test data and scenarios

examples/
├── default-config.json
└── scenarios/
    ├── basic-test.json
    ├── ph-adjustment.json
    └── failure-test.json
```

## Troubleshooting

### Port already in use

If port 3000 is already in use, specify a different port:

```bash
node dist/main.js --port 8080
```

### Configuration file not found

Ensure the configuration file path is correct:

```bash
node dist/main.js --config ./path/to/config.json
```

### Sensor values out of range

Check your configuration for valid baseline values:
- pH: 0.0-14.0
- EC: 0.0-5.0 mS/cm
- Temperature: 0.0-50.0°C
- Water Level: 0.0-100.0%

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a pull request:

```bash
npm test
```

### Integration Opportunities

This project is designed to integrate with the Gladys Assistant ecosystem:

- **Dashboard Integration**: See `examples/DASHBOARD_INTEGRATION.md` for adding the web dashboard to Gladys
- **MCP Integration**: See `docs/MCP_INTEGRATION.md` for AI assistant integration via Model Context Protocol
- **Custom Scenes**: Use the REST API to create Gladys automation scenes
- **Device Integration**: Use `GladysIntegrationAdapter` to expose simulation devices in Gladys

We welcome contributions that enhance Gladys integration!

## License

MIT
