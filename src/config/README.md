# Configuration Module

This module provides configuration loading and validation for the Hydroponic Test Simulation system.

## ConfigurationLoader

The `ConfigurationLoader` class handles loading simulation configuration from JSON files, validating against the JSON schema, and applying sensible defaults for optional parameters.

### Features

- **JSON File Loading**: Reads and parses configuration from JSON files
- **Schema Validation**: Validates configuration against JSON Schema using AJV
- **Default Values**: Automatically applies sensible defaults for optional parameters
- **Descriptive Errors**: Provides detailed error messages for validation failures

### Usage

```typescript
import { ConfigurationLoader } from './config';

const loader = new ConfigurationLoader();

try {
  const config = loader.loadFromFile('./config/my-config.json');
  console.log('Configuration loaded successfully:', config);
} catch (error) {
  console.error('Failed to load configuration:', error.message);
}
```

### Configuration File Format

See `examples/default-config.json` for a complete example. The configuration file must include:

**Required Fields:**
- `reservoir`: Reservoir capacity and initial water level
- `sensors`: Configuration for pH, EC, temperature, and water level sensors
- `actuators`: Arrays of pumps, lights, and valves
- `physics`: Physics simulation parameters

**Optional Fields:**
- `simulation`: Tick rate and time acceleration (defaults applied if omitted)
- `logging`: Log level, file path, and rotation policy (defaults applied if omitted)

### Default Values

The following defaults are applied for optional parameters:

```typescript
{
  simulation: {
    tickRate: 10,           // 10 updates per second
    timeAcceleration: 1     // Real-time
  },
  logging: {
    level: 'info',
    filepath: './logs/simulation.log',
    rotationPolicy: 'daily'
  },
  physics: {
    evaporationRate: 0.1,
    plantUptakeRate: 0.05,
    nutrientUptakeRate: 5,
    ambientTemperature: 22,
    temperatureDriftRate: 0.5,
    phDriftRate: 0.1,
    bufferCapacity: 0.3
  }
}
```

Sensor defaults:
```typescript
{
  noiseStdDev: 0.05,
  driftRate: 0.0
}
```

### Error Handling

The `ConfigurationLoader` provides descriptive error messages for common issues:

- **File not found**: Clear message indicating the missing file path
- **Invalid JSON**: Syntax error details from JSON parser
- **Schema validation failures**: Detailed field-level validation errors with hints
- **Permission errors**: Clear indication of file access issues

Example error output:
```
Configuration validation failed for file './config/invalid.json':
Configuration validation failed:
  /reservoir: must have required property 'initialWaterLevel' (missing required field: initialWaterLevel)
  /sensors/ph/baseline: must be number (expected number)
  /physics/evaporationRate: must be >= 0 (must be >= 0)
```

### Methods

#### `loadFromFile(filepath: string): SimulationConfig`

Loads configuration from a JSON file, validates it, and applies defaults.

**Parameters:**
- `filepath`: Path to the configuration JSON file

**Returns:** Complete `SimulationConfig` object with defaults applied

**Throws:**
- `Error` if file cannot be read or parsed
- `SchemaValidationError` if configuration is invalid

#### `validate(config: unknown): asserts config is SimulationConfig`

Validates a configuration object against the JSON schema.

**Parameters:**
- `config`: Configuration object to validate

**Throws:** `SchemaValidationError` if validation fails

#### `applyDefaults(config: Partial<SimulationConfig>): SimulationConfig`

Applies default values for optional parameters.

**Parameters:**
- `config`: Partial configuration object

**Returns:** Complete configuration with defaults applied

### Validation Rules

The configuration is validated against `src/schemas/config.schema.json`. Key validation rules:

- **Reservoir capacity**: Must be >= 0
- **Initial water level**: Must be 0-100 (percentage)
- **Sensor IDs**: Must be non-empty strings
- **Sensor baselines**: Must be numbers
- **Actuator failure probability**: Must be 0.0-1.0
- **Physics rates**: Must be >= 0
- **Time acceleration**: Must be 1-1000
- **Log level**: Must be one of: debug, info, warning, error
- **Rotation policy**: Must be one of: daily, size

### Requirements Validated

This implementation validates:
- **Requirement 11.1**: Load configuration from JSON file
- **Requirement 11.2**: Validate configuration against schema
- **Requirement 11.3**: Return descriptive error messages for invalid configuration
- **Requirement 11.5**: Provide default values for optional parameters
