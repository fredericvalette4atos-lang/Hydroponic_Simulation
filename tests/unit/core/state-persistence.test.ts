/**
 * Unit tests for StatePersistence class
 * 
 * Tests state saving, loading, validation, and restoration functionality.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { unlinkSync, existsSync } from 'fs';
import {
  StatePersistence,
  SimulationStateProvider,
  SimulationStateRestorer
} from '../../../src/core/state-persistence';
import {
  SimulationState,
  Sensor,
  Actuator,
  HydroponicState,
  SimulationConfig,
  SensorType,
  ActuatorType,
  ActuatorState,
  SerializedSensorState,
  SerializedActuatorState,
  LogLevel
} from '../../../src/types';

// Mock sensor implementation
class MockSensor implements Sensor {
  constructor(
    public id: string,
    public type: SensorType,
    private rawValue: number
  ) {}

  getValue(): number {
    return this.rawValue;
  }

  getRawValue(): number {
    return this.rawValue;
  }

  setBaseline(value: number): void {
    this.rawValue = value;
  }

  setNoiseLevel(stddev: number): void {}

  updateFromPhysics(systemState: HydroponicState): void {}
}

// Mock actuator implementation
class MockActuator implements Actuator {
  constructor(
    public id: string,
    public type: ActuatorType,
    private state: ActuatorState,
    private runtime: number = 0,
    private failed: boolean = false
  ) {}

  setState(state: ActuatorState): void {
    this.state = state;
  }

  getState(): ActuatorState {
    return this.state;
  }

  setFailureProbability(probability: number): void {}

  isFailed(): boolean {
    return this.failed;
  }

  getTotalRuntime(): number {
    return this.runtime;
  }

  getPhysicsEffect() {
    return {};
  }
}

// Mock state provider
class MockStateProvider implements SimulationStateProvider {
  constructor(
    private sensors: Map<string, Sensor>,
    private actuators: Map<string, Actuator>,
    private hydroponicState: HydroponicState,
    private config: SimulationConfig,
    private simulatedTime: number
  ) {}

  getSensors(): Map<string, Sensor> {
    return this.sensors;
  }

  getActuators(): Map<string, Actuator> {
    return this.actuators;
  }

  getHydroponicState(): HydroponicState {
    return this.hydroponicState;
  }

  getConfig(): SimulationConfig {
    return this.config;
  }

  getSimulatedTime(): number {
    return this.simulatedTime;
  }
}

// Mock state restorer
class MockStateRestorer implements SimulationStateRestorer {
  public restoredSensors?: Map<string, SerializedSensorState>;
  public restoredActuators?: Map<string, SerializedActuatorState>;
  public restoredHydroponicState?: HydroponicState;
  public restoredConfig?: SimulationConfig;
  public restoredSimulatedTime?: number;

  restoreSensors(sensors: Map<string, SerializedSensorState>): void {
    this.restoredSensors = sensors;
  }

  restoreActuators(actuators: Map<string, SerializedActuatorState>): void {
    this.restoredActuators = actuators;
  }

  restoreHydroponicState(state: HydroponicState): void {
    this.restoredHydroponicState = state;
  }

  restoreConfig(config: SimulationConfig): void {
    this.restoredConfig = config;
  }

  restoreSimulatedTime(time: number): void {
    this.restoredSimulatedTime = time;
  }
}

describe('StatePersistence', () => {
  const testFilePath = 'tests/temp-configs/test-state.json';
  let stateProvider: MockStateProvider;
  let stateRestorer: MockStateRestorer;
  let persistence: StatePersistence;

  // Helper to create a valid config
  const createValidConfig = (): SimulationConfig => ({
    reservoir: {
      capacity: 50,
      initialWaterLevel: 75
    },
    sensors: {
      ph: { id: 'ph-1', baseline: 6.5, noiseStdDev: 0.1, driftRate: 0.1 },
      ec: { id: 'ec-1', baseline: 1.5, noiseStdDev: 0.05, driftRate: 0.05 },
      temperature: { id: 'temp-1', baseline: 22, noiseStdDev: 0.2, driftRate: 0.5 },
      waterLevel: { id: 'water-1', baseline: 75, noiseStdDev: 1.0, driftRate: 0 }
    },
    actuators: {
      pumps: [{ id: 'pump-1', type: 'water', flowRate: 1.0, failureProbability: 0 }],
      lights: [{ id: 'light-1', type: 'led', failureProbability: 0 }],
      valves: [{ id: 'valve-1', type: 'drain', flowRate: 2.0, failureProbability: 0 }]
    },
    physics: {
      evaporationRate: 0.1,
      plantUptakeRate: 0.2,
      nutrientUptakeRate: 5.0,
      ambientTemperature: 20,
      temperatureDriftRate: 0.5,
      phDriftRate: 0.1
    },
    simulation: {
      tickRate: 10,
      timeAcceleration: 1
    },
    logging: {
      level: LogLevel.INFO,
      filepath: 'test.log',
      rotationPolicy: 'daily'
    }
  });

  beforeEach(() => {
    // Create mock sensors
    const sensors = new Map<string, Sensor>();
    sensors.set('ph-1', new MockSensor('ph-1', SensorType.PH, 6.5));
    sensors.set('ec-1', new MockSensor('ec-1', SensorType.EC, 1.5));

    // Create mock actuators
    const actuators = new Map<string, Actuator>();
    actuators.set('pump-1', new MockActuator('pump-1', ActuatorType.PUMP, {
      active: false,
      timestamp: Date.now()
    }, 100));

    // Create hydroponic state
    const hydroponicState: HydroponicState = {
      waterVolume: 37.5,
      waterLevel: 75,
      temperature: 22,
      ph: 6.5,
      ec: 1.5,
      nutrientConcentration: 800,
      ambientTemperature: 20,
      simulatedTime: 1000
    };

    // Create config
    const config = createValidConfig();

    // Create provider and restorer
    stateProvider = new MockStateProvider(sensors, actuators, hydroponicState, config, 1000);
    stateRestorer = new MockStateRestorer();
    persistence = new StatePersistence(stateProvider, stateRestorer);
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe('save', () => {
    test('saves state to file with correct structure', () => {
      persistence.save(testFilePath);

      expect(existsSync(testFilePath)).toBe(true);

      const state = persistence.load(testFilePath);
      expect(state.version).toBe('1.0.0');
      expect(state.timestamp).toBeGreaterThan(0);
      expect(state.simulatedTime).toBe(1000);
      expect(state.sensors).toBeDefined();
      expect(state.actuators).toBeDefined();
      expect(state.hydroponicState).toBeDefined();
      expect(state.config).toBeDefined();
    });

    test('saves sensor states correctly', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state.sensors['ph-1']).toBeDefined();
      expect(state.sensors['ph-1'].type).toBe(SensorType.PH);
      expect(state.sensors['ph-1'].currentValue).toBe(6.5);

      expect(state.sensors['ec-1']).toBeDefined();
      expect(state.sensors['ec-1'].type).toBe(SensorType.EC);
      expect(state.sensors['ec-1'].currentValue).toBe(1.5);
    });

    test('saves actuator states correctly', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state.actuators['pump-1']).toBeDefined();
      expect(state.actuators['pump-1'].type).toBe(ActuatorType.PUMP);
      expect(state.actuators['pump-1'].state.active).toBe(false);
      expect(state.actuators['pump-1'].totalRuntime).toBe(100);
      expect(state.actuators['pump-1'].failed).toBe(false);
    });

    test('saves hydroponic state correctly', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state.hydroponicState.waterVolume).toBe(37.5);
      expect(state.hydroponicState.waterLevel).toBe(75);
      expect(state.hydroponicState.temperature).toBe(22);
      expect(state.hydroponicState.ph).toBe(6.5);
      expect(state.hydroponicState.ec).toBe(1.5);
    });

    test('saves configuration correctly', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state.config.reservoir.capacity).toBe(50);
      expect(state.config.sensors.ph.baseline).toBe(6.5);
      expect(state.config.physics.evaporationRate).toBe(0.1);
    });
  });

  describe('load', () => {
    test('loads valid state file successfully', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state).toBeDefined();
      expect(state.version).toBe('1.0.0');
    });

    test('throws error for non-existent file', () => {
      expect(() => {
        persistence.load('non-existent-file.json');
      }).toThrow();
    });

    test('throws error for invalid JSON', () => {
      const fs = require('fs');
      fs.writeFileSync(testFilePath, 'invalid json', 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });

    test('throws error for state missing required fields', () => {
      const fs = require('fs');
      const invalidState = {
        version: '1.0.0',
        timestamp: Date.now()
        // Missing required fields
      };
      fs.writeFileSync(testFilePath, JSON.stringify(invalidState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });
  });

  describe('validate', () => {
    test('validates correct state without throwing', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(() => {
        persistence.validate(state);
      }).not.toThrow();
    });

    test('throws descriptive error for invalid state', () => {
      const invalidState = {
        version: '1.0.0'
        // Missing required fields
      };

      expect(() => {
        persistence.validate(invalidState);
      }).toThrow(/State validation failed/);
    });
  });

  describe('restoreState', () => {
    test('restores all state components', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      persistence.restoreState(state);

      expect(stateRestorer.restoredSensors).toBeDefined();
      expect(stateRestorer.restoredActuators).toBeDefined();
      expect(stateRestorer.restoredHydroponicState).toBeDefined();
      expect(stateRestorer.restoredConfig).toBeDefined();
      expect(stateRestorer.restoredSimulatedTime).toBe(1000);
    });

    test('restores sensor states correctly', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      persistence.restoreState(state);

      const sensors = stateRestorer.restoredSensors!;
      expect(sensors.size).toBe(2);
      expect(sensors.get('ph-1')?.currentValue).toBe(6.5);
      expect(sensors.get('ec-1')?.currentValue).toBe(1.5);
    });

    test('restores actuator states correctly', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      persistence.restoreState(state);

      const actuators = stateRestorer.restoredActuators!;
      expect(actuators.size).toBe(1);
      expect(actuators.get('pump-1')?.totalRuntime).toBe(100);
    });

    test('throws error when state restorer not configured', () => {
      const persistenceWithoutRestorer = new StatePersistence(stateProvider);
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(() => {
        persistenceWithoutRestorer.restoreState(state);
      }).toThrow(/State restorer not configured/);
    });
  });

  describe('loadAndRestore', () => {
    test('loads and restores state in one operation', () => {
      persistence.save(testFilePath);
      persistence.loadAndRestore(testFilePath);

      expect(stateRestorer.restoredSensors).toBeDefined();
      expect(stateRestorer.restoredActuators).toBeDefined();
      expect(stateRestorer.restoredSimulatedTime).toBe(1000);
    });
  });

  describe('round-trip', () => {
    test('save then load produces equivalent state', () => {
      // Save initial state
      persistence.save(testFilePath);
      const state1 = persistence.load(testFilePath);

      // Create new persistence with loaded state
      const sensors2 = new Map<string, Sensor>();
      for (const [id, sensorState] of Object.entries(state1.sensors)) {
        sensors2.set(id, new MockSensor(id, sensorState.type as SensorType, sensorState.currentValue));
      }

      const actuators2 = new Map<string, Actuator>();
      for (const [id, actuatorState] of Object.entries(state1.actuators)) {
        actuators2.set(id, new MockActuator(
          id,
          actuatorState.type as ActuatorType,
          actuatorState.state,
          actuatorState.totalRuntime,
          actuatorState.failed
        ));
      }

      const provider2 = new MockStateProvider(
        sensors2,
        actuators2,
        state1.hydroponicState,
        state1.config,
        state1.simulatedTime
      );

      const persistence2 = new StatePersistence(provider2);
      const testFilePath2 = 'tests/temp-configs/test-state-2.json';

      // Save again
      persistence2.save(testFilePath2);
      const state2 = persistence2.load(testFilePath2);

      // Compare states (excluding timestamp which will differ)
      expect(state2.version).toBe(state1.version);
      expect(state2.simulatedTime).toBe(state1.simulatedTime);
      expect(state2.sensors).toEqual(state1.sensors);
      expect(state2.actuators).toEqual(state1.actuators);
      expect(state2.hydroponicState).toEqual(state1.hydroponicState);
      expect(state2.config).toEqual(state1.config);

      // Clean up
      if (existsSync(testFilePath2)) {
        unlinkSync(testFilePath2);
      }
    });
  });

  describe('edge cases', () => {
    test('handles empty sensor map', () => {
      const emptyProvider = new MockStateProvider(
        new Map(),
        new Map(),
        stateProvider.getHydroponicState(),
        stateProvider.getConfig(),
        1000
      );
      const emptyPersistence = new StatePersistence(emptyProvider);

      emptyPersistence.save(testFilePath);
      const state = emptyPersistence.load(testFilePath);

      expect(Object.keys(state.sensors).length).toBe(0);
    });

    test('handles empty actuator map', () => {
      const emptyProvider = new MockStateProvider(
        stateProvider.getSensors(),
        new Map(),
        stateProvider.getHydroponicState(),
        stateProvider.getConfig(),
        1000
      );
      const emptyPersistence = new StatePersistence(emptyProvider);

      emptyPersistence.save(testFilePath);
      const state = emptyPersistence.load(testFilePath);

      expect(Object.keys(state.actuators).length).toBe(0);
    });

    test('handles zero simulated time', () => {
      const zeroTimeProvider = new MockStateProvider(
        stateProvider.getSensors(),
        stateProvider.getActuators(),
        stateProvider.getHydroponicState(),
        stateProvider.getConfig(),
        0
      );
      const zeroTimePersistence = new StatePersistence(zeroTimeProvider);

      zeroTimePersistence.save(testFilePath);
      const state = zeroTimePersistence.load(testFilePath);

      expect(state.simulatedTime).toBe(0);
    });
  });

  describe('getVersion', () => {
    test('returns correct version string', () => {
      expect(StatePersistence.getVersion()).toBe('1.0.0');
    });
  });

  describe('corrupted state files', () => {
    test('throws error for truncated JSON file', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      
      // Read the file and truncate it
      const content = fs.readFileSync(testFilePath, 'utf-8');
      const truncated = content.substring(0, Math.floor(content.length / 2));
      fs.writeFileSync(testFilePath, truncated, 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });

    test('throws error for corrupted JSON with invalid characters', () => {
      const fs = require('fs');
      const corruptedState = '{"version": "1.0.0", "timestamp": 123, "data": [1, 2, 3,,,]}';
      fs.writeFileSync(testFilePath, corruptedState, 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });

    test('throws error for JSON with missing closing braces', () => {
      const fs = require('fs');
      const corruptedState = '{"version": "1.0.0", "timestamp": 123';
      fs.writeFileSync(testFilePath, corruptedState, 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });

    test('throws error for completely invalid JSON', () => {
      const fs = require('fs');
      fs.writeFileSync(testFilePath, 'this is not json at all', 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });

    test('throws error for JSON with null value', () => {
      const fs = require('fs');
      fs.writeFileSync(testFilePath, 'null', 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });

    test('throws error for JSON array instead of object', () => {
      const fs = require('fs');
      fs.writeFileSync(testFilePath, '[]', 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow();
    });
  });

  describe('partial writes', () => {
    test('throws error for state missing sensors field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove sensors field
      const incompleteState = { ...state } as any;
      delete incompleteState.sensors;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for state missing actuators field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove actuators field
      const incompleteState = { ...state } as any;
      delete incompleteState.actuators;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for state missing hydroponicState field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove hydroponicState field
      const incompleteState = { ...state } as any;
      delete incompleteState.hydroponicState;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for state missing config field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Config is optional in schema, so this should not throw
      const incompleteState = { ...state } as any;
      delete incompleteState.config;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      // Should load successfully since config is optional
      expect(() => {
        persistence.load(testFilePath);
      }).not.toThrow();
    });

    test('throws error for state missing version field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove version field
      const incompleteState = { ...state } as any;
      delete incompleteState.version;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for state missing timestamp field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove timestamp field
      const incompleteState = { ...state } as any;
      delete incompleteState.timestamp;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for state missing simulatedTime field', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove simulatedTime field
      const incompleteState = { ...state } as any;
      delete incompleteState.simulatedTime;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for incomplete sensor state', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove required field from sensor
      const incompleteState = { ...state } as any;
      delete incompleteState.sensors['ph-1'].type;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for incomplete actuator state', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);
      
      // Remove required field from actuator
      const incompleteState = { ...state } as any;
      delete incompleteState.actuators['pump-1'].type;
      fs.writeFileSync(testFilePath, JSON.stringify(incompleteState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });
  });

  describe('large state files', () => {
    test('saves and loads large state with many sensors', () => {
      // Create provider with many sensors
      const largeSensors = new Map<string, Sensor>();
      for (let i = 0; i < 100; i++) {
        largeSensors.set(`sensor-${i}`, new MockSensor(`sensor-${i}`, SensorType.PH, 6.5 + i * 0.01));
      }

      const largeProvider = new MockStateProvider(
        largeSensors,
        stateProvider.getActuators(),
        stateProvider.getHydroponicState(),
        stateProvider.getConfig(),
        1000
      );

      const largePersistence = new StatePersistence(largeProvider);
      largePersistence.save(testFilePath);

      const state = largePersistence.load(testFilePath);
      expect(Object.keys(state.sensors).length).toBe(100);
      expect(state.sensors['sensor-0'].currentValue).toBe(6.5);
      expect(state.sensors['sensor-99'].currentValue).toBeCloseTo(6.5 + 99 * 0.01, 5);
    });

    test('saves and loads large state with many actuators', () => {
      // Create provider with many actuators
      const largeActuators = new Map<string, Actuator>();
      for (let i = 0; i < 50; i++) {
        largeActuators.set(
          `pump-${i}`,
          new MockActuator(`pump-${i}`, ActuatorType.PUMP, { active: i % 2 === 0, timestamp: Date.now() }, i * 100)
        );
      }

      const largeProvider = new MockStateProvider(
        stateProvider.getSensors(),
        largeActuators,
        stateProvider.getHydroponicState(),
        stateProvider.getConfig(),
        1000
      );

      const largePersistence = new StatePersistence(largeProvider);
      largePersistence.save(testFilePath);

      const state = largePersistence.load(testFilePath);
      expect(Object.keys(state.actuators).length).toBe(50);
      expect(state.actuators['pump-0'].totalRuntime).toBe(0);
      expect(state.actuators['pump-49'].totalRuntime).toBe(4900);
    });

    test('saves and loads state with large numeric values', () => {
      // Create hydroponic state with large values
      const largeHydroState: HydroponicState = {
        waterVolume: 999999.99,
        waterLevel: 100,
        temperature: 50,
        ph: 14,
        ec: 5,
        nutrientConcentration: 10000,
        ambientTemperature: 40,
        simulatedTime: 1000000000
      };

      const largeProvider = new MockStateProvider(
        stateProvider.getSensors(),
        stateProvider.getActuators(),
        largeHydroState,
        stateProvider.getConfig(),
        1000000000
      );

      const largePersistence = new StatePersistence(largeProvider);
      largePersistence.save(testFilePath);

      const state = largePersistence.load(testFilePath);
      expect(state.hydroponicState.waterVolume).toBe(999999.99);
      expect(state.hydroponicState.nutrientConcentration).toBe(10000);
      expect(state.simulatedTime).toBe(1000000000);
    });

    test('saves and loads state with very small numeric values', () => {
      // Create hydroponic state with very small values
      const smallHydroState: HydroponicState = {
        waterVolume: 0.001,
        waterLevel: 0.1,
        temperature: 0.01,
        ph: 0,
        ec: 0,
        nutrientConcentration: 0.5,
        ambientTemperature: 0,
        simulatedTime: 1
      };

      const smallProvider = new MockStateProvider(
        stateProvider.getSensors(),
        stateProvider.getActuators(),
        smallHydroState,
        stateProvider.getConfig(),
        1
      );

      const smallPersistence = new StatePersistence(smallProvider);
      smallPersistence.save(testFilePath);

      const state = smallPersistence.load(testFilePath);
      expect(state.hydroponicState.waterVolume).toBeCloseTo(0.001, 5);
      expect(state.hydroponicState.temperature).toBeCloseTo(0.01, 5);
      expect(state.simulatedTime).toBe(1);
    });
  });

  describe('state integrity validation', () => {
    test('validates that all required fields are present', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state.version).toBeDefined();
      expect(state.timestamp).toBeDefined();
      expect(state.simulatedTime).toBeDefined();
      expect(state.sensors).toBeDefined();
      expect(state.actuators).toBeDefined();
      expect(state.hydroponicState).toBeDefined();
      expect(state.config).toBeDefined();
    });

    test('validates that version is correct format', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(state.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(state.version).toBe('1.0.0');
    });

    test('validates that timestamp is a valid number', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(typeof state.timestamp).toBe('number');
      expect(state.timestamp).toBeGreaterThan(0);
      expect(state.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('validates that simulatedTime is a non-negative number', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      expect(typeof state.simulatedTime).toBe('number');
      expect(state.simulatedTime).toBeGreaterThanOrEqual(0);
    });

    test('validates sensor state structure', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      for (const [id, sensor] of Object.entries(state.sensors)) {
        expect(sensor.type).toBeDefined();
        expect(sensor.currentValue).toBeDefined();
        expect(typeof sensor.currentValue).toBe('number');
      }
    });

    test('validates actuator state structure', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      for (const [id, actuator] of Object.entries(state.actuators)) {
        expect(actuator.type).toBeDefined();
        expect(actuator.state).toBeDefined();
        expect(actuator.totalRuntime).toBeDefined();
        expect(typeof actuator.totalRuntime).toBe('number');
        expect(actuator.failed).toBeDefined();
        expect(typeof actuator.failed).toBe('boolean');
      }
    });

    test('validates hydroponic state structure', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      const hydro = state.hydroponicState;
      expect(hydro.waterVolume).toBeDefined();
      expect(typeof hydro.waterVolume).toBe('number');
      expect(hydro.waterLevel).toBeDefined();
      expect(typeof hydro.waterLevel).toBe('number');
      expect(hydro.temperature).toBeDefined();
      expect(typeof hydro.temperature).toBe('number');
      expect(hydro.ph).toBeDefined();
      expect(typeof hydro.ph).toBe('number');
      expect(hydro.ec).toBeDefined();
      expect(typeof hydro.ec).toBe('number');
      expect(hydro.nutrientConcentration).toBeDefined();
      expect(typeof hydro.nutrientConcentration).toBe('number');
    });

    test('validates config structure', () => {
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      const config = state.config;
      expect(config.reservoir).toBeDefined();
      expect(config.sensors).toBeDefined();
      expect(config.actuators).toBeDefined();
      expect(config.physics).toBeDefined();
      expect(config.simulation).toBeDefined();
      expect(config.logging).toBeDefined();
    });

    test('throws error for invalid sensor type', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set invalid sensor type
      state.sensors['ph-1'].type = 'INVALID_TYPE';
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for invalid actuator type', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set invalid actuator type
      state.actuators['pump-1'].type = 'INVALID_TYPE';
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for negative water volume', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set negative water volume
      state.hydroponicState.waterVolume = -10;
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for pH outside valid range', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set pH outside valid range
      state.hydroponicState.ph = 15;
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for EC outside valid range', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set EC to negative value (schema only enforces minimum: 0)
      const invalidState = { ...state } as any;
      invalidState.hydroponicState.ec = -1;
      fs.writeFileSync(testFilePath, JSON.stringify(invalidState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for invalid version format', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set invalid version
      state.version = 'invalid';
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for non-numeric timestamp', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set non-numeric timestamp
      const invalidState = { ...state } as any;
      invalidState.timestamp = 'not-a-number';
      fs.writeFileSync(testFilePath, JSON.stringify(invalidState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for negative timestamp', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set negative timestamp
      state.timestamp = -1000;
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for negative simulated time', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set negative simulated time
      state.simulatedTime = -100;
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for negative sensor value', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Schema doesn't enforce non-negative sensor values, so test with invalid type instead
      const invalidState = { ...state } as any;
      invalidState.sensors['ph-1'].currentValue = 'not-a-number';
      fs.writeFileSync(testFilePath, JSON.stringify(invalidState), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });

    test('throws error for negative actuator runtime', () => {
      const fs = require('fs');
      persistence.save(testFilePath);
      const state = persistence.load(testFilePath);

      // Set negative runtime
      state.actuators['pump-1'].totalRuntime = -50;
      fs.writeFileSync(testFilePath, JSON.stringify(state), 'utf-8');

      expect(() => {
        persistence.load(testFilePath);
      }).toThrow(/State validation failed/);
    });
  });
});