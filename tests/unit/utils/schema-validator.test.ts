/**
 * Unit tests for schema validation
 */

import { SchemaValidator, SchemaValidationError } from '../../../src/utils/schema-validator';
import { SimulationConfig, TestScenario, SimulationState } from '../../../src/types';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('Configuration Validation', () => {
    it('should validate a valid configuration', () => {
      const validConfig: SimulationConfig = {
        reservoir: {
          capacity: 100,
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5, noiseStdDev: 0.1 },
          ec: { id: 'ec-1', baseline: 1.5, noiseStdDev: 0.05 },
          temperature: { id: 'temp-1', baseline: 22, noiseStdDev: 0.2 },
          waterLevel: { id: 'level-1', baseline: 80, noiseStdDev: 1.0 }
        },
        actuators: {
          pumps: [
            { id: 'pump-1', type: 'water', flowRate: 1.0, failureProbability: 0.01 }
          ],
          lights: [
            { id: 'light-1', type: 'led', failureProbability: 0.005 }
          ],
          valves: [
            { id: 'valve-1', type: 'drain', flowRate: 2.0, failureProbability: 0.01 }
          ]
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.2,
          nutrientUptakeRate: 5.0,
          ambientTemperature: 20,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      expect(() => validator.validateConfiguration(validConfig)).not.toThrow();
      expect(validator.isValidConfiguration(validConfig)).toBe(true);
    });

    it('should reject configuration with missing required fields', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 100
          // missing initialWaterLevel
        },
        sensors: {},
        actuators: {},
        physics: {}
      };

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(SchemaValidationError);
      expect(validator.isValidConfiguration(invalidConfig)).toBe(false);
    });

    it('should reject configuration with invalid values', () => {
      const invalidConfig = {
        reservoir: {
          capacity: -10, // negative capacity
          initialWaterLevel: 150 // exceeds maximum
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 }
        },
        actuators: {},
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.2,
          nutrientUptakeRate: 5.0,
          ambientTemperature: 20,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(SchemaValidationError);
    });

    it('should provide detailed error messages', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 100,
          initialWaterLevel: 80
        }
        // missing required fields
      };

      try {
        validator.validateConfiguration(invalidConfig);
        fail('Should have thrown SchemaValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        const validationError = error as SchemaValidationError;
        expect(validationError.errors.length).toBeGreaterThan(0);
        expect(validationError.getDetailedMessage()).toContain('validation failed');
      }
    });
  });

  describe('Scenario Validation', () => {
    it('should validate a valid scenario', () => {
      const validScenario: TestScenario = {
        name: 'Test Scenario',
        description: 'A test scenario',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: 10,
            type: 'actuator_command',
            target: 'pump-1',
            value: { active: true }
          }
        ]
      };

      expect(() => validator.validateTestScenario(validScenario)).not.toThrow();
      expect(validator.isValidTestScenario(validScenario)).toBe(true);
    });

    it('should reject scenario with invalid initial state', () => {
      const invalidScenario = {
        name: 'Test Scenario',
        initialState: {
          ph: 15, // exceeds maximum
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };

      expect(() => validator.validateTestScenario(invalidScenario)).toThrow(SchemaValidationError);
    });

    it('should reject scenario with missing required fields', () => {
      const invalidScenario = {
        name: 'Test Scenario',
        initialState: {
          ph: 6.5
          // missing ec, temperature, waterLevel
        },
        events: []
      };

      expect(() => validator.validateTestScenario(invalidScenario)).toThrow(SchemaValidationError);
    });

    it('should validate scenario with optional failures array', () => {
      const validScenario: TestScenario = {
        name: 'Test Scenario',
        description: 'A test scenario with failures',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [],
        failures: [
          {
            actuatorId: 'pump-1',
            failureTime: 100,
            duration: 50
          }
        ]
      };

      expect(() => validator.validateTestScenario(validScenario)).not.toThrow();
    });
  });

  describe('State Validation', () => {
    it('should validate a valid state', () => {
      const validState: SimulationState = {
        version: '1.0.0',
        timestamp: Date.now(),
        simulatedTime: 1000,
        sensors: {
          'ph-1': {
            type: 'ph',
            baseline: 6.5,
            currentValue: 6.4,
            noiseStdDev: 0.1
          }
        },
        actuators: {
          'pump-1': {
            type: 'pump',
            state: {
              active: true,
              timestamp: Date.now()
            },
            totalRuntime: 500,
            failed: false
          }
        },
        hydroponicState: {
          waterVolume: 80,
          waterLevel: 80,
          temperature: 22,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 1000
        },
        config: {} as any // Simplified for test
      };

      expect(() => validator.validateSimulationState(validState)).not.toThrow();
      expect(validator.isValidSimulationState(validState)).toBe(true);
    });

    it('should reject state with invalid version format', () => {
      const invalidState = {
        version: 'invalid-version',
        timestamp: Date.now(),
        simulatedTime: 1000,
        sensors: {},
        actuators: {},
        hydroponicState: {
          waterVolume: 80,
          waterLevel: 80,
          temperature: 22,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 1000
        }
      };

      expect(() => validator.validateSimulationState(invalidState)).toThrow(SchemaValidationError);
    });

    it('should reject state with invalid hydroponic state values', () => {
      const invalidState = {
        version: '1.0.0',
        timestamp: Date.now(),
        simulatedTime: 1000,
        sensors: {},
        actuators: {},
        hydroponicState: {
          waterVolume: -10, // negative volume
          waterLevel: 150, // exceeds maximum
          temperature: 22,
          ph: 15, // exceeds maximum
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 1000
        }
      };

      expect(() => validator.validateSimulationState(invalidState)).toThrow(SchemaValidationError);
    });
  });

  describe('Error Formatting', () => {
    it('should format validation errors', () => {
      const invalidConfig = {
        reservoir: {
          capacity: -10
        }
      };

      try {
        validator.validateConfiguration(invalidConfig);
      } catch (error) {
        const validationError = error as SchemaValidationError;
        const formatted = validator.formatErrors(validationError.errors);
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe('string');
      }
    });

    it('should get errors for specific schema type', () => {
      const invalidConfig = {
        reservoir: {}
      };

      validator.isValidConfiguration(invalidConfig);
      const errors = validator.getErrors('config');
      expect(errors).not.toBeNull();
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
