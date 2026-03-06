# Test Scenario Examples

This directory contains example test scenario files for the Hydroponic Test Simulation system.

## Scenario File Format

Test scenarios are defined in JSON format and must conform to the scenario schema defined in `src/schemas/scenario.schema.json`.

### Required Fields

- **name** (string): Scenario name
- **description** (string): Scenario description
- **initialState** (object): Initial sensor values
  - **ph** (number, 0-14): Initial pH value
  - **ec** (number, 0-5): Initial EC value in mS/cm
  - **temperature** (number, 0-50): Initial temperature in °C
  - **waterLevel** (number, 0-100): Initial water level as percentage
- **events** (array): Scheduled events (can be empty)

### Optional Fields

- **failures** (array): Actuator failure conditions

### Event Types

Events can be one of three types:

1. **actuator_command**: Send a command to an actuator
   - `target`: Actuator ID
   - `value`: Command parameters (active, duration, intensity, etc.)

2. **parameter_change**: Change a simulation parameter
   - `target`: Parameter name
   - `value`: New parameter value

3. **disturbance**: Apply a disturbance to a sensor
   - `target`: Sensor ID
   - `value`: Disturbance magnitude

## Example Scenarios

### basic-test.json

A simple scenario demonstrating:
- Initial state configuration
- Actuator commands at scheduled times
- Parameter changes

Use this as a starting point for creating custom scenarios.

### failure-test.json

Demonstrates actuator failure simulation:
- Multiple actuators operating
- Scheduled failures with specific durations
- Testing system behavior during failures

Use this to test error handling and recovery mechanisms.

### ph-adjustment.json

Demonstrates pH control:
- Starting with high pH (7.5)
- Multiple pH down pump activations
- Disturbance injection to test control response

Use this to test pH control algorithms and sensor response.

### comprehensive-test.json

A complete demonstration of all simulator features:
- Light control with intensity adjustment
- Water addition and drainage
- Nutrient dosing
- pH adjustment
- Ambient temperature changes
- Actuator failure simulation
- Multiple coordinated operations

Use this to test complete system integration and verify all features work together correctly. This scenario runs for 300 simulated seconds and exercises all major components.

## Loading Scenarios

Scenarios can be loaded using the ScenarioLoader class:

```typescript
import { ScenarioLoader } from './src/config/scenario-loader';

const loader = new ScenarioLoader();
const scenario = loader.loadFromFile('examples/scenarios/basic-test.json');

// Apply to simulation core
loader.applyScenario(simCore, scenario);
```

## Creating Custom Scenarios

1. Copy one of the example files
2. Modify the initial state values
3. Add or remove events as needed
4. Optionally add failure conditions
5. Validate using the schema before loading

## Validation

All scenario files are validated against the JSON schema. Common validation errors:

- **pH out of range**: Must be 0-14
- **EC out of range**: Must be 0-5 mS/cm
- **Temperature out of range**: Must be 0-50°C
- **Water level out of range**: Must be 0-100%
- **Negative event time**: Event times must be >= 0
- **Invalid event type**: Must be 'actuator_command', 'parameter_change', or 'disturbance'
- **Missing required fields**: name, description, initialState, and events are required

## Tips

- Keep event times in ascending order for clarity
- Use descriptive target names that match your actuator/sensor IDs
- Test scenarios incrementally (start simple, add complexity)
- Document the expected behavior in the description field
- Use failures sparingly to test specific error conditions
