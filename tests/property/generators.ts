/**
 * Custom fast-check generators for property-based testing
 * 
 * This module provides reusable arbitrary generators for all domain-specific
 * types used in the hydroponic test simulation system.
 */

import * as fc from 'fast-check';
import {
  SensorReading,
  ActuatorState,
  HydroponicState,
  SimulationConfig,
  TestScenario,
  ScenarioEvent,
  ScenarioFailure,
  ActuatorCommand
} from '../../src/types';

/**
 * Generate valid pH values (0.0-14.0)
 */
export const arbPH = fc.double({ min: 0.0, max: 14.0, noNaN: true });

/**
 * Generate valid EC values (0.0-5.0 mS/cm)
 */
export const arbEC = fc.double({ min: 0.0, max: 5.0, noNaN: true });

/**
 * Generate valid temperature values (0.0-50.0°C)
 */
export const arbTemperature = fc.double({ min: 0.0, max: 50.0, noNaN: true });

/**
 * Generate valid water level percentages (0.0-100.0%)
 */
export const arbWaterLevel = fc.double({ min: 0.0, max: 100.0, noNaN: true });

/**
 * Generate valid nutrient concentration (0-2000 PPM)
 */
export const arbNutrientConcentration = fc.double({ min: 0, max: 2000, noNaN: true });

/**
 * Generate valid water volume (0-capacity liters)
 */
export const arbWaterVolume = (capacity: number) =>
  fc.double({ min: 0, max: capacity, noNaN: true });

/**
 * Generate valid time acceleration factors (1-1000)
 */
export const arbTimeAcceleration = fc.integer({ min: 1, max: 1000 });

/**
 * Generate valid light intensity (0-100%)
 */
export const arbLightIntensity = fc.integer({ min: 0, max: 100 });

/**
 * Generate valid sensor IDs
 */
export const arbSensorId = fc.oneof(
  fc.constant('ph-sensor-1'),
  fc.constant('ec-sensor-1'),
  fc.constant('temp-sensor-1'),
  fc.constant('water-level-sensor-1'),
  fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
);

/**
 * Generate valid actuator IDs
 */
export const arbActuatorId = fc.oneof(
  fc.constant('water-pump-1'),
  fc.constant('nutrient-pump-1'),
  fc.constant('ph-up-pump-1'),
  fc.constant('ph-down-pump-1'),
  fc.constant('grow-light-1'),
  fc.constant('drain-valve-1'),
  fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
);

/**
 * Generate sensor readings with all fields
 */
export const arbSensorReading = fc.record<SensorReading>({
  sensorId: arbSensorId,
  value: fc.double({ min: 0, max: 100, noNaN: true }),
  timestamp: fc.integer({ min: 0, max: Date.now() }),
  unit: fc.constantFrom('pH', 'mS/cm', '°C', '%')
});

/**
 * Generate actuator states
 */
export const arbActuatorState = fc.record<ActuatorState>({
  active: fc.boolean(),
  intensity: fc.option(arbLightIntensity, { nil: undefined }),
  timestamp: fc.integer({ min: 0, max: Date.now() })
});

/**
 * Generate hydroponic system states
 */
export const arbHydroponicState = fc.record<HydroponicState>({
  ph: arbPH,
  ec: arbEC,
  temperature: arbTemperature,
  waterLevel: arbWaterLevel,
  waterVolume: fc.double({ min: 0, max: 100, noNaN: true }),
  nutrientConcentration: arbNutrientConcentration,
  simulatedTime: fc.double({ min: 0, max: 1000000, noNaN: true })
});

/**
 * Generate actuator commands
 */
export const arbActuatorCommand = fc.record<ActuatorCommand>({
  actuatorId: arbActuatorId,
  action: fc.constantFrom('on', 'off', 'set_intensity'),
  value: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
  timestamp: fc.integer({ min: 0, max: Date.now() })
});

/**
 * Generate scenario events
 */
export const arbScenarioEvent = fc.record<ScenarioEvent>({
  time: fc.double({ min: 0, max: 10000, noNaN: true }),
  type: fc.constantFrom('actuator_command', 'parameter_change', 'disturbance'),
  target: fc.oneof(arbActuatorId, fc.constant('ambientTemperature'), fc.constant('ph')),
  value: fc.anything()
});

/**
 * Generate scenario failures
 */
export const arbScenarioFailure = fc.record<ScenarioFailure>({
  actuatorId: arbActuatorId,
  failureTime: fc.double({ min: 0, max: 10000, noNaN: true }),
  duration: fc.double({ min: 1, max: 1000, noNaN: true })
});

/**
 * Generate test scenarios
 */
export const arbTestScenario = fc.record<TestScenario>({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  initialState: fc.record({
    ph: arbPH,
    ec: arbEC,
    temperature: arbTemperature,
    waterLevel: arbWaterLevel
  }),
  events: fc.option(fc.array(arbScenarioEvent, { maxLength: 10 }), { nil: undefined }),
  failures: fc.option(fc.array(arbScenarioFailure, { maxLength: 5 }), { nil: undefined })
});

/**
 * Generate simulation configurations (simplified)
 */
export const arbSimulationConfig = fc.record<Partial<SimulationConfig>>({
  reservoir: fc.record({
    capacity: fc.double({ min: 10, max: 200, noNaN: true }),
    initialWaterLevel: arbWaterLevel
  }),
  simulation: fc.record({
    tickRate: fc.integer({ min: 1, max: 100 }),
    timeAcceleration: arbTimeAcceleration
  }),
  physics: fc.record({
    evaporationRate: fc.double({ min: 0, max: 1, noNaN: true }),
    plantUptakeRate: fc.double({ min: 0, max: 1, noNaN: true }),
    nutrientUptakeRate: fc.double({ min: 0, max: 50, noNaN: true }),
    ambientTemperature: arbTemperature,
    temperatureDriftRate: fc.double({ min: 0, max: 2, noNaN: true }),
    phDriftRate: fc.double({ min: 0, max: 0.5, noNaN: true }),
    bufferCapacity: fc.double({ min: 0, max: 1, noNaN: true })
  })
});

/**
 * Generate flow rates for pumps/valves (0.1-10.0 L/h)
 */
export const arbFlowRate = fc.double({ min: 0.1, max: 10.0, noNaN: true });

/**
 * Generate failure probabilities (0.0-0.1)
 */
export const arbFailureProbability = fc.double({ min: 0.0, max: 0.1, noNaN: true });

/**
 * Generate noise standard deviations
 */
export const arbNoiseStdDev = fc.double({ min: 0.0, max: 5.0, noNaN: true });

/**
 * Generate drift rates
 */
export const arbDriftRate = fc.double({ min: 0.0, max: 1.0, noNaN: true });

/**
 * Generate time deltas (seconds)
 */
export const arbTimeDelta = fc.double({ min: 0.001, max: 3600, noNaN: true });

/**
 * Generate durations (seconds)
 */
export const arbDuration = fc.double({ min: 0, max: 86400, noNaN: true });

/**
 * Generate log levels
 */
export const arbLogLevel = fc.constantFrom('DEBUG', 'INFO', 'WARNING', 'ERROR');

/**
 * Generate file paths
 */
export const arbFilePath = fc.string({ minLength: 1, maxLength: 100 }).map(s => 
  s.replace(/[<>:"|?*]/g, '_') // Remove invalid filename characters
);

/**
 * Generate timestamps (milliseconds since epoch)
 */
export const arbTimestamp = fc.integer({ min: 0, max: Date.now() + 86400000 });

/**
 * Generate positive integers
 */
export const arbPositiveInt = fc.integer({ min: 1, max: 1000000 });

/**
 * Generate positive doubles
 */
export const arbPositiveDouble = fc.double({ min: 0.001, max: 1000000, noNaN: true });
