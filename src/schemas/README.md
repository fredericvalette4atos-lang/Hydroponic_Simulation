# JSON Schemas

This directory contains JSON Schema definitions for validating configuration, scenarios, and state persistence in the hydroponic test simulation system.

## Schemas

### config.schema.json

Validates simulation configuration files that define:
- **Reservoir**: Capacity and initial water level
- **Sensors**: Configuration for pH, EC, temperature, and water level sensors
- **Actuators**: Configuration for pumps, lights, and valves
- **Physics**: Parameters for evaporation, plant uptake, temperature drift, etc.
- **Simulation**: Tick rate and time acceleration (optional)
- **Logging**: Log level, file path, and rotation policy (optional)

**Example:**
```json
{
  "reservoir": {
    "capacity": 100,
    "initialWaterLevel": 80
  },
  "sensors": {
    "ph": {
      "id": "ph-sensor-1",
      "baseline": 6.5,
      "noiseStdDev": 0.1
    }
  },
  "actuators": {
    "pumps": [
      {
        "id": "water-pump-1",
        "type": "water",
        "flowRate": 1.0,
        "failureProbability": 0.01
      }
    ]
  },
  "physics": {
    "evaporationRate": 0.1,
    "plantUptakeRate": 0.2,
    "nutrientUptakeRate": 5.0,
    "ambientTemperature": 20,
    "temperatureDriftRate": 0.5,
    "phDriftRate": 0.1
  }
}
```

### scenario.schema.json

Validates test scenario files that define:
- **Name**: Scenario identifier
- **Description**: Human-readable description (optional)
- **Initial State**: Starting values for pH, EC, temperature, and water level
- **Events**: Timed events (actuator commands, parameter changes, disturbances)
- **Failures**: Scheduled actuator failures (optional)

**Example:**
```json
{
  "name": "Basic Test",
  "description": "Simple test scenario",
  "initialState": {
    "ph": 6.5,
    "ec": 1.5,
    "temperature": 22,
    "waterLevel": 80
  },
  "events": [
    {
      "time": 10,
      "type": "actuator_command",
      "target": "water-pump-1",
      "value": { "active": true }
    }
  ],
  "failures": [
    {
      "actuatorId": "water-pump-1",
      "failureTime": 30,
      "duration": 60
    }
  ]
}
```

### state.schema.json

Validates simulation state files for persistence that include:
- **Version**: State format version (semantic versioning)
- **Timestamp**: Real-world timestamp when saved
- **Simulated Time**: Simulated time in seconds
- **Sensors**: Map of sensor IDs to sensor states
- **Actuators**: Map of actuator IDs to actuator states
- **Hydroponic State**: Complete physics state (water volume, pH, EC, etc.)
- **Config**: Simulation configuration

**Example:**
```json
{
  "version": "1.0.0",
  "timestamp": 1234567890000,
  "simulatedTime": 1000,
  "sensors": {
    "ph-sensor-1": {
      "type": "ph",
      "baseline": 6.5,
      "currentValue": 6.4,
      "noiseStdDev": 0.1
    }
  },
  "actuators": {
    "water-pump-1": {
      "type": "pump",
      "state": {
        "active": true,
        "timestamp": 1234567890000
      },
      "totalRuntime": 500,
      "failed": false
    }
  },
  "hydroponicState": {
    "waterVolume": 80,
    "waterLevel": 80,
    "temperature": 22,
    "ph": 6.5,
    "ec": 1.5,
    "nutrientConcentration": 1000,
    "ambientTemperature": 20,
    "simulatedTime": 1000
  },
  "config": { ... }
}
```

## Usage

The schemas are used by the `SchemaValidator` class in `src/utils/schema-validator.ts`:

```typescript
import { schemaValidator } from './utils/schema-validator';

// Validate configuration
try {
  schemaValidator.validateConfiguration(configData);
  console.log('Configuration is valid');
} catch (error) {
  console.error('Validation failed:', error.getDetailedMessage());
}

// Check validity without throwing
if (schemaValidator.isValidTestScenario(scenarioData)) {
  console.log('Scenario is valid');
}
```

## Validation Requirements

All schemas follow JSON Schema Draft 07 specification and enforce:
- **Type checking**: Ensures correct data types
- **Range validation**: Enforces min/max values (e.g., pH 0-14, water level 0-100%)
- **Required fields**: Validates presence of mandatory properties
- **Pattern matching**: Validates formats (e.g., semantic versioning)
- **Enum validation**: Restricts values to allowed options

## Related Files

- `src/utils/schema-validator.ts` - Validation implementation using AJV
- `tests/unit/utils/schema-validator.test.ts` - Unit tests for validation
- `tests/fixtures/configurations/` - Example configuration files
- `tests/fixtures/scenarios/` - Example scenario files

## Requirements Validation

These schemas validate:
- **Requirement 8.3**: Test scenario validation against defined schema
- **Requirement 11.2**: Configuration validation against defined schema
- **Requirement 12.3**: State file validation against defined schema
