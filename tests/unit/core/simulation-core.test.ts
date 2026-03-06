/**
 * Unit tests for SimulationCore
 * 
 * Tests the main orchestrator class including:
 * - Lifecycle management (start, stop, pause, resume)
 * - Component registration (sensors and actuators)
 * - Simulation loop execution
 * - Integration between subsystems
 */

import { SimulationCore } from '../../../src/core/simulation-core';
import { PHSensor } from '../../../src/sensors/ph-sensor';
import { ECSensor } from '../../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../../src/sensors/water-level-sensor';
import { PumpActuator } from '../../../src/actuators/pump-actuator';
import { LightActuator } from '../../../src/actuators/light-actuator';
import { SimulationConfig, LogLevel, PumpType } from '../../../src/types';

describe('SimulationCore', () => {
  let config: SimulationConfig;

  beforeEach(() => {
    // Create a minimal test configuration
    config = {
      reservoir: {
        capacity: 100,
        initialWaterLevel: 50
      },
      sensors: {
        ph: {
          id: 'ph-1',
          baseline: 6.5,
          noiseStdDev: 0.1,
          driftRate: 0.5
        },
        ec: {
          id: 'ec-1',
          baseline: 1.5,
          noiseStdDev: 0.05
        },
        temperature: {
          id: 'temp-1',
          baseline: 22.0,
          noiseStdDev: 0.2,
          driftRate: 2.0
        },
        waterLevel: {
          id: 'water-1',
          baseline: 50.0,
          noiseStdDev: 1.0
        }
      },
      actuators: {
        pumps: [
          {
            id: 'pump-1',
            type: 'water',
            flowRate: 10,
            failureProbability: 0.0
          }
        ],
        lights: [
          {
            id: 'light-1',
            type: 'light',
            failureProbability: 0.0
          }
        ],
        valves: []
      },
      physics: {
        evaporationRate: 0.5,
        plantUptakeRate: 0.3,
        nutrientUptakeRate: 10,
        ambientTemperature: 20.0,
        temperatureDriftRate: 1.0,
        phDriftRate: 0.1
      },
      simulation: {
        tickRate: 10,
        timeAcceleration: 1
      },
      logging: {
        level: LogLevel.ERROR, // Reduce noise in tests
        filepath: './logs/test-simulation.log',
        rotationPolicy: 'daily'
      }
    };
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      const sim = new SimulationCore(config);
      
      expect(sim.getConfig()).toEqual(config);
      expect(sim.getSimulationState()).toBe('stopped');
      expect(sim.isRunning()).toBe(false);
      expect(sim.isPaused()).toBe(false);
    });

    it('should initialize TimeManager with configured acceleration', () => {
      const sim = new SimulationCore(config);
      const timeManager = sim.getTimeManager();
      
      expect(timeManager.getAcceleration()).toBe(1);
    });

    it('should initialize EventLogger', () => {
      const sim = new SimulationCore(config);
      const logger = sim.getEventLogger();
      
      expect(logger).toBeDefined();
      expect(logger.getLogLevel()).toBe(LogLevel.ERROR);
    });

    it('should initialize HydroponicPhysicsModel with correct initial state', () => {
      const sim = new SimulationCore(config);
      const physics = sim.getPhysicsModel();
      const state = physics.getState();
      
      expect(state.waterVolume).toBe(50); // 50% of 100L capacity
      expect(state.waterLevel).toBe(50);
      expect(state.temperature).toBe(22.0);
      expect(state.ph).toBe(6.5);
      expect(state.ec).toBe(1.5);
    });
  });

  describe('Component Registration', () => {
    it('should register sensors', () => {
      const sim = new SimulationCore(config);
      const sensor = new PHSensor({ id: 'test-ph', baseline: 7.0 });
      
      sim.registerSensor(sensor);
      
      const retrieved = sim.getSensor('test-ph');
      expect(retrieved).toBe(sensor);
    });

    it('should register actuators', () => {
      const sim = new SimulationCore(config);
      const actuator = new PumpActuator({
        id: 'test-pump',
        pumpType: PumpType.WATER,
        flowRate: 5
      });
      
      sim.registerActuator(actuator);
      
      const retrieved = sim.getActuator('test-pump');
      expect(retrieved).toBe(actuator);
    });

    it('should throw error when registering duplicate sensor', () => {
      const sim = new SimulationCore(config);
      const sensor1 = new PHSensor({ id: 'test-ph', baseline: 7.0 });
      const sensor2 = new PHSensor({ id: 'test-ph', baseline: 6.0 });
      
      sim.registerSensor(sensor1);
      
      expect(() => sim.registerSensor(sensor2)).toThrow('already registered');
    });

    it('should throw error when registering duplicate actuator', () => {
      const sim = new SimulationCore(config);
      const actuator1 = new PumpActuator({
        id: 'test-pump',
        pumpType: PumpType.WATER,
        flowRate: 5
      });
      const actuator2 = new PumpActuator({
        id: 'test-pump',
        pumpType: PumpType.WATER,
        flowRate: 10
      });
      
      sim.registerActuator(actuator1);
      
      expect(() => sim.registerActuator(actuator2)).toThrow('already registered');
    });

    it('should throw error when getting non-existent sensor', () => {
      const sim = new SimulationCore(config);
      
      expect(() => sim.getSensor('non-existent')).toThrow('not found');
    });

    it('should throw error when getting non-existent actuator', () => {
      const sim = new SimulationCore(config);
      
      expect(() => sim.getActuator('non-existent')).toThrow('not found');
    });

    it('should return all registered sensors', () => {
      const sim = new SimulationCore(config);
      const sensor1 = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      const sensor2 = new ECSensor({ id: 'ec-1', baseline: 1.5 });
      
      sim.registerSensor(sensor1);
      sim.registerSensor(sensor2);
      
      const sensors = sim.getAllSensors();
      expect(sensors).toHaveLength(2);
      expect(sensors).toContain(sensor1);
      expect(sensors).toContain(sensor2);
    });

    it('should return all registered actuators', () => {
      const sim = new SimulationCore(config);
      const actuator1 = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 5
      });
      const actuator2 = new LightActuator({
        id: 'light-1',
        temperatureEffect: 2.0
      });
      
      sim.registerActuator(actuator1);
      sim.registerActuator(actuator2);
      
      const actuators = sim.getAllActuators();
      expect(actuators).toHaveLength(2);
      expect(actuators).toContain(actuator1);
      expect(actuators).toContain(actuator2);
    });
  });

  describe('Lifecycle Management', () => {
    it('should start simulation', () => {
      const sim = new SimulationCore(config);
      
      sim.start();
      
      expect(sim.isRunning()).toBe(true);
      expect(sim.getSimulationState()).toBe('running');
      
      sim.stop(); // Cleanup
    });

    it('should stop simulation', () => {
      const sim = new SimulationCore(config);
      
      sim.start();
      sim.stop();
      
      expect(sim.isRunning()).toBe(false);
      expect(sim.getSimulationState()).toBe('stopped');
    });

    it('should pause simulation', () => {
      const sim = new SimulationCore(config);
      
      sim.start();
      sim.pause();
      
      expect(sim.isPaused()).toBe(true);
      expect(sim.getSimulationState()).toBe('paused');
      
      sim.stop(); // Cleanup
    });

    it('should resume simulation', () => {
      const sim = new SimulationCore(config);
      
      sim.start();
      sim.pause();
      sim.resume();
      
      expect(sim.isRunning()).toBe(true);
      expect(sim.isPaused()).toBe(false);
      expect(sim.getSimulationState()).toBe('running');
      
      sim.stop(); // Cleanup
    });

    it('should not start if already running', () => {
      const sim = new SimulationCore(config);
      
      sim.start();
      const stateBefore = sim.getSimulationState();
      sim.start(); // Try to start again
      const stateAfter = sim.getSimulationState();
      
      expect(stateBefore).toBe('running');
      expect(stateAfter).toBe('running');
      
      sim.stop(); // Cleanup
    });

    it('should not pause if not running', () => {
      const sim = new SimulationCore(config);
      
      sim.pause();
      
      expect(sim.isPaused()).toBe(false);
      expect(sim.getSimulationState()).toBe('stopped');
    });

    it('should not resume if not paused', () => {
      const sim = new SimulationCore(config);
      
      sim.resume();
      
      expect(sim.isRunning()).toBe(false);
      expect(sim.getSimulationState()).toBe('stopped');
    });
  });

  describe('Simulation Loop', () => {
    it('should update sensors during simulation', (done) => {
      const sim = new SimulationCore(config);
      
      // Register a sensor
      const sensor = new PHSensor({ id: 'test-ph', baseline: 7.0 });
      sim.registerSensor(sensor);
      
      const initialValue = sensor.getRawValue();
      
      sim.start();
      
      // Wait for a few ticks
      setTimeout(() => {
        sim.stop();
        
        // Sensor should have been updated (value may have drifted)
        const finalValue = sensor.getRawValue();
        
        // Value should be defined and within valid range
        expect(finalValue).toBeGreaterThanOrEqual(0);
        expect(finalValue).toBeLessThanOrEqual(14);
        
        done();
      }, 200); // Wait 200ms (should be ~2 ticks at 10 Hz)
    });

    it('should apply actuator effects during simulation', (done) => {
      const sim = new SimulationCore(config);
      
      // Register a water pump
      const pump = new PumpActuator({
        id: 'test-pump',
        pumpType: PumpType.WATER,
        flowRate: 100 // High flow rate for visible effect
      });
      sim.registerActuator(pump);
      
      // Activate the pump
      pump.setState({ active: true, timestamp: Date.now() });
      
      const initialState = sim.getPhysicsModel().getState();
      const initialVolume = initialState.waterVolume;
      
      sim.start();
      
      // Wait for a few ticks
      setTimeout(() => {
        sim.stop();
        
        const finalState = sim.getPhysicsModel().getState();
        const finalVolume = finalState.waterVolume;
        
        // Water volume should have increased
        expect(finalVolume).toBeGreaterThan(initialVolume);
        
        done();
      }, 200);
    });

    it('should pause time when paused', (done) => {
      const sim = new SimulationCore(config);
      
      sim.start();
      
      setTimeout(() => {
        const timeBeforePause = sim.getTimeManager().getSimulatedTime();
        sim.pause();
        
        setTimeout(() => {
          const timeAfterPause = sim.getTimeManager().getSimulatedTime();
          
          // Time should not have advanced while paused
          expect(timeAfterPause).toBeCloseTo(timeBeforePause, 2);
          
          sim.stop();
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Integration', () => {
    it('should integrate TimeManager, EventLogger, and PhysicsModel', () => {
      const sim = new SimulationCore(config);
      
      expect(sim.getTimeManager()).toBeDefined();
      expect(sim.getEventLogger()).toBeDefined();
      expect(sim.getPhysicsModel()).toBeDefined();
    });

    it('should update physics model with time from TimeManager', (done) => {
      const sim = new SimulationCore(config);
      
      const initialPhysicsTime = sim.getPhysicsModel().getState().simulatedTime;
      
      sim.start();
      
      setTimeout(() => {
        sim.stop();
        
        const finalPhysicsTime = sim.getPhysicsModel().getState().simulatedTime;
        const timeManagerTime = sim.getTimeManager().getSimulatedTime();
        
        // Physics time should have advanced
        expect(finalPhysicsTime).toBeGreaterThan(initialPhysicsTime);
        
        // Physics time should be close to TimeManager time
        // (may differ slightly due to tick granularity)
        expect(finalPhysicsTime).toBeCloseTo(timeManagerTime, 0);
        
        done();
      }, 200);
    });
  });

  describe('State Management (Task 13.2)', () => {
    describe('Time Acceleration', () => {
      it('should set time acceleration factor', () => {
        const sim = new SimulationCore(config);
        
        sim.setTimeAcceleration(10);
        
        expect(sim.getTimeManager().getAcceleration()).toBe(10);
        expect(sim.getConfig().simulation?.timeAcceleration).toBe(10);
      });

      it('should throw error for acceleration factor below 1', () => {
        const sim = new SimulationCore(config);
        
        expect(() => sim.setTimeAcceleration(0.5)).toThrow('between 1 and 1000');
      });

      it('should throw error for acceleration factor above 1000', () => {
        const sim = new SimulationCore(config);
        
        expect(() => sim.setTimeAcceleration(1001)).toThrow('between 1 and 1000');
      });

      it('should accept acceleration factor at boundaries', () => {
        const sim = new SimulationCore(config);
        
        expect(() => sim.setTimeAcceleration(1)).not.toThrow();
        expect(() => sim.setTimeAcceleration(1000)).not.toThrow();
      });
    });

    describe('Time Queries', () => {
      it('should return simulated time', (done) => {
        const sim = new SimulationCore(config);
        
        sim.start();
        
        setTimeout(() => {
          const simulatedTime = sim.getSimulatedTime();
          
          expect(simulatedTime).toBeGreaterThan(0);
          
          sim.stop();
          done();
        }, 100);
      });

      it('should return real time', (done) => {
        const sim = new SimulationCore(config);
        
        sim.start();
        
        setTimeout(() => {
          const realTime = sim.getRealTime();
          
          expect(realTime).toBeGreaterThan(0);
          expect(realTime).toBeLessThan(1); // Should be less than 1 second
          
          sim.stop();
          done();
        }, 100);
      });

      it('should show different simulated and real time with acceleration', (done) => {
        const sim = new SimulationCore(config);
        
        sim.setTimeAcceleration(10);
        sim.start();
        
        setTimeout(() => {
          const simulatedTime = sim.getSimulatedTime();
          const realTime = sim.getRealTime();
          
          // Simulated time should be ~10x real time
          expect(simulatedTime).toBeGreaterThan(realTime * 5); // Allow some margin
          
          sim.stop();
          done();
        }, 100);
      });
    });

    describe('State Persistence', () => {
      it('should save state to file', () => {
        const sim = new SimulationCore(config);
        const sensor = new PHSensor({ id: 'test-ph', baseline: 7.0 });
        sim.registerSensor(sensor);
        
        const filepath = './test-state.json';
        
        expect(() => sim.saveState(filepath)).not.toThrow();
        
        // Cleanup
        const fs = require('fs');
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      });

      it('should load state from file', () => {
        const sim1 = new SimulationCore(config);
        const sensor1 = new PHSensor({ id: 'test-ph', baseline: 7.0 });
        sim1.registerSensor(sensor1);
        
        const filepath = './test-state.json';
        sim1.saveState(filepath);
        
        const sim2 = new SimulationCore(config);
        const sensor2 = new PHSensor({ id: 'test-ph', baseline: 6.0 });
        sim2.registerSensor(sensor2);
        
        expect(() => sim2.loadState(filepath)).not.toThrow();
        
        // Cleanup
        const fs = require('fs');
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      });

      it('should throw error when loading non-existent file', () => {
        const sim = new SimulationCore(config);
        
        expect(() => sim.loadState('./non-existent-file.json')).toThrow();
      });
    });

    describe('Scenario Loading', () => {
      it('should load scenario from file', () => {
        const sim = new SimulationCore(config);
        
        // Register sensors that the scenario will configure
        sim.registerSensor(new PHSensor({ id: 'ph', baseline: 6.0 }));
        sim.registerSensor(new ECSensor({ id: 'ec', baseline: 1.0 }));
        sim.registerSensor(new TemperatureSensor({ id: 'temperature', baseline: 20.0 }));
        sim.registerSensor(new WaterLevelSensor({ id: 'water_level', baseline: 50.0 }));
        
        const scenarioPath = './examples/scenarios/ph-adjustment.json';
        
        expect(() => sim.loadScenario(scenarioPath)).not.toThrow();
      });

      it('should throw error when loading non-existent scenario', () => {
        const sim = new SimulationCore(config);
        
        expect(() => sim.loadScenario('./non-existent-scenario.json')).toThrow();
      });

      it('should apply scenario initial state to sensors', () => {
        const sim = new SimulationCore(config);
        
        const phSensor = new PHSensor({ id: 'ph', baseline: 6.0 });
        const ecSensor = new ECSensor({ id: 'ec', baseline: 1.0 });
        const tempSensor = new TemperatureSensor({ id: 'temperature', baseline: 20.0 });
        const waterSensor = new WaterLevelSensor({ id: 'water_level', baseline: 50.0 });
        
        sim.registerSensor(phSensor);
        sim.registerSensor(ecSensor);
        sim.registerSensor(tempSensor);
        sim.registerSensor(waterSensor);
        
        const scenarioPath = './examples/scenarios/ph-adjustment.json';
        sim.loadScenario(scenarioPath);
        
        // Verify sensors were updated (values from ph-adjustment.json)
        expect(phSensor.getRawValue()).toBe(7.5);
        expect(ecSensor.getRawValue()).toBe(1.8);
        expect(tempSensor.getRawValue()).toBe(23);
        expect(waterSensor.getRawValue()).toBe(85);
      });
    });

    describe('Runtime Configuration Updates', () => {
      it('should update time acceleration at runtime', () => {
        const sim = new SimulationCore(config);
        
        sim.updateConfig({
          simulation: {
            tickRate: 10,
            timeAcceleration: 50
          }
        });
        
        expect(sim.getTimeManager().getAcceleration()).toBe(50);
      });

      it('should update tick rate at runtime', () => {
        const sim = new SimulationCore(config);
        
        sim.updateConfig({
          simulation: {
            tickRate: 20,
            timeAcceleration: 1
          }
        });
        
        expect(sim.getConfig().simulation?.tickRate).toBe(20);
      });

      it('should update physics configuration at runtime', () => {
        const sim = new SimulationCore(config);
        
        sim.updateConfig({
          physics: {
            ...config.physics,
            evaporationRate: 1.0
          }
        });
        
        expect(sim.getConfig().physics.evaporationRate).toBe(1.0);
      });

      it('should update reservoir capacity at runtime', () => {
        const sim = new SimulationCore(config);
        
        sim.updateConfig({
          reservoir: {
            capacity: 200,
            initialWaterLevel: 50
          }
        });
        
        expect(sim.getConfig().reservoir.capacity).toBe(200);
      });

      it('should preserve existing config when partially updating', () => {
        const sim = new SimulationCore(config);
        const originalCapacity = config.reservoir.capacity;
        
        sim.updateConfig({
          physics: {
            ...config.physics,
            evaporationRate: 1.0
          }
        });
        
        // Reservoir capacity should remain unchanged
        expect(sim.getConfig().reservoir.capacity).toBe(originalCapacity);
      });
    });

    describe('Event and Failure Scheduling', () => {
      it('should schedule events from scenario', () => {
        const sim = new SimulationCore(config);
        
        const event = {
          time: 10,
          type: 'actuator_command' as const,
          target: 'pump-1',
          value: { active: true }
        };
        
        expect(() => sim.scheduleEvent(event)).not.toThrow();
      });

      it('should schedule failures from scenario', () => {
        const sim = new SimulationCore(config);
        
        const failure = {
          actuatorId: 'pump-1',
          failureTime: 20,
          duration: 10
        };
        
        expect(() => sim.scheduleFailure(failure)).not.toThrow();
      });
    });
  });
});
