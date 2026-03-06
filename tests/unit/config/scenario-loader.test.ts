/**
 * Unit tests for ScenarioLoader
 */

import { ScenarioLoader, ISimulationCore, ISensor } from '../../../src/config/scenario-loader';
import { TestScenario, ScenarioEvent, ScenarioFailure } from '../../../src/types';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ScenarioLoader', () => {
  let loader: ScenarioLoader;
  const testDir = join(__dirname, 'test-scenarios');

  beforeEach(() => {
    loader = new ScenarioLoader();
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadFromFile', () => {
    it('should load a valid scenario file', () => {
      const scenario: TestScenario = {
        name: 'Test Scenario',
        description: 'A test scenario',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'valid-scenario.json');
      writeFileSync(filepath, JSON.stringify(scenario, null, 2));
      
      const loaded = loader.loadFromFile(filepath);
      
      expect(loaded.name).toBe('Test Scenario');
      expect(loaded.description).toBe('A test scenario');
      expect(loaded.initialState.ph).toBe(6.5);
      expect(loaded.initialState.ec).toBe(1.5);
      expect(loaded.initialState.temperature).toBe(22);
      expect(loaded.initialState.waterLevel).toBe(80);
      expect(loaded.events).toEqual([]);
    });

    it('should load a scenario with events', () => {
      const scenario: TestScenario = {
        name: 'Scenario with Events',
        description: 'Test events',
        initialState: {
          ph: 6.0,
          ec: 1.2,
          temperature: 20,
          waterLevel: 75
        },
        events: [
          {
            time: 10,
            type: 'actuator_command',
            target: 'pump1',
            value: { active: true }
          },
          {
            time: 20,
            type: 'parameter_change',
            target: 'temperature',
            value: 25
          }
        ]
      };
      
      const filepath = join(testDir, 'scenario-with-events.json');
      writeFileSync(filepath, JSON.stringify(scenario, null, 2));
      
      const loaded = loader.loadFromFile(filepath);
      
      expect(loaded.events).toHaveLength(2);
      expect(loaded.events[0].time).toBe(10);
      expect(loaded.events[0].type).toBe('actuator_command');
      expect(loaded.events[1].time).toBe(20);
      expect(loaded.events[1].type).toBe('parameter_change');
    });

    it('should load a scenario with failures', () => {
      const scenario: TestScenario = {
        name: 'Scenario with Failures',
        description: 'Test failures',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [],
        failures: [
          {
            actuatorId: 'pump1',
            failureTime: 30,
            duration: 10
          }
        ]
      };
      
      const filepath = join(testDir, 'scenario-with-failures.json');
      writeFileSync(filepath, JSON.stringify(scenario, null, 2));
      
      const loaded = loader.loadFromFile(filepath);
      
      expect(loaded.failures).toBeDefined();
      expect(loaded.failures).toHaveLength(1);
      expect(loaded.failures![0].actuatorId).toBe('pump1');
      expect(loaded.failures![0].failureTime).toBe(30);
      expect(loaded.failures![0].duration).toBe(10);
    });

    it('should throw error for non-existent file', () => {
      const filepath = join(testDir, 'non-existent.json');
      
      expect(() => loader.loadFromFile(filepath)).toThrow('Scenario file not found');
    });

    it('should throw error for invalid JSON', () => {
      const filepath = join(testDir, 'invalid-json.json');
      writeFileSync(filepath, '{ invalid json }');
      
      expect(() => loader.loadFromFile(filepath)).toThrow('Invalid JSON syntax');
    });

    it('should throw error for missing required fields', () => {
      const invalidScenario = {
        name: 'Invalid Scenario'
        // Missing description, initialState, and events
      };
      
      const filepath = join(testDir, 'missing-fields.json');
      writeFileSync(filepath, JSON.stringify(invalidScenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for invalid pH value', () => {
      const scenario = {
        name: 'Invalid pH',
        description: 'Test',
        initialState: {
          ph: 15, // Invalid: > 14
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'invalid-ph.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for invalid EC value', () => {
      const scenario = {
        name: 'Invalid EC',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: -1, // Invalid: < 0
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'invalid-ec.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for invalid temperature value', () => {
      const scenario = {
        name: 'Invalid Temperature',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 60, // Invalid: > 50
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'invalid-temp.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for invalid water level value', () => {
      const scenario = {
        name: 'Invalid Water Level',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 150 // Invalid: > 100
        },
        events: []
      };
      
      const filepath = join(testDir, 'invalid-water-level.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for invalid event type', () => {
      const scenario = {
        name: 'Invalid Event Type',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: 10,
            type: 'invalid_type', // Invalid event type
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'invalid-event-type.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for negative event time', () => {
      const scenario = {
        name: 'Negative Event Time',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: -5, // Invalid: negative time
            type: 'actuator_command',
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'negative-event-time.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });
  });

  describe('validate', () => {
    it('should validate a correct scenario object', () => {
      const scenario: TestScenario = {
        name: 'Valid Scenario',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      expect(() => loader.validate(scenario)).not.toThrow();
    });

    it('should throw error for missing name', () => {
      const scenario = {
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      expect(() => loader.validate(scenario)).toThrow('missing required field: name');
    });

    it('should throw error for empty name', () => {
      const scenario = {
        name: '',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      expect(() => loader.validate(scenario)).toThrow('validation failed');
    });

    it('should throw error for missing initialState', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        events: []
      };
      
      expect(() => loader.validate(scenario)).toThrow('missing required field: initialState');
    });

    it('should throw error for missing events', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        }
      };
      
      expect(() => loader.validate(scenario)).toThrow('missing required field: events');
    });
  });

  describe('Invalid Scenario Files', () => {
    it('should throw error for non-existent scenario file', () => {
      const filepath = join(testDir, 'non-existent-scenario.json');
      
      expect(() => loader.loadFromFile(filepath)).toThrow('Scenario file not found');
    });

    it('should throw error for invalid JSON in scenario file', () => {
      const filepath = join(testDir, 'invalid-scenario.json');
      writeFileSync(filepath, '{ invalid json }');
      
      expect(() => loader.loadFromFile(filepath)).toThrow('Invalid JSON syntax');
    });

    it('should throw error for empty scenario file', () => {
      const filepath = join(testDir, 'empty-scenario.json');
      writeFileSync(filepath, '');
      
      expect(() => loader.loadFromFile(filepath)).toThrow('Invalid JSON syntax');
    });
  });

  describe('Schema Validation', () => {
    it('should throw error for missing name field', () => {
      const scenario = {
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'missing-name.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for invalid pH value in initialState', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 15, // Invalid: > 14
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'invalid-ph-value.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for negative pH value', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: -1, // Invalid: < 0
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'negative-ph.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for EC value exceeding maximum', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 6, // Invalid: > 5
          temperature: 22,
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'ec-too-high.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for negative temperature', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: -10, // Invalid: < 0
          waterLevel: 80
        },
        events: []
      };
      
      const filepath = join(testDir, 'negative-temp.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for negative water level', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: -10 // Invalid: < 0
        },
        events: []
      };
      
      const filepath = join(testDir, 'negative-water-level.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });
  });

  describe('Missing Events', () => {
    it('should throw error for missing event time', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            // Missing time
            type: 'actuator_command',
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'missing-event-time.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for missing event type', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: 10,
            // Missing type
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'missing-event-type.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for missing event target', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
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
            // Missing target
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'missing-event-target.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });
  });

  describe('Invalid Event Types', () => {
    it('should throw error for invalid event type', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: 10,
            type: 'invalid_event_type',
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'invalid-event-type.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for negative event time', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: -5, // Invalid: negative time
            type: 'actuator_command',
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'negative-event-time.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });

    it('should throw error for non-numeric event time', () => {
      const scenario = {
        name: 'Test',
        description: 'Test',
        initialState: {
          ph: 6.5,
          ec: 1.5,
          temperature: 22,
          waterLevel: 80
        },
        events: [
          {
            time: 'ten', // Invalid: string instead of number
            type: 'actuator_command',
            target: 'pump1',
            value: {}
          }
        ]
      };
      
      const filepath = join(testDir, 'non-numeric-time.json');
      writeFileSync(filepath, JSON.stringify(scenario));
      
      expect(() => loader.loadFromFile(filepath)).toThrow('validation failed');
    });
  });
});
