/**
 * Property-Based Tests for Scenario Management
 * 
 * Tests universal properties of test scenario loading and application including
 * state initialization and feature support.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 8.2, 8.5
 */

import * as fc from 'fast-check';
import { ScenarioLoader } from '../../src/config/scenario-loader';
import { SimulationCore } from '../../src/core/simulation-core';
import { ConfigurationLoader } from '../../src/config/configuration-loader';
import { TestScenario } from '../../src/types';
import { PHSensor } from '../../src/sensors/ph-sensor';
import { ECSensor } from '../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../src/sensors/water-level-sensor';
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
 * Generate valid test scenarios
 */
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
      time: fc.float({ min: 0, max: Math.fround(10000), noNaN: true }),
      type: fc.constantFrom('actuator_command' as const, 'parameter_change' as const, 'disturbance' as const),
      target: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      value: fc.oneof(
        fc.boolean(),
        fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
      )
    }),
    { maxLength: 10 }
  ),
  failures: fc.option(
    fc.array(
      fc.record({
        actuatorId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        failureTime: fc.float({ min: 0, max: Math.fround(10000), noNaN: true }),
        duration: fc.float({ min: 0, max: Math.fround(1000), noNaN: true })
      }),
      { maxLength: 5 }
    ),
    { nil: undefined }
  )
}) as fc.Arbitrary<TestScenario>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a temporary scenario file for testing
 */
function createTempScenarioFile(scenario: TestScenario): string {
  const tempDir = path.join(__dirname, '../temp-scenarios');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filepath = path.join(tempDir, `scenario-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
  fs.writeFileSync(filepath, JSON.stringify(scenario, null, 2));
  return filepath;
}

/**
 * Create a temporary config file for testing
 */
function createTempConfigFile(): string {
  const tempDir = path.join(__dirname, '../temp-configs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const minimalConfig = {
    reservoir: {
      capacity: 50,
      initialWaterLevel: 80
    },
    sensors: {
      ph: { id: 'ph', baseline: 6.5 },
      ec: { id: 'ec', baseline: 1.5 },
      temperature: { id: 'temperature', baseline: 22 },
      waterLevel: { id: 'water_level', baseline: 80 }
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
      phDriftRate: 0.1,
      bufferCapacity: 0.3
    }
  };
  
  const filepath = path.join(tempDir, `config-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
  fs.writeFileSync(filepath, JSON.stringify(minimalConfig, null, 2));
  return filepath;
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles(): void {
  const tempDirs = [
    path.join(__dirname, '../temp-scenarios'),
    path.join(__dirname, '../temp-configs'),
    path.join(__dirname, '../../logs')
  ];
  
  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith('scenario-') || file.startsWith('config-') || file.startsWith('test')) {
          try {
            fs.unlinkSync(path.join(dir, file));
          } catch (e) {
            // Ignore errors
          }
        }
      }
    }
  }
}

/**
 * Register sensors with the correct IDs that ScenarioLoader expects
 */
function registerSensors(simCore: SimulationCore, config: any): void {
  // Register sensors with IDs that match what ScenarioLoader expects
  simCore.registerSensor(new PHSensor({
    id: 'ph',
    baseline: config.sensors.ph.baseline,
    noiseStdDev: config.sensors.ph.noiseStdDev ?? 0.1
  }));
  
  simCore.registerSensor(new ECSensor({
    id: 'ec',
    baseline: config.sensors.ec.baseline,
    noiseStdDev: config.sensors.ec.noiseStdDev ?? 0.05
  }));
  
  simCore.registerSensor(new TemperatureSensor({
    id: 'temperature',
    baseline: config.sensors.temperature.baseline,
    noiseStdDev: config.sensors.temperature.noiseStdDev ?? 0.2
  }));
  
  simCore.registerSensor(new WaterLevelSensor({
    id: 'water_level',
    baseline: config.sensors.waterLevel.baseline,
    noiseStdDev: config.sensors.waterLevel.noiseStdDev ?? 1.0
  }));
}

// ============================================================================
// Property 21: Scenario State Initialization
// **Validates: Requirements 8.2**
// ============================================================================

describe('Property 21: Scenario State Initialization', () => {
  afterEach(() => {
    cleanupTempFiles();
  });

  test('all sensor baselines match scenario initial state after loading', () => {
    fc.assert(
      fc.property(
        arbTestScenario,
        (scenario) => {
          // Create scenario and config files
          const scenarioPath = createTempScenarioFile(scenario);
          const configPath = createTempConfigFile();
          
          // Load configuration and create simulation
          const configLoader = new ConfigurationLoader();
          const config = configLoader.loadFromFile(configPath);
          const simCore = new SimulationCore(config);
          
          // Register sensors with correct IDs before starting
          registerSensors(simCore, config);
          
          // Start simulation to initialize sensors
          simCore.start();
          
          // Load and apply scenario
          const scenarioLoader = new ScenarioLoader();
          const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
          scenarioLoader.applyScenario(simCore, loadedScenario);
          
          // Verify sensor baselines match initial state
          const phSensor = simCore.getSensor('ph');
          const ecSensor = simCore.getSensor('ec');
          const tempSensor = simCore.getSensor('temperature');
          const waterLevelSensor = simCore.getSensor('water_level');
          
          // Get raw values (without noise) to check baselines
          const phValue = phSensor.getRawValue();
          const ecValue = ecSensor.getRawValue();
          const tempValue = tempSensor.getRawValue();
          const waterLevelValue = waterLevelSensor.getRawValue();
          
          simCore.stop();
          
          // Verify values match scenario initial state
          expect(phValue).toBeCloseTo(scenario.initialState.ph, 2);
          expect(ecValue).toBeCloseTo(scenario.initialState.ec, 2);
          expect(tempValue).toBeCloseTo(scenario.initialState.temperature, 2);
          expect(waterLevelValue).toBeCloseTo(scenario.initialState.waterLevel, 2);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('scenario application preserves all initial state values', () => {
    fc.assert(
      fc.property(
        arbPH,
        arbEC,
        arbTemperature,
        arbWaterLevel,
        (ph, ec, temp, waterLevel) => {
          // Create scenario with specific initial state
          const scenario: TestScenario = {
            name: 'Test Scenario',
            description: 'Test initial state preservation',
            initialState: {
              ph,
              ec,
              temperature: temp,
              waterLevel
            },
            events: []
          };
          
          const scenarioPath = createTempScenarioFile(scenario);
          const configPath = createTempConfigFile();
          
          // Load and apply
          const configLoader = new ConfigurationLoader();
          const config = configLoader.loadFromFile(configPath);
          const simCore = new SimulationCore(config);
          
          // Register sensors with correct IDs before starting
          registerSensors(simCore, config);
          
          // Start simulation to initialize sensors
          simCore.start();
          
          const scenarioLoader = new ScenarioLoader();
          const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
          scenarioLoader.applyScenario(simCore, loadedScenario);
          
          // Verify all values are preserved
          expect(simCore.getSensor('ph').getRawValue()).toBeCloseTo(ph, 2);
          expect(simCore.getSensor('ec').getRawValue()).toBeCloseTo(ec, 2);
          expect(simCore.getSensor('temperature').getRawValue()).toBeCloseTo(temp, 2);
          expect(simCore.getSensor('water_level').getRawValue()).toBeCloseTo(waterLevel, 2);
          
          simCore.stop();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('scenario application does not throw errors', () => {
    fc.assert(
      fc.property(
        arbTestScenario,
        (scenario) => {
          const scenarioPath = createTempScenarioFile(scenario);
          const configPath = createTempConfigFile();
          
          const configLoader = new ConfigurationLoader();
          const config = configLoader.loadFromFile(configPath);
          const simCore = new SimulationCore(config);
          
          // Register sensors with correct IDs before starting
          registerSensors(simCore, config);
          
          // Start simulation to initialize sensors
          simCore.start();
          
          // Apply scenario
          const scenarioLoader = new ScenarioLoader();
          const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
          
          // Should apply without throwing
          expect(() => {
            scenarioLoader.applyScenario(simCore, loadedScenario);
          }).not.toThrow();
          
          // Verify baseline was set correctly
          const phValue = simCore.getSensor('ph').getRawValue();
          expect(phValue).toBeCloseTo(scenario.initialState.ph, 2);
          
          simCore.stop();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================================
// Property 23: Scenario Feature Support
// **Validates: Requirements 8.5**
// ============================================================================

describe('Property 23: Scenario Feature Support', () => {
  afterEach(() => {
    cleanupTempFiles();
  });

  test('scenarios with initial values, events, and failures are all parsed successfully', () => {
    fc.assert(
      fc.property(
        arbTestScenario.filter(s => s.events.length > 0 && s.failures !== undefined && s.failures.length > 0),
        (scenario) => {
          const scenarioPath = createTempScenarioFile(scenario);
          
          const scenarioLoader = new ScenarioLoader();
          
          // Should parse without throwing
          expect(() => {
            const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
            
            // Verify all three types of elements are present
            expect(loadedScenario.initialState).toBeDefined();
            expect(loadedScenario.events).toBeDefined();
            expect(loadedScenario.events.length).toBeGreaterThan(0);
            expect(loadedScenario.failures).toBeDefined();
            expect(loadedScenario.failures!.length).toBeGreaterThan(0);
          }).not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('scenarios with only initial values are valid', () => {
    fc.assert(
      fc.property(
        arbPH,
        arbEC,
        arbTemperature,
        arbWaterLevel,
        (ph, ec, temp, waterLevel) => {
          const scenario: TestScenario = {
            name: 'Minimal Scenario',
            description: 'Only initial state',
            initialState: {
              ph,
              ec,
              temperature: temp,
              waterLevel
            },
            events: []
          };
          
          const scenarioPath = createTempScenarioFile(scenario);
          const scenarioLoader = new ScenarioLoader();
          
          // Should parse and validate successfully
          expect(() => {
            const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
            expect(loadedScenario.initialState).toBeDefined();
            expect(loadedScenario.events).toEqual([]);
          }).not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('scenarios with events are applied correctly', () => {
    fc.assert(
      fc.property(
        arbTestScenario.filter(s => s.events.length > 0),
        (scenario) => {
          const scenarioPath = createTempScenarioFile(scenario);
          const configPath = createTempConfigFile();
          
          const configLoader = new ConfigurationLoader();
          const config = configLoader.loadFromFile(configPath);
          const simCore = new SimulationCore(config);
          
          // Register sensors with correct IDs before starting
          registerSensors(simCore, config);
          
          // Start simulation to initialize sensors
          simCore.start();
          
          const scenarioLoader = new ScenarioLoader();
          const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
          
          // Should apply without throwing
          expect(() => {
            scenarioLoader.applyScenario(simCore, loadedScenario);
          }).not.toThrow();
          
          simCore.stop();
          
          // Verify events were scheduled (check internal state if accessible)
          // Note: This is a basic check - full event scheduling verification
          // would require access to simulation core internals
        }
      ),
      { numRuns: 30 }
    );
  });

  test('scenarios with failures are applied correctly', () => {
    fc.assert(
      fc.property(
        arbTestScenario.filter(s => s.failures !== undefined && s.failures.length > 0),
        (scenario) => {
          const scenarioPath = createTempScenarioFile(scenario);
          const configPath = createTempConfigFile();
          
          const configLoader = new ConfigurationLoader();
          const config = configLoader.loadFromFile(configPath);
          const simCore = new SimulationCore(config);
          
          // Register sensors with correct IDs before starting
          registerSensors(simCore, config);
          
          // Start simulation to initialize sensors
          simCore.start();
          
          const scenarioLoader = new ScenarioLoader();
          const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
          
          // Should apply without throwing
          expect(() => {
            scenarioLoader.applyScenario(simCore, loadedScenario);
          }).not.toThrow();
          
          simCore.stop();
          
          // Verify failures were scheduled (check internal state if accessible)
          // Note: This is a basic check - full failure scheduling verification
          // would require access to simulation core internals
        }
      ),
      { numRuns: 30 }
    );
  });

  test('all three scenario element types can coexist', () => {
    fc.assert(
      fc.property(
        arbTestScenario.filter(s => 
          s.events.length > 0 && 
          s.failures !== undefined && 
          s.failures.length > 0
        ),
        (scenario) => {
          const scenarioPath = createTempScenarioFile(scenario);
          const configPath = createTempConfigFile();
          
          const configLoader = new ConfigurationLoader();
          const config = configLoader.loadFromFile(configPath);
          const simCore = new SimulationCore(config);
          
          // Register sensors with correct IDs before starting
          registerSensors(simCore, config);
          
          // Start simulation to initialize sensors
          simCore.start();
          
          const scenarioLoader = new ScenarioLoader();
          const loadedScenario = scenarioLoader.loadFromFile(scenarioPath);
          
          // Should apply all three types without conflict
          expect(() => {
            scenarioLoader.applyScenario(simCore, loadedScenario);
          }).not.toThrow();
          
          // Verify initial state was applied
          const phValue = simCore.getSensor('ph').getRawValue();
          expect(phValue).toBeCloseTo(scenario.initialState.ph, 2);
          
          simCore.stop();
        }
      ),
      { numRuns: 30 }
    );
  });
});
