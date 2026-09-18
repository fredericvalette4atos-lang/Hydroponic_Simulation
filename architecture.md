# Hydroponic Test Simulation — Architecture

## 1. Purpose and scope

Hydroponic Test Simulation is a TypeScript-based simulator for testing hydroponic monitoring and control workflows, including integration with the Gladys home-automation ecosystem.

The application models a hydroponic installation in simulated time and exposes its state through a REST API. It provides:

- configurable sensors for pH, electrical conductivity (EC), temperature, and water level;
- controllable pumps, lights, and valves;
- hydroponic physics and water-chemistry calculations;
- accelerated time for long-running scenarios;
- scenario loading and state persistence;
- Gladys-compatible device discovery and commands;
- Swagger/OpenAPI documentation;
- a browser dashboard and interface test scripts.

The repository also contains `Hydro_Model.jsx`, an interactive dependency-graph prototype. It visualizes relationships between temperature, pH, EC, water level, CO₂, nutrient availability, and plant uptake. The production simulator described below is implemented under `src/`.

## 2. Architectural style

The project follows a modular, layered architecture centered on a deterministic simulation core:

```text
External clients
    │
    ├── Gladys integration adapter
    ├── Dashboard / browser clients
    ├── CLI and automated test clients
    └── Scenario and control scripts
    │
    ▼
REST API + OpenAPI/Swagger
    │
    ▼
Simulation core
    ├── Time management
    ├── Event logging
    ├── State persistence
    └── Simulation orchestration
    │
    ├── Sensors
    ├── Actuators
    └── Physics and chemistry models
    │
    ▼
Validated configuration, scenarios, and simulated state
```

The layers communicate through TypeScript types and domain objects rather than through a database or message broker. Runtime state is held in memory and can be serialized to JSON when persistence is requested.

## 3. Runtime components

### 3.1 Application entry point

- **`src/main.ts`** is the executable entry point.
- It loads command-line options and configuration, constructs the simulation components, starts the simulation lifecycle, and starts the HTTP server.
- The compiled executable is `dist/main.js` and is exposed through the `hydroponic-sim` package binary.

### 3.2 Simulation core

The core coordinates the simulation and is the main application boundary for the domain model.

- **`src/core/simulation-core.ts`** orchestrates ticks, state transitions, sensors, actuators, physics, scenarios, and lifecycle operations such as start, stop, pause, and resume.
- **`src/core/time-manager.ts`** translates real elapsed time into simulated time and applies the configured acceleration factor.
- **`src/core/event-logger.ts`** records simulation events and operational messages using the configured logging policy.
- **`src/core/state-persistence.ts`** serializes and restores simulator state from JSON files.

A simulation tick applies actuator effects and environmental changes, advances simulated time, recalculates the physical state, and updates sensor readings. The time manager allows the same model to run at normal speed or at an accelerated rate of up to 1000×, according to configuration.

### 3.3 Physics and chemistry

The physics layer represents the system dynamics independently of HTTP and presentation concerns.

- **`src/physics/hydroponic-physics-model.ts`** models time-dependent effects such as evaporation, plant water uptake, temperature drift, and actuator influence.
- **`src/physics/chemistry-model.ts`** models pH, nutrient concentration, EC, buffering, and related chemical relationships.

The models consume configuration and current actuator state, then produce updated physical values. Keeping these calculations separate from sensors means that sensor noise and drift can be tested independently from the underlying simulated environment.

### 3.4 Sensors

The sensor layer exposes simulated measurements to the rest of the system. It includes implementations for:

- pH;
- EC;
- temperature;
- water level.

Sensors are configured with baseline values and can apply measurement noise and drift. Their public representation contains an identifier, sensor type, value, unit, and timing metadata as appropriate.

### 3.5 Actuators

The actuator layer represents controllable equipment:

- pumps for water, nutrients, and pH adjustment;
- grow lights;
- valves.

Actuators validate commands, maintain their current state, and apply their configured effects to the next simulation updates. Failure probabilities and failure scenarios allow integrations to be tested against unavailable or malfunctioning equipment.

### 3.6 REST API

- **`src/api/rest-api-server.ts`** exposes HTTP endpoints for sensors, actuators, simulation lifecycle, configuration, scenarios, and state persistence.
- **`src/api/swagger.ts`** generates the OpenAPI description and serves Swagger UI.

The API is intended to be stateless at the request level: each request reads or changes the in-memory simulation managed by the core. Responses use a consistent JSON structure with success indicators, data, timestamps, and error information where applicable.

Important endpoint groups include:

| Area | Representative endpoints | Responsibility |
|---|---|---|
| Sensors | `GET /api/sensors`, `GET /api/sensors/:id` | Read current simulated measurements |
| Actuators | `GET /api/actuators`, `POST /api/actuators/:id` | Inspect equipment and send commands |
| Simulation | `/api/simulation/status`, `/start`, `/stop`, `/pause`, `/resume` | Control simulation lifecycle |
| Time | `POST /api/simulation/time-acceleration` | Change simulated-time speed |
| Configuration | `GET/POST /api/config` and section routes | Read or update configuration |
| Scenarios | `POST /api/scenario` | Load reproducible test scenarios |
| Persistence | `POST /api/state/save`, `/api/state/load` | Save or restore state |

The default server port is `3000`. Swagger UI is available at `/api-docs` and the machine-readable OpenAPI document at `/api-docs.json`.

### 3.7 Gladys integration

- **`src/integration/gladys-integration-adapter.ts`** maps simulator sensors and actuators to Gladys-compatible devices.
- It provides device discovery, sensor-value access, and actuator-command translation without coupling the simulation core to Gladys-specific transport concerns.

This adapter is an anti-corruption boundary: Gladys device identifiers and command formats are translated into the simulator's internal sensor and actuator abstractions.

## 4. Configuration and data flow

Configuration is loaded from JSON and validated before it is used by the simulator.

- **`src/config/configuration-loader.ts`** loads and merges configuration.
- **`src/config/scenario-loader.ts`** loads initial conditions, timed events, and failure definitions.
- **`src/schemas/`** contains the schemas used to describe valid configuration and scenario structures.
- **`src/utils/schema-validator.ts`** performs schema validation with AJV.
- **`src/utils/noise-generator.ts`** supplies configurable sensor noise.

The main configuration sections are:

```text
reservoir     → capacity and initial water level
sensors       → baselines, noise, drift, identifiers
actuators     → pumps, lights, valves, rates, failure behavior
physics       → evaporation, uptake, temperature, pH, buffering
simulation    → tick rate and time acceleration
logging       → level, output path, and rotation policy
```

### Normal simulation flow

1. The application loads and validates configuration.
2. The core initializes the physical state, sensors, and actuators.
3. The time manager schedules simulation ticks.
4. Actuator commands and scenario events are applied.
5. Physics and chemistry models calculate the next state.
6. Sensors derive readings, including configured noise and drift.
7. Events are logged and the state remains available to API clients.
8. Clients poll the REST API or use the Gladys adapter to observe and control the system.

### Control-command flow

```text
Client
  │ POST /api/actuators/:id
  ▼
REST API validation
  ▼
Actuator registry / simulation core
  ▼
Updated actuator state
  ▼
Next simulation tick
  ▼
Physics + chemistry recalculation
  ▼
Sensor readings and API responses
```

## 5. Scenario execution and persistence

A scenario is a reproducible test definition containing:

- a name and description;
- initial sensor or environmental values;
- events scheduled at simulated times;
- optional actuator failure windows.

The scenario loader passes these definitions to the simulation core. Because events are expressed in simulated time, the same scenario can be run at different acceleration factors without changing its logical behavior.

State persistence writes the current simulation state to JSON. Loading a state restores the state needed to continue a test, including simulated time, equipment state, sensor values, and relevant runtime configuration.

## 6. User interfaces and clients

### Dashboard

The example dashboard communicates with the REST API using HTTP polling. Its typical update cycle is:

1. fetch sensor values and simulation status;
2. calculate display and health indicators;
3. render readings and alerts;
4. send actuator or simulation-control commands in response to user actions.

This deliberately avoids requiring a WebSocket server and keeps the dashboard compatible with any HTTP client.

### Interactive dependency model

`Hydro_Model.jsx` is a separate React-style visualization prototype. It contains:

- parameter definitions and optimal ranges;
- a dependency graph represented by directed edges;
- a local physics calculation function;
- cascade highlighting;
- status indicators and a system-health score;
- an optional AI advisory panel that calls the Anthropic API.

It should be treated as a presentation/prototyping surface rather than as a replacement for the TypeScript simulation engine. If it is integrated into the application, the AI request should be moved behind a server-side API boundary so credentials are not exposed in browser code.

## 7. Repository structure

```text
src/
├── main.ts                         # Executable application entry point
├── index.ts                        # Public library exports
├── types.ts                        # Shared domain types
├── core/                           # Simulation orchestration and lifecycle
│   ├── simulation-core.ts
│   ├── time-manager.ts
│   ├── event-logger.ts
│   └── state-persistence.ts
├── sensors/                        # Sensor implementations
├── actuators/                      # Pump, light, and valve implementations
├── physics/                        # Hydroponic physics and chemistry models
├── integration/                    # Gladys adapter
├── api/                            # Express REST API and Swagger
├── config/                         # Configuration and scenario loading
├── schemas/                        # JSON schemas
└── utils/                          # Validation and noise utilities

tests/
├── unit/                           # Isolated component tests
├── property/                       # fast-check property-based tests
├── integration/                    # Cross-component and API tests
└── fixtures/                       # Reusable test data

examples/                           # Default configuration and scenarios
docs/                               # English and French documentation
scripts/                            # Interface and coverage helper scripts
Hydro_Model.jsx                     # Interactive dependency-model prototype
saved-state.json                    # Example persisted state
```

## 8. Testing architecture

The test suite is organized by scope:

- **Unit tests** verify individual sensors, actuators, models, utilities, and core services.
- **Property-based tests** use `fast-check` to verify invariants across broad input ranges, such as bounded sensor values and valid state transitions.
- **Integration tests** verify workflows spanning the core, API, configuration, persistence, and Gladys adapter.
- **Interface scripts** exercise the running server, web pages, Swagger UI, and public API endpoints.

The standard commands are:

```bash
npm test
npm run test:coverage
npm run test:coverage:validate
```

Jest with `ts-jest` executes TypeScript tests, while `jest.config.js` defines the test and coverage configuration.

## 9. Build and deployment model

The project is packaged as a Node.js application:

```text
TypeScript source → tsc → dist/ → node dist/main.js
```

Development can run directly through `ts-node`:

```bash
npm run start:dev
```

Production-style execution uses the compiled output:

```bash
npm run build
npm start
```

The simulator is self-contained and uses JSON files for configuration, scenarios, and optional state persistence. No external database is required by the documented architecture.

## 10. Design principles and boundaries

1. **Deterministic domain behavior** — simulation calculations are separated from transport and presentation layers.
2. **Replaceable adapters** — REST and Gladys integrations consume the same core abstractions.
3. **Configurable realism** — noise, drift, failures, time acceleration, and physical parameters are explicit configuration concerns.
4. **Reproducible testing** — scenarios and persisted state make complex sequences repeatable.
5. **Validated inputs** — configuration, commands, and scenario data are checked at boundaries.
6. **Observable execution** — event logging and API status endpoints expose what the simulator is doing.
7. **No browser secrets** — external AI or third-party credentials should be handled server-side when the prototype advisory feature is productionized.

## 11. Known architectural considerations

- The repository contains both the TypeScript simulator and the standalone `Hydro_Model.jsx` visualization. Their models should be kept synchronized or explicitly documented as separate representations.
- The dashboard uses polling, which is simple and robust but may introduce latency and repeated requests under high client counts.
- In-memory runtime state is appropriate for a test simulator; a production deployment requiring horizontal scaling would need shared state or session ownership.
- The AI advisory prototype directly calls an external API from UI code. A production implementation should add a backend proxy, authentication, rate limiting, timeout handling, and secret management.
