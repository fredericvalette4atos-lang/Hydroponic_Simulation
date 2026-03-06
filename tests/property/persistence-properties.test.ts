/**
 * Property-Based Tests for Data Model Serialization
 * 
 * Tests universal properties of serialization/deserialization for data models.
 * These tests verify that data can be serialized to JSON and deserialized back
 * without data loss (round-trip property).
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 8.1, 11.1, 12.1, 12.5
 */

import * as fc from 'fast-check';
import { 
  TestScenario, 
  SimulationConfig, 
  SimulationState,
  LogLevel,
  SensorType,
  ActuatorType,
  ActuatorState
} from '../../src/types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid pH values (0-14)
 * Filter out NaN and Infinity as they don't serialize properly to JSON
 */
const arbPH = fc.float({ min: 0.0, max: 14.0, noNaN: true });

/**
 * Generate valid EC values (0-5 mS/cm)
 * Filter out NaN and Infinity as they don't serialize properly to JSON
 */
const arbEC = fc.float({ min: 0.0, max: 5.0, noNaN: true });

/**
 * Generate valid temperature values (0-50°C)
 * Filter out NaN and Infinity as they don't serialize properly to JSON
 */
const arbTemperature = fc.float({ min: 0.0, max: 50.0, noNaN: true });

/**
 * Generate valid water level values (0-100%)
 * Filter out NaN and Infinity as they don't serialize properly to JSON
 */
const arbWaterLevel = fc.float({ min: 0.0, max: 100.0, noNaN: true });

/**
 * Generate valid test scenario
 */
const arbTestScenario = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 500 }),
  initialState: fc.record({
    ph: arbPH,
    ec: arbEC,
    temperature: arbTemperature,
    waterLevel: arbWaterLevel
  }),
  events: fc.array(
    fc.record({
      time: fc.float({ min: 0, max: 10000, noNaN: true }),
      type: fc.constantFrom('actuator_command' as const, 'parameter_change' as const, 'disturbance' as const),
      target: fc.string({ minLength: 1, maxLength: 50 }),
      value: fc.oneof(
        fc.boolean(),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 50 })
      )
    }),
    { maxLength: 10 }
  ),
  failures: fc.option(
    fc.array(
      fc.record({
        actuatorId: fc.string({ minLength: 1, maxLength: 50 }),
        failureTime: fc.float({ min: 0, max: 10000, noNaN: true }),
        duration: fc.float({ min: 0, max: 1000, noNaN: true })
      }),
      { maxLength: 5 }
    )
  )
}) as fc.Arbitrary<TestScenario>;

/**
 * Generate valid simulation configuration
 */
const arbSimulationConfig = fc.record({
  reservoir: fc.record({
    capacity: fc.float({ min: 10, max: 1000, noNaN: true }),
    initialWaterLevel: arbWaterLevel
  }),
  sensors: fc.record({
    ph: fc.record({
      id: fc.constant('ph'),
      baseline: arbPH,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(0.1), noNaN: true }),
      driftRate: fc.float({ min: 0, max: Math.fround(0.5), noNaN: true })
    }),
    ec: fc.record({
      id: fc.constant('ec'),
      baseline: arbEC,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(0.05), noNaN: true }),
      driftRate: fc.float({ min: 0, max: Math.fround(0.1), noNaN: true })
    }),
    temperature: fc.record({
      id: fc.constant('temperature'),
      baseline: arbTemperature,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(0.2), noNaN: true }),
      driftRate: fc.float({ min: 0, max: Math.fround(2.0), noNaN: true })
    }),
    waterLevel: fc.record({
      id: fc.constant('water_level'),
      baseline: arbWaterLevel,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(1.0), noNaN: true }),
      driftRate: fc.float({ min: 0, max: Math.fround(5.0), noNaN: true })
    })
  }),
  actuators: fc.record({
    pumps: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 50 }),
        type: fc.constant('pump'),
        flowRate: fc.float({ min: Math.fround(0.1), max: 100, noNaN: true }),
        failureProbability: fc.float({ min: 0, max: 1, noNaN: true })
      }),
      { maxLength: 5 }
    ),
    lights: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 50 }),
        type: fc.constant('light'),
        failureProbability: fc.float({ min: 0, max: 1, noNaN: true })
      }),
      { maxLength: 5 }
    ),
    valves: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 50 }),
        type: fc.constant('valve'),
        flowRate: fc.float({ min: Math.fround(0.1), max: 100, noNaN: true }),
        failureProbability: fc.float({ min: 0, max: 1, noNaN: true })
      }),
      { maxLength: 5 }
    )
  }),
  physics: fc.record({
    evaporationRate: fc.float({ min: 0, max: 10, noNaN: true }),
    plantUptakeRate: fc.float({ min: 0, max: 10, noNaN: true }),
    nutrientUptakeRate: fc.float({ min: 0, max: 100, noNaN: true }),
    ambientTemperature: arbTemperature,
    temperatureDriftRate: fc.float({ min: 0, max: 5, noNaN: true }),
    phDriftRate: fc.float({ min: 0, max: 1, noNaN: true }),
    bufferCapacity: fc.float({ min: 0, max: 1, noNaN: true })
  }),
  simulation: fc.record({
    tickRate: fc.integer({ min: 1, max: 100 }),
    timeAcceleration: fc.float({ min: 1, max: 1000, noNaN: true })
  }),
  logging: fc.record({
    level: fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR),
    filepath: fc.string({ minLength: 1, maxLength: 200 }),
    rotationPolicy: fc.constantFrom('daily' as const, 'size' as const),
    maxSize: fc.option(fc.integer({ min: 1, max: 1000 }))
  })
}) as fc.Arbitrary<SimulationConfig>;

/**
 * Generate valid actuator state
 */
const arbActuatorState = fc.record({
  active: fc.boolean(),
  intensity: fc.option(fc.float({ min: 0, max: 100, noNaN: true })),
  timestamp: fc.nat()
}) as fc.Arbitrary<ActuatorState>;

/**
 * Generate valid simulation state
 */
const arbSimulationState = fc.record({
  version: fc.constant('1.0.0'),
  timestamp: fc.nat(),
  simulatedTime: fc.float({ min: 0, max: 1000000, noNaN: true }),
  sensors: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.record({
      type: fc.constantFrom(SensorType.PH, SensorType.EC, SensorType.TEMPERATURE, SensorType.WATER_LEVEL),
      baseline: fc.float({ min: 0, max: 100, noNaN: true }),
      currentValue: fc.float({ min: 0, max: 100, noNaN: true }),
      noiseStdDev: fc.float({ min: 0, max: 1, noNaN: true })
    }),
    { maxKeys: 10 }
  ),
  actuators: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.record({
      type: fc.constantFrom(ActuatorType.PUMP, ActuatorType.LIGHT, ActuatorType.VALVE),
      state: arbActuatorState,
      totalRuntime: fc.float({ min: 0, max: 1000000, noNaN: true }),
      failed: fc.boolean()
    }),
    { maxKeys: 10 }
  ),
  hydroponicState: fc.record({
    waterVolume: fc.float({ min: 0, max: 1000, noNaN: true }),
    waterLevel: arbWaterLevel,
    temperature: arbTemperature,
    ph: arbPH,
    ec: arbEC,
    nutrientConcentration: fc.float({ min: 0, max: 2000, noNaN: true }),
    ambientTemperature: arbTemperature,
    simulatedTime: fc.float({ min: 0, max: 1000000, noNaN: true })
  }),
  config: arbSimulationConfig
}) as fc.Arbitrary<SimulationState>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep equality check for objects, handling floating point precision
 */
function deepEqual(a: any, b: any, precision: number = 6): boolean {
  if (a === b) return true;
  
  if (typeof a === 'number' && typeof b === 'number') {
    // Handle floating point comparison with precision
    if (isNaN(a) && isNaN(b)) return true;
    if (!isFinite(a) && !isFinite(b)) return a === b;
    return Math.abs(a - b) < Math.pow(10, -precision);
  }
  
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index], precision));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    
    if (keysA.length !== keysB.length) return false;
    if (!keysA.every((key, index) => key === keysB[index])) return false;
    
    return keysA.every(key => deepEqual(a[key], b[key], precision));
  }
  
  return false;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Data Model Serialization Property Tests', () => {
  
  /**
   * Property 20: Scenario Parsing Round-Trip
   * 
   * **Validates: Requirements 8.1**
   * 
   * For any valid test scenario object, serializing to JSON then parsing back 
   * shall produce an equivalent scenario object.
   */
  describe('Property 20: Scenario parsing round-trip', () => {
    it('should preserve all scenario data through JSON round-trip', () => {
      fc.assert(
        fc.property(arbTestScenario, (scenario) => {
          // Serialize to JSON
          const json = JSON.stringify(scenario);
          
          // Parse back from JSON
          const parsed = JSON.parse(json) as TestScenario;
          
          // Verify all fields are preserved
          expect(parsed.name).toBe(scenario.name);
          expect(parsed.description).toBe(scenario.description);
          
          // Verify initial state
          expect(parsed.initialState.ph).toBeCloseTo(scenario.initialState.ph, 10);
          expect(parsed.initialState.ec).toBeCloseTo(scenario.initialState.ec, 10);
          expect(parsed.initialState.temperature).toBeCloseTo(scenario.initialState.temperature, 10);
          expect(parsed.initialState.waterLevel).toBeCloseTo(scenario.initialState.waterLevel, 10);
          
          // Verify events
          expect(parsed.events).toHaveLength(scenario.events.length);
          parsed.events.forEach((event, index) => {
            expect(event.time).toBeCloseTo(scenario.events[index].time, 10);
            expect(event.type).toBe(scenario.events[index].type);
            expect(event.target).toBe(scenario.events[index].target);
            // Value can be different types, so use deep equality
            expect(deepEqual(event.value, scenario.events[index].value)).toBe(true);
          });
          
          // Verify failures (optional field)
          if (scenario.failures) {
            expect(parsed.failures).toBeDefined();
            expect(parsed.failures).toHaveLength(scenario.failures.length);
            parsed.failures!.forEach((failure, index) => {
              expect(failure.actuatorId).toBe(scenario.failures![index].actuatorId);
              expect(failure.failureTime).toBeCloseTo(scenario.failures![index].failureTime, 10);
              expect(failure.duration).toBeCloseTo(scenario.failures![index].duration, 10);
            });
          } else {
            // JSON.stringify converts null to null, not undefined
            expect(parsed.failures === undefined || parsed.failures === null).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle scenarios with empty events array', () => {
      fc.assert(
        fc.property(
          arbTestScenario.map(scenario => ({ ...scenario, events: [] })),
          (scenario) => {
            const json = JSON.stringify(scenario);
            const parsed = JSON.parse(json) as TestScenario;
            
            expect(parsed.events).toEqual([]);
            expect(parsed.name).toBe(scenario.name);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle scenarios without failures field', () => {
      fc.assert(
        fc.property(
          arbTestScenario.map(scenario => {
            const { failures, ...rest } = scenario;
            return rest as TestScenario;
          }),
          (scenario) => {
            const json = JSON.stringify(scenario);
            const parsed = JSON.parse(json) as TestScenario;
            
            expect(parsed.failures).toBeUndefined();
            expect(parsed.name).toBe(scenario.name);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve exact structure through multiple round-trips', () => {
      fc.assert(
        fc.property(arbTestScenario, (scenario) => {
          // First round-trip
          const json1 = JSON.stringify(scenario);
          const parsed1 = JSON.parse(json1);
          
          // Second round-trip
          const json2 = JSON.stringify(parsed1);
          const parsed2 = JSON.parse(json2);
          
          // Third round-trip
          const json3 = JSON.stringify(parsed2);
          const parsed3 = JSON.parse(json3);
          
          // All parsed versions should be equivalent
          expect(deepEqual(parsed1, parsed2)).toBe(true);
          expect(deepEqual(parsed2, parsed3)).toBe(true);
          expect(deepEqual(parsed1, parsed3)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });
  
  /**
   * Property 33: Configuration Parsing Round-Trip
   * 
   * **Validates: Requirements 11.1**
   * 
   * For any valid configuration object, serializing to JSON then parsing back 
   * shall produce an equivalent configuration object.
   */
  describe('Property 33: Configuration parsing round-trip', () => {
    it('should preserve all configuration data through JSON round-trip', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          // Serialize to JSON
          const json = JSON.stringify(config);
          
          // Parse back from JSON
          const parsed = JSON.parse(json) as SimulationConfig;
          
          // Verify reservoir configuration
          expect(parsed.reservoir.capacity).toBeCloseTo(config.reservoir.capacity, 10);
          expect(parsed.reservoir.initialWaterLevel).toBeCloseTo(config.reservoir.initialWaterLevel, 10);
          
          // Verify sensor configurations
          expect(parsed.sensors.ph.id).toBe(config.sensors.ph.id);
          expect(parsed.sensors.ph.baseline).toBeCloseTo(config.sensors.ph.baseline, 10);
          expect(parsed.sensors.ph.noiseStdDev).toBeCloseTo(config.sensors.ph.noiseStdDev!, 10);
          expect(parsed.sensors.ph.driftRate).toBeCloseTo(config.sensors.ph.driftRate!, 10);
          
          expect(parsed.sensors.ec.id).toBe(config.sensors.ec.id);
          expect(parsed.sensors.ec.baseline).toBeCloseTo(config.sensors.ec.baseline, 10);
          
          expect(parsed.sensors.temperature.id).toBe(config.sensors.temperature.id);
          expect(parsed.sensors.temperature.baseline).toBeCloseTo(config.sensors.temperature.baseline, 10);
          
          expect(parsed.sensors.waterLevel.id).toBe(config.sensors.waterLevel.id);
          expect(parsed.sensors.waterLevel.baseline).toBeCloseTo(config.sensors.waterLevel.baseline, 10);
          
          // Verify actuator configurations
          expect(parsed.actuators.pumps).toHaveLength(config.actuators.pumps.length);
          expect(parsed.actuators.lights).toHaveLength(config.actuators.lights.length);
          expect(parsed.actuators.valves).toHaveLength(config.actuators.valves.length);
          
          // Verify physics configuration
          expect(parsed.physics.evaporationRate).toBeCloseTo(config.physics.evaporationRate, 10);
          expect(parsed.physics.plantUptakeRate).toBeCloseTo(config.physics.plantUptakeRate, 10);
          expect(parsed.physics.nutrientUptakeRate).toBeCloseTo(config.physics.nutrientUptakeRate, 10);
          expect(parsed.physics.ambientTemperature).toBeCloseTo(config.physics.ambientTemperature, 10);
          expect(parsed.physics.temperatureDriftRate).toBeCloseTo(config.physics.temperatureDriftRate, 10);
          expect(parsed.physics.phDriftRate).toBeCloseTo(config.physics.phDriftRate, 10);
          
          // Verify simulation configuration
          expect(parsed.simulation!.tickRate).toBe(config.simulation!.tickRate);
          expect(parsed.simulation!.timeAcceleration).toBeCloseTo(config.simulation!.timeAcceleration, 10);
          
          // Verify logging configuration
          expect(parsed.logging!.level).toBe(config.logging!.level);
          expect(parsed.logging!.filepath).toBe(config.logging!.filepath);
          expect(parsed.logging!.rotationPolicy).toBe(config.logging!.rotationPolicy);
          if (config.logging!.maxSize !== undefined) {
            expect(parsed.logging!.maxSize).toBe(config.logging!.maxSize);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle configurations with optional fields', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          // Remove optional fields
          const minimalConfig = {
            reservoir: config.reservoir,
            sensors: config.sensors,
            actuators: config.actuators,
            physics: config.physics
          };
          
          const json = JSON.stringify(minimalConfig);
          const parsed = JSON.parse(json);
          
          expect(parsed.reservoir).toBeDefined();
          expect(parsed.sensors).toBeDefined();
          expect(parsed.actuators).toBeDefined();
          expect(parsed.physics).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
    
    it('should preserve exact structure through multiple round-trips', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          // First round-trip
          const json1 = JSON.stringify(config);
          const parsed1 = JSON.parse(json1);
          
          // Second round-trip
          const json2 = JSON.stringify(parsed1);
          const parsed2 = JSON.parse(json2);
          
          // Third round-trip
          const json3 = JSON.stringify(parsed2);
          
          // JSON strings should be identical after stabilization
          expect(json2).toBe(json3);
          expect(deepEqual(parsed1, parsed2)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
    
    it('should preserve all actuator array elements', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const json = JSON.stringify(config);
          const parsed = JSON.parse(json) as SimulationConfig;
          
          // Verify each pump
          parsed.actuators.pumps.forEach((pump, index) => {
            expect(pump.id).toBe(config.actuators.pumps[index].id);
            expect(pump.type).toBe(config.actuators.pumps[index].type);
            expect(pump.flowRate).toBeCloseTo(config.actuators.pumps[index].flowRate!, 10);
            expect(pump.failureProbability).toBeCloseTo(config.actuators.pumps[index].failureProbability, 10);
          });
          
          // Verify each light
          parsed.actuators.lights.forEach((light, index) => {
            expect(light.id).toBe(config.actuators.lights[index].id);
            expect(light.type).toBe(config.actuators.lights[index].type);
            expect(light.failureProbability).toBeCloseTo(config.actuators.lights[index].failureProbability, 10);
          });
          
          // Verify each valve
          parsed.actuators.valves.forEach((valve, index) => {
            expect(valve.id).toBe(config.actuators.valves[index].id);
            expect(valve.type).toBe(config.actuators.valves[index].type);
            expect(valve.flowRate).toBeCloseTo(config.actuators.valves[index].flowRate!, 10);
            expect(valve.failureProbability).toBeCloseTo(config.actuators.valves[index].failureProbability, 10);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 37: State Persistence Round-Trip
   * 
   * **Validates: Requirements 12.1, 12.5**
   * 
   * For any valid simulation state, saving to file then loading from file then 
   * saving again shall produce equivalent state files (semantically equivalent).
   */
  describe('Property 37: State persistence round-trip', () => {
    it('should preserve all state data through JSON round-trip', () => {
      fc.assert(
        fc.property(arbSimulationState, (state) => {
          // Serialize to JSON
          const json = JSON.stringify(state);
          
          // Parse back from JSON
          const parsed = JSON.parse(json) as SimulationState;
          
          // Verify metadata
          expect(parsed.version).toBe(state.version);
          expect(parsed.timestamp).toBe(state.timestamp);
          expect(parsed.simulatedTime).toBeCloseTo(state.simulatedTime, 10);
          
          // Verify sensors
          const sensorIds = Object.keys(state.sensors);
          expect(Object.keys(parsed.sensors)).toHaveLength(sensorIds.length);
          
          sensorIds.forEach(id => {
            expect(parsed.sensors[id]).toBeDefined();
            expect(parsed.sensors[id].type).toBe(state.sensors[id].type);
            expect(parsed.sensors[id].baseline).toBeCloseTo(state.sensors[id].baseline, 10);
            expect(parsed.sensors[id].currentValue).toBeCloseTo(state.sensors[id].currentValue, 10);
            expect(parsed.sensors[id].noiseStdDev).toBeCloseTo(state.sensors[id].noiseStdDev, 10);
          });
          
          // Verify actuators
          const actuatorIds = Object.keys(state.actuators);
          expect(Object.keys(parsed.actuators)).toHaveLength(actuatorIds.length);
          
          actuatorIds.forEach(id => {
            expect(parsed.actuators[id]).toBeDefined();
            expect(parsed.actuators[id].type).toBe(state.actuators[id].type);
            expect(parsed.actuators[id].state.active).toBe(state.actuators[id].state.active);
            expect(parsed.actuators[id].state.timestamp).toBe(state.actuators[id].state.timestamp);
            // Handle intensity - JSON converts undefined to null or removes it
            const originalIntensity = state.actuators[id].state.intensity;
            const parsedIntensity = parsed.actuators[id].state.intensity;
            if (originalIntensity !== undefined && originalIntensity !== null) {
              expect(parsedIntensity).toBeCloseTo(originalIntensity, 10);
            } else {
              // Both undefined and null are acceptable for missing intensity
              expect(parsedIntensity === undefined || parsedIntensity === null).toBe(true);
            }
            expect(parsed.actuators[id].totalRuntime).toBeCloseTo(state.actuators[id].totalRuntime, 10);
            expect(parsed.actuators[id].failed).toBe(state.actuators[id].failed);
          });
          
          // Verify hydroponic state
          expect(parsed.hydroponicState.waterVolume).toBeCloseTo(state.hydroponicState.waterVolume, 10);
          expect(parsed.hydroponicState.waterLevel).toBeCloseTo(state.hydroponicState.waterLevel, 10);
          expect(parsed.hydroponicState.temperature).toBeCloseTo(state.hydroponicState.temperature, 10);
          expect(parsed.hydroponicState.ph).toBeCloseTo(state.hydroponicState.ph, 10);
          expect(parsed.hydroponicState.ec).toBeCloseTo(state.hydroponicState.ec, 10);
          expect(parsed.hydroponicState.nutrientConcentration).toBeCloseTo(state.hydroponicState.nutrientConcentration, 10);
          expect(parsed.hydroponicState.ambientTemperature).toBeCloseTo(state.hydroponicState.ambientTemperature, 10);
          expect(parsed.hydroponicState.simulatedTime).toBeCloseTo(state.hydroponicState.simulatedTime, 10);
          
          // Verify config is preserved (using deep equality)
          expect(deepEqual(parsed.config, state.config)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should produce equivalent JSON after multiple round-trips', () => {
      fc.assert(
        fc.property(arbSimulationState, (state) => {
          // First round-trip
          const json1 = JSON.stringify(state);
          const parsed1 = JSON.parse(json1);
          
          // Second round-trip
          const json2 = JSON.stringify(parsed1);
          const parsed2 = JSON.parse(json2);
          
          // Third round-trip
          const json3 = JSON.stringify(parsed2);
          const parsed3 = JSON.parse(json3);
          
          // All JSON strings should be identical after first serialization
          expect(json2).toBe(json3);
          
          // All parsed objects should be deeply equal
          expect(deepEqual(parsed1, parsed2)).toBe(true);
          expect(deepEqual(parsed2, parsed3)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
    
    it('should handle states with empty sensor and actuator maps', () => {
      fc.assert(
        fc.property(
          arbSimulationState.map(state => ({
            ...state,
            sensors: {},
            actuators: {}
          })),
          (state) => {
            const json = JSON.stringify(state);
            const parsed = JSON.parse(json) as SimulationState;
            
            expect(Object.keys(parsed.sensors)).toHaveLength(0);
            expect(Object.keys(parsed.actuators)).toHaveLength(0);
            expect(parsed.version).toBe(state.version);
            expect(parsed.hydroponicState).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve sensor and actuator dictionary keys', () => {
      fc.assert(
        fc.property(arbSimulationState, (state) => {
          const json = JSON.stringify(state);
          const parsed = JSON.parse(json) as SimulationState;
          
          // Verify all sensor keys are preserved
          const originalSensorKeys = Object.keys(state.sensors).sort();
          const parsedSensorKeys = Object.keys(parsed.sensors).sort();
          expect(parsedSensorKeys).toEqual(originalSensorKeys);
          
          // Verify all actuator keys are preserved
          const originalActuatorKeys = Object.keys(state.actuators).sort();
          const parsedActuatorKeys = Object.keys(parsed.actuators).sort();
          expect(parsedActuatorKeys).toEqual(originalActuatorKeys);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle states with optional actuator intensity field', () => {
      fc.assert(
        fc.property(arbSimulationState, (state) => {
          const json = JSON.stringify(state);
          const parsed = JSON.parse(json) as SimulationState;
          
          // Verify intensity field handling for each actuator
          Object.keys(state.actuators).forEach(id => {
            const originalIntensity = state.actuators[id].state.intensity;
            const parsedIntensity = parsed.actuators[id].state.intensity;
            
            // JSON.stringify converts undefined to null in objects, or removes it
            if (originalIntensity === undefined || originalIntensity === null) {
              expect(parsedIntensity === undefined || parsedIntensity === null).toBe(true);
            } else {
              expect(parsedIntensity).toBeCloseTo(originalIntensity, 10);
            }
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
