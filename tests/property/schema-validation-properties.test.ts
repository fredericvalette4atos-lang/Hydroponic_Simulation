/**
 * Property-Based Tests for Schema Validation
 * 
 * Tests universal properties of JSON schema validation for scenarios, configurations,
 * and state files. These tests verify that the schema validation correctly accepts
 * valid data and rejects invalid data with descriptive error messages.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 8.3, 8.4, 11.2, 11.3, 12.3, 12.4
 */

import * as fc from 'fast-check';
import { schemaValidator, SchemaValidationError } from '../../src/utils/schema-validator';
import { 
  TestScenario, 
  SimulationConfig, 
  SimulationState,
  LogLevel,
  SensorType,
  ActuatorType
} from '../../src/types';

// ============================================================================
// Arbitraries (Generators) - Reused from persistence-properties.test.ts
// ============================================================================

const arbPH = fc.float({ min: 0.0, max: 14.0, noNaN: true });
const arbEC = fc.float({ min: 0.0, max: 5.0, noNaN: true });
const arbTemperature = fc.float({ min: 0.0, max: 50.0, noNaN: true });
const arbWaterLevel = fc.float({ min: 0.0, max: 100.0, noNaN: true });

const arbTestScenario = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
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
      target: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      value: fc.oneof(
        fc.boolean(),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
      )
    }),
    { maxLength: 10 }
  ),
  failures: fc.option(
    fc.array(
      fc.record({
        actuatorId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        failureTime: fc.float({ min: 0, max: 10000, noNaN: true }),
        duration: fc.float({ min: 0, max: 1000, noNaN: true })
      }),
      { maxLength: 5 }
    ),
    { nil: undefined }
  )
}) as fc.Arbitrary<TestScenario>;

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
        id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        type: fc.constant('pump'),
        flowRate: fc.float({ min: Math.fround(0.1), max: 100, noNaN: true }),
        failureProbability: fc.float({ min: 0, max: 1, noNaN: true })
      }),
      { maxLength: 5 }
    ),
    lights: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        type: fc.constant('light'),
        failureProbability: fc.float({ min: 0, max: 1, noNaN: true })
      }),
      { maxLength: 5 }
    ),
    valves: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
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
    filepath: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    rotationPolicy: fc.constantFrom('daily' as const, 'size' as const),
    maxSize: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined })
  })
}) as fc.Arbitrary<SimulationConfig>;

const arbActuatorState = fc.record({
  active: fc.boolean(),
  intensity: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
  timestamp: fc.nat()
});

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
// Invalid Data Generators
// ============================================================================

/**
 * Generate invalid scenarios by violating schema constraints
 */
const arbInvalidScenario = fc.oneof(
  // Missing required field: name
  fc.record({
    description: fc.string(),
    initialState: fc.record({
      ph: arbPH,
      ec: arbEC,
      temperature: arbTemperature,
      waterLevel: arbWaterLevel
    }),
    events: fc.constant([])
  }),
  
  // Missing required field: initialState
  fc.record({
    name: fc.string({ minLength: 1 }),
    description: fc.string(),
    events: fc.constant([])
  }),
  
  // Missing required field: events
  fc.record({
    name: fc.string({ minLength: 1 }),
    description: fc.string(),
    initialState: fc.record({
      ph: arbPH,
      ec: arbEC,
      temperature: arbTemperature,
      waterLevel: arbWaterLevel
    })
  }),
  
  // Invalid pH value (out of range)
  arbTestScenario.map(s => ({
    ...s,
    initialState: { ...s.initialState, ph: 15.0 }
  })),
  
  // Invalid EC value (negative)
  arbTestScenario.map(s => ({
    ...s,
    initialState: { ...s.initialState, ec: -1.0 }
  })),
  
  // Invalid temperature value (out of range)
  arbTestScenario.map(s => ({
    ...s,
    initialState: { ...s.initialState, temperature: 100.0 }
  })),
  
  // Invalid water level (out of range)
  arbTestScenario.map(s => ({
    ...s,
    initialState: { ...s.initialState, waterLevel: 150.0 }
  })),
  
  // Invalid event time (negative)
  arbTestScenario.map(s => ({
    ...s,
    events: [{ time: -10, type: 'actuator_command', target: 'pump-1', value: true }]
  }))
);

/**
 * Generate invalid configurations by violating schema constraints
 */
const arbInvalidConfig = fc.oneof(
  // Missing required field: reservoir
  fc.record({
    sensors: arbSimulationConfig.map(c => c.sensors),
    actuators: arbSimulationConfig.map(c => c.actuators),
    physics: arbSimulationConfig.map(c => c.physics)
  }),
  
  // Missing required field: sensors
  fc.record({
    reservoir: arbSimulationConfig.map(c => c.reservoir),
    actuators: arbSimulationConfig.map(c => c.actuators),
    physics: arbSimulationConfig.map(c => c.physics)
  }),
  
  // Invalid reservoir capacity (negative)
  arbSimulationConfig.map(c => ({
    ...c,
    reservoir: { ...c.reservoir, capacity: -10 }
  })),
  
  // Invalid water level (out of range)
  arbSimulationConfig.map(c => ({
    ...c,
    reservoir: { ...c.reservoir, initialWaterLevel: 150 }
  })),
  
  // Invalid noise standard deviation (negative)
  arbSimulationConfig.map(c => ({
    ...c,
    sensors: {
      ...c.sensors,
      ph: { ...c.sensors.ph, noiseStdDev: -0.1 }
    }
  })),
  
  // Invalid time acceleration (out of range)
  arbSimulationConfig.map(c => ({
    ...c,
    simulation: { ...c.simulation!, timeAcceleration: 2000 }
  })),
  
  // Invalid log level
  arbSimulationConfig.map(c => ({
    ...c,
    logging: { ...c.logging!, level: 'invalid' as any }
  })),
  
  // Invalid failure probability (out of range)
  arbSimulationConfig.map(c => ({
    ...c,
    actuators: {
      ...c.actuators,
      pumps: [{ id: 'pump-1', type: 'pump', flowRate: 5, failureProbability: 1.5 }]
    }
  }))
);

/**
 * Generate invalid state objects by violating schema constraints
 */
const arbInvalidState = fc.oneof(
  // Missing required field: version
  fc.record({
    timestamp: fc.nat(),
    simulatedTime: fc.float({ min: 0, max: 1000000, noNaN: true }),
    sensors: fc.constant({}),
    actuators: fc.constant({}),
    hydroponicState: arbSimulationState.map(s => s.hydroponicState)
  }),
  
  // Invalid version format
  arbSimulationState.map(s => ({
    ...s,
    version: 'invalid-version'
  })),
  
  // Invalid timestamp (negative)
  arbSimulationState.map(s => ({
    ...s,
    timestamp: -1000
  })),
  
  // Invalid pH in hydroponic state (out of range)
  arbSimulationState.map(s => ({
    ...s,
    hydroponicState: { ...s.hydroponicState, ph: 20.0 }
  })),
  
  // Invalid EC (negative)
  arbSimulationState.map(s => ({
    ...s,
    hydroponicState: { ...s.hydroponicState, ec: -2.0 }
  })),
  
  // Invalid water level (out of range)
  arbSimulationState.map(s => ({
    ...s,
    hydroponicState: { ...s.hydroponicState, waterLevel: 200 }
  })),
  
  // Invalid sensor type
  arbSimulationState.map(s => ({
    ...s,
    sensors: {
      'sensor-1': {
        type: 'invalid_type' as any,
        baseline: 7.0,
        currentValue: 7.0,
        noiseStdDev: 0.1
      }
    }
  })),
  
  // Invalid actuator intensity (out of range)
  arbSimulationState.map(s => ({
    ...s,
    actuators: {
      'light-1': {
        type: ActuatorType.LIGHT,
        state: { active: true, intensity: 150, timestamp: Date.now() },
        totalRuntime: 100,
        failed: false
      }
    }
  }))
);

// ============================================================================
// Property Tests
// ============================================================================

describe('Schema Validation Property Tests', () => {
  
  /**
   * Property 22: Scenario Validation
   * 
   * **Validates: Requirements 8.3, 8.4**
   * 
   * For any test scenario that violates the defined JSON schema, the simulator 
   * shall reject the scenario and return a descriptive error message.
   */
  describe('Property 22: Scenario validation', () => {
    it('should accept all valid scenarios', () => {
      fc.assert(
        fc.property(arbTestScenario, (scenario) => {
          // Valid scenarios should not throw
          expect(() => {
            schemaValidator.validateTestScenario(scenario);
          }).not.toThrow();
          
          // Validator should return true for valid scenarios
          expect(schemaValidator.isValidTestScenario(scenario)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should reject invalid scenarios with descriptive errors', () => {
      fc.assert(
        fc.property(arbInvalidScenario, (invalidScenario) => {
          // Invalid scenarios should throw SchemaValidationError
          expect(() => {
            schemaValidator.validateTestScenario(invalidScenario);
          }).toThrow(SchemaValidationError);
          
          // Validator should return false for invalid scenarios
          expect(schemaValidator.isValidTestScenario(invalidScenario)).toBe(false);
          
          // Error should have detailed message
          try {
            schemaValidator.validateTestScenario(invalidScenario);
            fail('Should have thrown SchemaValidationError');
          } catch (error) {
            expect(error).toBeInstanceOf(SchemaValidationError);
            const validationError = error as SchemaValidationError;
            
            // Error message should be descriptive
            expect(validationError.message).toBeTruthy();
            expect(validationError.message.length).toBeGreaterThan(0);
            
            // Should have error details
            expect(validationError.errors).toBeDefined();
            expect(validationError.errors.length).toBeGreaterThan(0);
            
            // Detailed message should include field information
            const detailedMessage = validationError.getDetailedMessage();
            expect(detailedMessage).toBeTruthy();
            expect(detailedMessage.length).toBeGreaterThan(validationError.message.length);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should validate scenario bounds correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1 }),
            description: fc.string(),
            initialState: fc.record({
              ph: fc.oneof(fc.constant(-1), fc.constant(15)),
              ec: fc.oneof(fc.constant(-1), fc.constant(10)),
              temperature: fc.oneof(fc.constant(-10), fc.constant(100)),
              waterLevel: fc.oneof(fc.constant(-10), fc.constant(150))
            }),
            events: fc.constant([])
          }),
          (scenario) => {
            // Out-of-bounds values should be rejected
            expect(schemaValidator.isValidTestScenario(scenario)).toBe(false);
            
            try {
              schemaValidator.validateTestScenario(scenario);
              fail('Should have thrown for out-of-bounds values');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention the constraint violation
              const detailedMessage = validationError.getDetailedMessage();
              expect(
                detailedMessage.includes('minimum') || 
                detailedMessage.includes('maximum') ||
                detailedMessage.includes('>=') ||
                detailedMessage.includes('<=')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate required fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Missing name
            fc.record({
              description: fc.string(),
              initialState: fc.record({
                ph: arbPH,
                ec: arbEC,
                temperature: arbTemperature,
                waterLevel: arbWaterLevel
              }),
              events: fc.constant([])
            }),
            // Missing initialState
            fc.record({
              name: fc.string({ minLength: 1 }),
              description: fc.string(),
              events: fc.constant([])
            }),
            // Missing events
            fc.record({
              name: fc.string({ minLength: 1 }),
              description: fc.string(),
              initialState: fc.record({
                ph: arbPH,
                ec: arbEC,
                temperature: arbTemperature,
                waterLevel: arbWaterLevel
              })
            })
          ),
          (incompleteScenario) => {
            expect(schemaValidator.isValidTestScenario(incompleteScenario)).toBe(false);
            
            try {
              schemaValidator.validateTestScenario(incompleteScenario);
              fail('Should have thrown for missing required field');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention required field
              const detailedMessage = validationError.getDetailedMessage();
              expect(detailedMessage.toLowerCase()).toContain('required');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 34: Configuration Validation
   * 
   * **Validates: Requirements 11.2, 11.3**
   * 
   * For any configuration that violates the defined JSON schema, the simulator 
   * shall reject the configuration and return a descriptive error message.
   */
  describe('Property 34: Configuration validation', () => {
    it('should accept all valid configurations', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          // Valid configurations should not throw
          expect(() => {
            schemaValidator.validateConfiguration(config);
          }).not.toThrow();
          
          // Validator should return true for valid configurations
          expect(schemaValidator.isValidConfiguration(config)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should reject invalid configurations with descriptive errors', () => {
      fc.assert(
        fc.property(arbInvalidConfig, (invalidConfig) => {
          // Invalid configurations should throw SchemaValidationError
          expect(() => {
            schemaValidator.validateConfiguration(invalidConfig);
          }).toThrow(SchemaValidationError);
          
          // Validator should return false for invalid configurations
          expect(schemaValidator.isValidConfiguration(invalidConfig)).toBe(false);
          
          // Error should have detailed message
          try {
            schemaValidator.validateConfiguration(invalidConfig);
            fail('Should have thrown SchemaValidationError');
          } catch (error) {
            expect(error).toBeInstanceOf(SchemaValidationError);
            const validationError = error as SchemaValidationError;
            
            // Error message should be descriptive
            expect(validationError.message).toBeTruthy();
            expect(validationError.message.length).toBeGreaterThan(0);
            
            // Should have error details
            expect(validationError.errors).toBeDefined();
            expect(validationError.errors.length).toBeGreaterThan(0);
            
            // Detailed message should include field information
            const detailedMessage = validationError.getDetailedMessage();
            expect(detailedMessage).toBeTruthy();
            expect(detailedMessage.length).toBeGreaterThan(validationError.message.length);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should validate configuration bounds correctly', () => {
      fc.assert(
        fc.property(
          arbSimulationConfig.map(c => ({
            ...c,
            reservoir: { capacity: -100, initialWaterLevel: 50 }
          })),
          (config) => {
            // Negative capacity should be rejected
            expect(schemaValidator.isValidConfiguration(config)).toBe(false);
            
            try {
              schemaValidator.validateConfiguration(config);
              fail('Should have thrown for negative capacity');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention minimum constraint
              const detailedMessage = validationError.getDetailedMessage();
              expect(
                detailedMessage.toLowerCase().includes('minimum') ||
                detailedMessage.includes('>=')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate time acceleration range', () => {
      fc.assert(
        fc.property(
          arbSimulationConfig.map(c => ({
            ...c,
            simulation: { ...c.simulation!, timeAcceleration: 2000 }
          })),
          (config) => {
            // Time acceleration > 1000 should be rejected
            expect(schemaValidator.isValidConfiguration(config)).toBe(false);
            
            try {
              schemaValidator.validateConfiguration(config);
              fail('Should have thrown for time acceleration > 1000');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention maximum constraint
              const detailedMessage = validationError.getDetailedMessage();
              expect(
                detailedMessage.toLowerCase().includes('maximum') ||
                detailedMessage.includes('<=')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate required fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Missing reservoir
            fc.record({
              sensors: arbSimulationConfig.map(c => c.sensors),
              actuators: arbSimulationConfig.map(c => c.actuators),
              physics: arbSimulationConfig.map(c => c.physics)
            }),
            // Missing physics
            fc.record({
              reservoir: arbSimulationConfig.map(c => c.reservoir),
              sensors: arbSimulationConfig.map(c => c.sensors),
              actuators: arbSimulationConfig.map(c => c.actuators)
            })
          ),
          (incompleteConfig) => {
            expect(schemaValidator.isValidConfiguration(incompleteConfig)).toBe(false);
            
            try {
              schemaValidator.validateConfiguration(incompleteConfig);
              fail('Should have thrown for missing required field');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention required field
              const detailedMessage = validationError.getDetailedMessage();
              expect(detailedMessage.toLowerCase()).toContain('required');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 38: State Validation
   * 
   * **Validates: Requirements 12.3, 12.4**
   * 
   * For any state file that violates the defined JSON schema, the simulator 
   * shall reject the state and return a descriptive error message.
   */
  describe('Property 38: State validation', () => {
    it('should accept all valid state objects', () => {
      fc.assert(
        fc.property(arbSimulationState, (state) => {
          // Valid states should not throw
          expect(() => {
            schemaValidator.validateSimulationState(state);
          }).not.toThrow();
          
          // Validator should return true for valid states
          expect(schemaValidator.isValidSimulationState(state)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should reject invalid state objects with descriptive errors', () => {
      fc.assert(
        fc.property(arbInvalidState, (invalidState) => {
          // Invalid states should throw SchemaValidationError
          expect(() => {
            schemaValidator.validateSimulationState(invalidState);
          }).toThrow(SchemaValidationError);
          
          // Validator should return false for invalid states
          expect(schemaValidator.isValidSimulationState(invalidState)).toBe(false);
          
          // Error should have detailed message
          try {
            schemaValidator.validateSimulationState(invalidState);
            fail('Should have thrown SchemaValidationError');
          } catch (error) {
            expect(error).toBeInstanceOf(SchemaValidationError);
            const validationError = error as SchemaValidationError;
            
            // Error message should be descriptive
            expect(validationError.message).toBeTruthy();
            expect(validationError.message.length).toBeGreaterThan(0);
            
            // Should have error details
            expect(validationError.errors).toBeDefined();
            expect(validationError.errors.length).toBeGreaterThan(0);
            
            // Detailed message should include field information
            const detailedMessage = validationError.getDetailedMessage();
            expect(detailedMessage).toBeTruthy();
            expect(detailedMessage.length).toBeGreaterThan(validationError.message.length);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should validate state version format', () => {
      fc.assert(
        fc.property(
          arbSimulationState.map(s => ({
            ...s,
            version: fc.sample(fc.oneof(
              fc.constant('invalid'),
              fc.constant('1.0'),
              fc.constant('v1.0.0'),
              fc.constant('1.0.0.0')
            ), 1)[0]
          })),
          (state) => {
            // Invalid version format should be rejected
            expect(schemaValidator.isValidSimulationState(state)).toBe(false);
            
            try {
              schemaValidator.validateSimulationState(state);
              fail('Should have thrown for invalid version format');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention pattern or format
              const detailedMessage = validationError.getDetailedMessage();
              expect(
                detailedMessage.toLowerCase().includes('pattern') ||
                detailedMessage.toLowerCase().includes('format')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate hydroponic state bounds', () => {
      fc.assert(
        fc.property(
          arbSimulationState.map(s => ({
            ...s,
            hydroponicState: {
              ...s.hydroponicState,
              ph: fc.sample(fc.oneof(fc.constant(-1), fc.constant(20)), 1)[0]
            }
          })),
          (state) => {
            // Out-of-bounds pH should be rejected
            expect(schemaValidator.isValidSimulationState(state)).toBe(false);
            
            try {
              schemaValidator.validateSimulationState(state);
              fail('Should have thrown for out-of-bounds pH');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention constraint violation
              const detailedMessage = validationError.getDetailedMessage();
              expect(
                detailedMessage.toLowerCase().includes('minimum') ||
                detailedMessage.toLowerCase().includes('maximum') ||
                detailedMessage.includes('>=') ||
                detailedMessage.includes('<=')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate sensor and actuator types', () => {
      fc.assert(
        fc.property(
          arbSimulationState.map(s => ({
            ...s,
            sensors: {
              'sensor-1': {
                type: 'invalid_type' as any,
                baseline: 7.0,
                currentValue: 7.0,
                noiseStdDev: 0.1
              }
            }
          })),
          (state) => {
            // Invalid sensor type should be rejected
            expect(schemaValidator.isValidSimulationState(state)).toBe(false);
            
            try {
              schemaValidator.validateSimulationState(state);
              fail('Should have thrown for invalid sensor type');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention enum constraint
              const detailedMessage = validationError.getDetailedMessage();
              expect(
                detailedMessage.toLowerCase().includes('enum') ||
                detailedMessage.toLowerCase().includes('allowed values')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate required fields in state', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Missing version
            fc.record({
              timestamp: fc.nat(),
              simulatedTime: fc.float({ min: 0, max: 1000000, noNaN: true }),
              sensors: fc.constant({}),
              actuators: fc.constant({}),
              hydroponicState: arbSimulationState.map(s => s.hydroponicState)
            }),
            // Missing timestamp
            fc.record({
              version: fc.constant('1.0.0'),
              simulatedTime: fc.float({ min: 0, max: 1000000, noNaN: true }),
              sensors: fc.constant({}),
              actuators: fc.constant({}),
              hydroponicState: arbSimulationState.map(s => s.hydroponicState)
            }),
            // Missing hydroponicState
            fc.record({
              version: fc.constant('1.0.0'),
              timestamp: fc.nat(),
              simulatedTime: fc.float({ min: 0, max: 1000000, noNaN: true }),
              sensors: fc.constant({}),
              actuators: fc.constant({})
            })
          ),
          (incompleteState) => {
            expect(schemaValidator.isValidSimulationState(incompleteState)).toBe(false);
            
            try {
              schemaValidator.validateSimulationState(incompleteState);
              fail('Should have thrown for missing required field');
            } catch (error) {
              expect(error).toBeInstanceOf(SchemaValidationError);
              const validationError = error as SchemaValidationError;
              
              // Error should mention required field
              const detailedMessage = validationError.getDetailedMessage();
              expect(detailedMessage.toLowerCase()).toContain('required');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
