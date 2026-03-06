/**
 * Unit tests for ConfigurationLoader
 * 
 * Tests loading, validation, and default application for simulation configuration.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigurationLoader, DEFAULT_CONFIG } from '../../../src/config/configuration-loader';
import { SimulationConfig, LogLevel } from '../../../src/types';

describe('ConfigurationLoader', () => {
  let loader: ConfigurationLoader;
  const testDir = join(__dirname, 'test-configs');

  beforeEach(() => {
    loader = new ConfigurationLoader();
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadFromFile', () => {
    test('loads valid minimal configuration', () => {
      const minimalConfig = {
        reservoir: {
          capacity: 50,
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [
            { id: 'pump-1', type: 'water', flowRate: 1.0, failureProbability: 0.01 }
          ],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'minimal-config.json');
      writeFileSync(filepath, JSON.stringify(minimalConfig, null, 2));

      const config = loader.loadFromFile(filepath);

      expect(config.reservoir.capacity).toBe(50);
      expect(config.sensors.ph.baseline).toBe(6.5);
      expect(config.actuators.pumps).toHaveLength(1);
      expect(config.simulation?.tickRate).toBe(10);
      expect(config.logging?.level).toBe(LogLevel.INFO);
    });

    test('throws error for non-existent file', () => {
      const filepath = join(testDir, 'non-existent.json');

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Configuration file not found/
      );
    });

    test('throws error for invalid JSON syntax', () => {
      const filepath = join(testDir, 'invalid-json.json');
      writeFileSync(filepath, '{ invalid json }');

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Invalid JSON syntax|Failed to parse/
      );
    });

    test('throws error for missing required fields', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 50
          // Missing initialWaterLevel
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'missing-fields.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig, null, 2));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Configuration validation failed/
      );
    });

    test('throws error for invalid value types', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 'fifty', // Should be number
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'invalid-types.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig, null, 2));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Configuration validation failed/
      );
    });
  });

  describe('Missing Configuration File', () => {
    test('throws error when configuration file does not exist', () => {
      const filepath = join(testDir, 'does-not-exist.json');

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Configuration file not found/
      );
    });
  });

  describe('Invalid JSON in Config', () => {
    test('throws error for malformed JSON', () => {
      const filepath = join(testDir, 'malformed.json');
      writeFileSync(filepath, '{ invalid json syntax }');

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Invalid JSON syntax|Failed to parse/
      );
    });

    test('throws error for incomplete JSON', () => {
      const filepath = join(testDir, 'incomplete.json');
      writeFileSync(filepath, '{ "reservoir": { "capacity": 50 }');

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Invalid JSON syntax|Failed to parse/
      );
    });

    test('throws error for empty file', () => {
      const filepath = join(testDir, 'empty.json');
      writeFileSync(filepath, '');

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /Invalid JSON syntax|Failed to parse|Unexpected end/
      );
    });
  });

  describe('Schema Validation', () => {
    test('throws error for missing required nested field', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 50
          // Missing initialWaterLevel
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'missing-nested.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|missing required field/
      );
    });
  });

  describe('Missing Required Fields', () => {
    test('throws error when reservoir is missing', () => {
      const invalidConfig = {
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'missing-reservoir.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|missing required field/
      );
    });

    test('throws error when sensors are missing', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 50,
          initialWaterLevel: 80
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'missing-sensors.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|missing required field/
      );
    });

    test('throws error when physics config is missing', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 50,
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        }
      };

      const filepath = join(testDir, 'missing-physics.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|missing required field/
      );
    });
  });

  describe('Invalid Field Types', () => {
    test('throws error when capacity is string instead of number', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 'fifty',
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'wrong-type-capacity.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|expected number|type error/
      );
    });

    test('throws error when baseline is string instead of number', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 50,
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 'neutral' },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: [],
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'wrong-type-baseline.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|expected number|type error/
      );
    });

    test('throws error when array field is not an array', () => {
      const invalidConfig = {
        reservoir: {
          capacity: 50,
          initialWaterLevel: 80
        },
        sensors: {
          ph: { id: 'ph-1', baseline: 6.5 },
          ec: { id: 'ec-1', baseline: 1.5 },
          temperature: { id: 'temp-1', baseline: 22 },
          waterLevel: { id: 'level-1', baseline: 80 }
        },
        actuators: {
          pumps: 'not-an-array',
          lights: [],
          valves: []
        },
        physics: {
          evaporationRate: 0.1,
          plantUptakeRate: 0.05,
          nutrientUptakeRate: 5,
          ambientTemperature: 22,
          temperatureDriftRate: 0.5,
          phDriftRate: 0.1
        }
      };

      const filepath = join(testDir, 'wrong-type-array.json');
      writeFileSync(filepath, JSON.stringify(invalidConfig));

      expect(() => loader.loadFromFile(filepath)).toThrow(
        /validation failed|expected array|type error/
      );
    });
  });

  describe('DEFAULT_CONFIG', () => {
    test('contains sensible default values', () => {
      expect(DEFAULT_CONFIG.simulation?.tickRate).toBe(10);
      expect(DEFAULT_CONFIG.simulation?.timeAcceleration).toBe(1);
      expect(DEFAULT_CONFIG.logging?.level).toBe(LogLevel.INFO);
      expect(DEFAULT_CONFIG.logging?.rotationPolicy).toBe('daily');
      expect(DEFAULT_CONFIG.physics?.evaporationRate).toBe(0.1);
      expect(DEFAULT_CONFIG.physics?.plantUptakeRate).toBe(0.05);
      expect(DEFAULT_CONFIG.physics?.ambientTemperature).toBe(22);
    });
  });
});
