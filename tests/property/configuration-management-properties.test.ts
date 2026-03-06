/**
 * Property-Based Tests for Configuration Management
 * 
 * Tests universal properties of runtime configuration updates and default value
 * application for the simulation system.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 11.4, 11.5
 */

import * as fc from 'fast-check';
import { SimulationCore } from '../../src/core/simulation-core';
import { ConfigurationLoader, DEFAULT_CONFIG } from '../../src/config/configuration-loader';
import { SimulationConfig, LogLevel } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const arbPH = fc.float({ min: 0.0, max: Math.fround(14.0), noNaN: true });
const arbEC = fc.float({ min: 0.0, max: Math.fround(5.0), noNaN: true });
const arbTemperature = fc.float({ min: 0.0, max: Math.fround(50.0), noNaN: true });
const arbWaterLevel = fc.float({ min: 0.0, max: Math.fround(100.0), noNaN: true });

/**
 * Generate valid time acceleration factors (1-1000)
 */
const arbTimeAcceleration = fc.float({ min: 1.0, max: Math.fround(1000.0), noNaN: true });

/**
 * Generate valid tick rates (1-100 Hz)
 */
const arbTickRate = fc.float({ min: 1.0, max: Math.fround(100.0), noNaN: true });

/**
 * Generate valid evaporation rates (0-1 L/h)
 */
const arbEvaporationRate = fc.float({ min: 0.0, max: Math.fround(1.0), noNaN: true });

/**
 * Generate valid plant uptake rates (0-0.5 L/h)
 */
const arbPlantUptakeRate = fc.float({ min: 0.0, max: Math.fround(0.5), noNaN: true });

/**
 * Generate valid reservoir capacities (10-1000 L)
 */
const arbReservoirCapacity = fc.float({ min: 10.0, max: Math.fround(1000.0), noNaN: true });

/**
 * Generate a minimal valid configuration (required fields only)
 */
const arbMinimalConfig = fc.record({
  reservoir: fc.record({
    capacity: arbReservoirCapacity,
    initialWaterLevel: arbWaterLevel
  }),
  sensors: fc.record({
    ph: fc.record({
      id: fc.constant('ph'),
      baseline: arbPH
    }),
    ec: fc.record({
      id: fc.constant('ec'),
      baseline: arbEC
    }),
    temperature: fc.record({
      id: fc.constant('temperature'),
      baseline: arbTemperature
    }),
    waterLevel: fc.record({
      id: fc.constant('water_level'),
      baseline: arbWaterLevel
    })
  }),
  actuators: fc.record({
    pumps: fc.constant([]),
    lights: fc.constant([]),
    valves: fc.constant([])
  }),
  physics: fc.record({
    evaporationRate: arbEvaporationRate,
    plantUptakeRate: arbPlantUptakeRate,
    nutrientUptakeRate: fc.float({ min: 0, max: Math.fround(20), noNaN: true }),
    ambientTemperature: arbTemperature,
    temperatureDriftRate: fc.float({ min: 0, max: Math.fround(5), noNaN: true }),
    phDriftRate: fc.float({ min: 0, max: Math.fround(1), noNaN: true }),
    bufferCapacity: fc.float({ min: 0, max: Math.fround(1), noNaN: true })
  })
});

/**
 * Generate a full valid configuration (all fields)
 */
const arbFullConfig = fc.record({
  reservoir: fc.record({
    capacity: arbReservoirCapacity,
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
    pumps: fc.constant([]),
    lights: fc.constant([]),
    valves: fc.constant([])
  }),
  physics: fc.record({
    evaporationRate: arbEvaporationRate,
    plantUptakeRate: arbPlantUptakeRate,
    nutrientUptakeRate: fc.float({ min: 0, max: Math.fround(20), noNaN: true }),
    ambientTemperature: arbTemperature,
    temperatureDriftRate: fc.float({ min: 0, max: Math.fround(5), noNaN: true }),
    phDriftRate: fc.float({ min: 0, max: Math.fround(1), noNaN: true }),
    bufferCapacity: fc.float({ min: 0, max: Math.fround(1), noNaN: true })
  }),
  simulation: fc.record({
    tickRate: arbTickRate,
    timeAcceleration: arbTimeAcceleration
  }),
  logging: fc.record({
    level: fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR),
    filepath: fc.constant('./logs/test.log'),
    rotationPolicy: fc.constantFrom('daily' as const, 'size' as const),
    maxSize: fc.option(fc.float({ min: 1, max: Math.fround(100), noNaN: true }), { nil: undefined })
  })
}) as fc.Arbitrary<SimulationConfig>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a temporary config file for testing
 */
function createTempConfigFile(config: any): string {
  const tempDir = path.join(__dirname, '../temp-configs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filepath = path.join(tempDir, `config-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
  fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
  return filepath;
}

/**
 * Clean up temporary config files
 */
function cleanupConfigFiles(): void {
  const tempDir = path.join(__dirname, '../temp-configs');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(tempDir, file));
      } catch (e) {
        // Ignore errors
      }
    }
  }
}

/**
 * Clean up temporary log files
 */
function cleanupLogFiles(): void {
  const logDir = path.join(__dirname, '../../logs');
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    for (const file of files) {
      if (file.startsWith('test')) {
        try {
          fs.unlinkSync(path.join(logDir, file));
        } catch (e) {
          // Ignore errors
        }
      }
    }
  }
}

// ============================================================================
// Property 35: Runtime Configuration Updates
// **Validates: Requirements 11.4**
// ============================================================================

describe('Property 35: Runtime Configuration Updates', () => {
  afterEach(() => {
    cleanupConfigFiles();
    cleanupLogFiles();
  });

  test('time acceleration updates take effect within one simulation tick', () => {
    fc.assert(
      fc.property(
        arbFullConfig,
        arbTimeAcceleration.filter(a => a > 1.1), // Ensure new acceleration is different from initial
        (initialConfig, newAcceleration) => {
          // Create simulation with initial config
          const configPath = createTempConfigFile(initialConfig);
          const loader = new ConfigurationLoader();
          const config = loader.loadFromFile(configPath);
          
          const simCore = new SimulationCore(config);
          simCore.start();
          
          // Get initial time acceleration
          const initialAcceleration = simCore.getTimeManager().getAcceleration();
          
          // Update time acceleration
          simCore.updateConfig({
            simulation: {
              tickRate: config.simulation!.tickRate,
              timeAcceleration: newAcceleration
            }
          });
          
          // Perform one tick
          simCore['tick']();
          
          // Check that new acceleration is applied
          const currentAcceleration = simCore.getTimeManager().getAcceleration();
          
          simCore.stop();
          
          // Verify the change took effect
          expect(currentAcceleration).toBeCloseTo(newAcceleration, 2);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('physics parameter updates take effect within one simulation tick', () => {
    fc.assert(
      fc.property(
        arbFullConfig,
        arbEvaporationRate,
        arbPlantUptakeRate,
        (initialConfig, newEvapRate, newUptakeRate) => {
          // Create simulation with initial config
          const configPath = createTempConfigFile(initialConfig);
          const loader = new ConfigurationLoader();
          const config = loader.loadFromFile(configPath);
          
          const simCore = new SimulationCore(config);
          simCore.start();
          
          // Update physics parameters
          simCore.updateConfig({
            physics: {
              evaporationRate: newEvapRate,
              plantUptakeRate: newUptakeRate,
              nutrientUptakeRate: config.physics.nutrientUptakeRate,
              ambientTemperature: config.physics.ambientTemperature,
              temperatureDriftRate: config.physics.temperatureDriftRate,
              phDriftRate: config.physics.phDriftRate,
              bufferCapacity: config.physics.bufferCapacity
            }
          });
          
          // Perform one tick
          simCore['tick']();
          
          // Get updated config
          const updatedConfig = simCore.getConfig();
          
          simCore.stop();
          
          // Verify the changes took effect
          expect(updatedConfig.physics.evaporationRate).toBeCloseTo(newEvapRate, 5);
          expect(updatedConfig.physics.plantUptakeRate).toBeCloseTo(newUptakeRate, 5);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('reservoir capacity updates take effect within one simulation tick', () => {
    fc.assert(
      fc.property(
        arbFullConfig,
        arbReservoirCapacity,
        (initialConfig, newCapacity) => {
          // Create simulation with initial config
          const configPath = createTempConfigFile(initialConfig);
          const loader = new ConfigurationLoader();
          const config = loader.loadFromFile(configPath);
          
          const simCore = new SimulationCore(config);
          simCore.start();
          
          // Update reservoir capacity
          simCore.updateConfig({
            reservoir: {
              capacity: newCapacity,
              initialWaterLevel: config.reservoir.initialWaterLevel
            }
          });
          
          // Perform one tick
          simCore['tick']();
          
          // Get updated config
          const updatedConfig = simCore.getConfig();
          
          simCore.stop();
          
          // Verify the change took effect
          expect(updatedConfig.reservoir.capacity).toBeCloseTo(newCapacity, 2);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('configuration updates do not require restart', () => {
    fc.assert(
      fc.property(
        arbFullConfig,
        arbTimeAcceleration,
        (initialConfig, newAcceleration) => {
          // Create simulation with initial config
          const configPath = createTempConfigFile(initialConfig);
          const loader = new ConfigurationLoader();
          const config = loader.loadFromFile(configPath);
          
          const simCore = new SimulationCore(config);
          simCore.start();
          
          // Verify simulation is running
          expect(simCore.isRunning()).toBe(true);
          
          // Update configuration
          simCore.updateConfig({
            simulation: {
              tickRate: config.simulation!.tickRate,
              timeAcceleration: newAcceleration
            }
          });
          
          // Verify simulation is still running (no restart required)
          expect(simCore.isRunning()).toBe(true);
          
          // Verify update took effect
          const currentAcceleration = simCore.getTimeManager().getAcceleration();
          expect(currentAcceleration).toBeCloseTo(newAcceleration, 2);
          
          simCore.stop();
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 36: Configuration Default Values
// **Validates: Requirements 11.5**
// ============================================================================

describe('Property 36: Configuration Default Values', () => {
  afterEach(() => {
    cleanupConfigFiles();
    cleanupLogFiles();
  });

  test('minimal configuration with only required fields operates successfully', () => {
    fc.assert(
      fc.property(
        arbMinimalConfig,
        (minimalConfig) => {
          // Create config file with only required fields
          const configPath = createTempConfigFile(minimalConfig);
          const loader = new ConfigurationLoader();
          
          // Load and apply defaults
          const config = loader.loadFromFile(configPath);
          
          // Verify defaults were applied for optional sections
          expect(config.simulation).toBeDefined();
          expect(config.simulation!.tickRate).toBe(DEFAULT_CONFIG.simulation!.tickRate);
          expect(config.simulation!.timeAcceleration).toBe(DEFAULT_CONFIG.simulation!.timeAcceleration);
          
          expect(config.logging).toBeDefined();
          expect(config.logging!.level).toBe(DEFAULT_CONFIG.logging!.level);
          expect(config.logging!.rotationPolicy).toBe(DEFAULT_CONFIG.logging!.rotationPolicy);
          
          // Physics is provided in minimal config, so it won't be replaced with defaults
          expect(config.physics).toBeDefined();
          
          // Verify simulation can start
          const simCore = new SimulationCore(config);
          simCore.start();
          expect(simCore.isRunning()).toBe(true);
          simCore.stop();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('sensor configurations receive default noise and drift values', () => {
    fc.assert(
      fc.property(
        arbMinimalConfig,
        (minimalConfig) => {
          // Create config file with only required sensor fields
          const configPath = createTempConfigFile(minimalConfig);
          const loader = new ConfigurationLoader();
          
          // Load and apply defaults
          const config = loader.loadFromFile(configPath);
          
          // Verify sensor defaults were applied
          expect(config.sensors.ph.noiseStdDev).toBeDefined();
          expect(config.sensors.ph.driftRate).toBeDefined();
          
          expect(config.sensors.ec.noiseStdDev).toBeDefined();
          expect(config.sensors.ec.driftRate).toBeDefined();
          
          expect(config.sensors.temperature.noiseStdDev).toBeDefined();
          expect(config.sensors.temperature.driftRate).toBeDefined();
          
          expect(config.sensors.waterLevel.noiseStdDev).toBeDefined();
          expect(config.sensors.waterLevel.driftRate).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('partial configuration merges with defaults correctly', () => {
    fc.assert(
      fc.property(
        arbMinimalConfig,
        arbTimeAcceleration,
        (minimalConfig, customAcceleration) => {
          // Create config with some optional fields
          const partialConfig = {
            ...minimalConfig,
            simulation: {
              timeAcceleration: customAcceleration
              // tickRate omitted - should get default
            }
          };
          
          const configPath = createTempConfigFile(partialConfig);
          const loader = new ConfigurationLoader();
          
          // Load and apply defaults
          const config = loader.loadFromFile(configPath);
          
          // Verify custom value is preserved
          expect(config.simulation!.timeAcceleration).toBeCloseTo(customAcceleration, 2);
          
          // Verify default is applied for omitted field
          expect(config.simulation!.tickRate).toBe(DEFAULT_CONFIG.simulation!.tickRate);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('empty actuator arrays are valid and use defaults', () => {
    fc.assert(
      fc.property(
        arbMinimalConfig,
        (minimalConfig) => {
          // Config with empty actuator arrays
          const configPath = createTempConfigFile(minimalConfig);
          const loader = new ConfigurationLoader();
          
          // Load and apply defaults
          const config = loader.loadFromFile(configPath);
          
          // Verify empty arrays are preserved
          expect(config.actuators.pumps).toEqual([]);
          expect(config.actuators.lights).toEqual([]);
          expect(config.actuators.valves).toEqual([]);
          
          // Verify simulation can start with no actuators
          const simCore = new SimulationCore(config);
          simCore.start();
          expect(simCore.isRunning()).toBe(true);
          simCore.stop();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('all default values are valid and allow simulation to operate', () => {
    fc.assert(
      fc.property(
        arbMinimalConfig,
        (minimalConfig) => {
          // Create config with only required fields
          const configPath = createTempConfigFile(minimalConfig);
          const loader = new ConfigurationLoader();
          const config = loader.loadFromFile(configPath);
          
          // Create and run simulation
          const simCore = new SimulationCore(config);
          simCore.start();
          
          // Let it run for a few ticks
          for (let i = 0; i < 5; i++) {
            simCore['tick']();
          }
          
          // Verify simulation is still running successfully
          expect(simCore.isRunning()).toBe(true);
          
          simCore.stop();
        }
      ),
      { numRuns: 30 }
    );
  });
});
