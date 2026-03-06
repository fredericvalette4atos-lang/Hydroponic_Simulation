/**
 * End-to-end integration tests
 * 
 * Tests complete workflows across all system components:
 * - Start simulation → load scenario → query sensors → send commands → save state → load state
 * - Gladys integration workflow
 * - REST API workflow
 * - Time acceleration with long-running scenarios
 * 
 * Requirements: All (end-to-end validation)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SimulationCore } from '../../src/core/simulation-core';
import { RestAPIServer } from '../../src/api/rest-api-server';
import { GladysIntegrationAdapter } from '../../src/integration/gladys-integration-adapter';
import { PHSensor } from '../../src/sensors/ph-sensor';
import { ECSensor } from '../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../src/sensors/water-level-sensor';
import { PumpActuator } from '../../src/actuators/pump-actuator';
import { LightActuator } from '../../src/actuators/light-actuator';
import { ValveActuator, ValveType } from '../../src/actuators/valve-actuator';
import { SimulationConfig, LogLevel, PumpType } from '../../src/types';
import request from 'supertest';
import { unlinkSync, existsSync } from 'fs';

// Helper to create a test configuration
const createTestConfig = (): SimulationConfig => ({
  reservoir: {
    capacity: 100,
    initialWaterLevel: 50
  },
  sensors: {
    ph: { id: 'ph-1', baseline: 6.5, noiseStdDev: 0.1, driftRate: 0.5 },
    ec: { id: 'ec-1', baseline: 1.5, noiseStdDev: 0.05, driftRate: 0.05 },
    temperature: { id: 'temp-1', baseline: 22, noiseStdDev: 0.2, driftRate: 0.5 },
    waterLevel: { id: 'water-1', baseline: 50, noiseStdDev: 1.0, driftRate: 0 }
  },
  actuators: {
    pumps: [{ id: 'pump-1', type: 'water', flowRate: 10, failureProbability: 0 }],
    lights: [{ id: 'light-1', type: 'led', failureProbability: 0 }],
    valves: [{ id: 'valve-1', type: 'drain', flowRate: 5, failureProbability: 0 }]
  },
  physics: {
    evaporationRate: 0.5,
    plantUptakeRate: 0.3,
    nutrientUptakeRate: 10,
    ambientTemperature: 20,
    temperatureDriftRate: 1.0,
    phDriftRate: 0.1
  },
  simulation: {
    tickRate: 10,
    timeAcceleration: 1
  },
  logging: {
    level: LogLevel.ERROR,
    filepath: './logs/test-e2e.log',
    rotationPolicy: 'daily'
  }
});

describe('End-to-End Integration Tests', () => {
  let simCore: SimulationCore;
  let apiServer: RestAPIServer;
  let gladysAdapter: GladysIntegrationAdapter;
  let app: any;

  beforeEach(() => {
    const config = createTestConfig();
    simCore = new SimulationCore(config);
    
    // Register sensors
    simCore.registerSensor(new PHSensor({ id: 'ph', baseline: 7.0 }));
    simCore.registerSensor(new ECSensor({ id: 'ec', baseline: 1.5 }));
    simCore.registerSensor(new TemperatureSensor({ id: 'temperature', baseline: 22.0 }));
    simCore.registerSensor(new WaterLevelSensor({ id: 'water_level', baseline: 75.0 }));
    
    // Register actuators
    simCore.registerActuator(new PumpActuator({
      id: 'pump-water',
      pumpType: PumpType.WATER,
      flowRate: 10
    }));
    simCore.registerActuator(new LightActuator({
      id: 'light-grow',
      temperatureEffect: 2.0
    }));
    simCore.registerActuator(new ValveActuator({
      id: 'valve-drain',
      valveType: ValveType.OUTLET,
      flowRate: 5
    }));
    
    apiServer = new RestAPIServer(simCore);
    gladysAdapter = new GladysIntegrationAdapter(simCore);
    app = apiServer.getApp();
  });

  afterEach(() => {
    if (simCore.isRunning()) {
      simCore.stop();
    }
  });

  /**
   * Test 1: Complete simulation workflow
   * Start simulation → load scenario → query sensors → send commands → save state → load state
   */
  test('Complete simulation workflow', async () => {
    const stateFile = './tests/temp-configs/e2e-state.json';

    try {
      // Step 1: Start simulation
      simCore.start();
      expect(simCore.isRunning()).toBe(true);

      // Step 2: Load scenario
      simCore.loadScenario('./examples/scenarios/ph-adjustment.json');
      
      // Verify scenario was applied
      expect(simCore.getSensor('ph').getRawValue()).toBe(7.5);
      expect(simCore.getSensor('ec').getRawValue()).toBe(1.8);

      // Step 3: Query sensors
      const phValue = simCore.getSensor('ph').getValue();
      const ecValue = simCore.getSensor('ec').getValue();
      const tempValue = simCore.getSensor('temperature').getValue();
      const waterValue = simCore.getSensor('water_level').getValue();

      expect(phValue).toBeGreaterThanOrEqual(0);
      expect(phValue).toBeLessThanOrEqual(14);
      expect(ecValue).toBeGreaterThanOrEqual(0);
      expect(ecValue).toBeLessThanOrEqual(5);
      expect(tempValue).toBeGreaterThanOrEqual(0);
      expect(tempValue).toBeLessThanOrEqual(50);
      expect(waterValue).toBeGreaterThanOrEqual(0);
      expect(waterValue).toBeLessThanOrEqual(100);

      // Step 4: Send actuator commands
      const pump = simCore.getActuator('pump-water');
      pump.setState({ active: true, timestamp: Date.now() });
      expect(pump.getState().active).toBe(true);

      const light = simCore.getActuator('light-grow');
      light.setState({ active: true, intensity: 75, timestamp: Date.now() });
      expect(light.getState().active).toBe(true);
      expect(light.getState().intensity).toBe(75);

      // Step 5: Let simulation run for a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 6: Save state
      simCore.saveState(stateFile);
      expect(existsSync(stateFile)).toBe(true);

      // Step 7: Stop simulation
      simCore.stop();
      expect(simCore.isRunning()).toBe(false);

      // Step 8: Load state
      simCore.loadState(stateFile);

      // Verify state was restored (sensors may have drifted slightly)
      const restoredPH = simCore.getSensor('ph').getRawValue();
      expect(restoredPH).toBeGreaterThan(6.0);
      expect(restoredPH).toBeLessThan(9.0);

    } finally {
      // Cleanup
      if (existsSync(stateFile)) {
        unlinkSync(stateFile);
      }
    }
  });

  /**
   * Test 2: Gladys integration workflow
   */
  test('Gladys integration workflow', () => {
    // Step 1: Discover devices
    const devices = gladysAdapter.discoverDevices();
    expect(devices.length).toBeGreaterThan(0);

    // Verify sensors are exposed
    const sensorDevices = devices.filter(d => d.type === 'sensor');
    expect(sensorDevices.length).toBe(4);

    // Verify actuators are exposed
    const actuatorDevices = devices.filter(d => d.type === 'actuator');
    expect(actuatorDevices.length).toBe(3);

    // Step 2: Query sensor value through Gladys
    const phDevice = devices.find(d => d.model === 'ph-sensor');
    expect(phDevice).toBeDefined();

    const phValue = gladysAdapter.getSensorValue(phDevice!.id);
    expect(typeof phValue).toBe('number');
    expect(phValue).toBeGreaterThanOrEqual(0);
    expect(phValue).toBeLessThanOrEqual(14);

    // Step 3: Send actuator command through Gladys
    const pumpDevice = devices.find(d => d.model === 'pump-actuator');
    expect(pumpDevice).toBeDefined();

    gladysAdapter.sendActuatorCommand(pumpDevice!.id, {
      actuatorId: 'pump-water',
      action: 'on',
      value: 1,
      timestamp: Date.now()
    });

    // Verify command was executed
    const pump = simCore.getActuator('pump-water');
    expect(pump.getState().active).toBe(true);

    // Step 4: Verify response time
    const startTime = Date.now();
    gladysAdapter.getSensorValue(phDevice!.id);
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(50); // Requirement: <50ms
  });

  /**
   * Test 3: REST API workflow
   */
  test('REST API workflow', async () => {
    // Step 1: Start simulation via API
    await request(app)
      .post('/api/simulation/start')
      .expect(200);

    expect(simCore.isRunning()).toBe(true);

    // Step 2: Query sensors via API
    const sensorResponse = await request(app)
      .get('/api/sensors/ph')
      .expect(200);

    expect(sensorResponse.body.success).toBe(true);
    expect(sensorResponse.body.data.value).toBeDefined();

    // Step 3: Send actuator command via API
    await request(app)
      .post('/api/actuators/pump-water')
      .send({ state: true })
      .expect(200);

    const pump = simCore.getActuator('pump-water');
    expect(pump.getState().active).toBe(true);

    // Step 4: Check simulation status via API
    const statusResponse = await request(app)
      .get('/api/simulation/status')
      .expect(200);

    expect(statusResponse.body.data.running).toBe(true);
    expect(statusResponse.body.data.paused).toBe(false);

    // Step 5: Pause simulation via API
    await request(app)
      .post('/api/simulation/pause')
      .expect(200);

    expect(simCore.isPaused()).toBe(true);

    // Step 6: Resume simulation via API
    await request(app)
      .post('/api/simulation/resume')
      .expect(200);

    expect(simCore.isRunning()).toBe(true);
    expect(simCore.isPaused()).toBe(false);

    // Step 7: Stop simulation via API
    await request(app)
      .post('/api/simulation/stop')
      .expect(200);

    expect(simCore.isRunning()).toBe(false);
  });

  /**
   * Test 4: Time acceleration with long-running scenario
   */
  test('Time acceleration with long-running scenario', async () => {
    // Step 1: Set high time acceleration
    simCore.setTimeAcceleration(100);
    expect(simCore.getTimeManager().getAcceleration()).toBe(100);

    // Step 2: Start simulation
    simCore.start();

    // Step 3: Activate water pump to add water
    const pump = simCore.getActuator('pump-water');
    pump.setState({ active: true, timestamp: Date.now() });

    // Step 4: Let simulation run for a short real time (but long simulated time)
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms real time

    // Step 5: Check that simulated time advanced significantly
    const simulatedTime = simCore.getSimulatedTime();
    const realTime = simCore.getRealTime();

    // With 100x acceleration, simulated time should be much greater than real time
    expect(simulatedTime).toBeGreaterThan(realTime * 50); // Allow some margin

    // Step 6: Verify physics effects occurred
    const waterLevel = simCore.getSensor('water_level').getRawValue();
    // Water level should have changed due to pump operation and evaporation
    expect(waterLevel).not.toBe(75.0); // Initial value

    // Step 7: Stop simulation
    simCore.stop();
  });

  /**
   * Test 5: Sensor and actuator interaction
   */
  test('Sensor and actuator interaction', async () => {
    // Start simulation
    simCore.start();

    // Get initial temperature
    const initialTemp = simCore.getSensor('temperature').getRawValue();

    // Activate light (should increase temperature)
    const light = simCore.getActuator('light-grow');
    light.setState({ active: true, intensity: 100, timestamp: Date.now() });

    // Let simulation run
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check that temperature increased
    const finalTemp = simCore.getSensor('temperature').getRawValue();
    expect(finalTemp).toBeGreaterThan(initialTemp);

    simCore.stop();
  });

  /**
   * Test 6: State persistence round-trip
   */
  test('State persistence round-trip', () => {
    const stateFile1 = './tests/temp-configs/e2e-state-1.json';
    const stateFile2 = './tests/temp-configs/e2e-state-2.json';

    try {
      // Modify some state
      const pump = simCore.getActuator('pump-water');
      pump.setState({ active: true, timestamp: Date.now() });

      // Save state
      simCore.saveState(stateFile1);

      // Load state
      simCore.loadState(stateFile1);

      // Save again
      simCore.saveState(stateFile2);

      // Both files should exist
      expect(existsSync(stateFile1)).toBe(true);
      expect(existsSync(stateFile2)).toBe(true);

      // Verify pump state was preserved
      const restoredPump = simCore.getActuator('pump-water');
      expect(restoredPump.getState().active).toBe(true);

    } finally {
      // Cleanup
      if (existsSync(stateFile1)) unlinkSync(stateFile1);
      if (existsSync(stateFile2)) unlinkSync(stateFile2);
    }
  });

  /**
   * Test 7: Multiple sensors and actuators working together
   */
  test('Multiple sensors and actuators working together', async () => {
    simCore.start();

    // Activate multiple actuators
    simCore.getActuator('pump-water').setState({ active: true, timestamp: Date.now() });
    simCore.getActuator('light-grow').setState({ active: true, intensity: 80, timestamp: Date.now() });

    // Let simulation run
    await new Promise(resolve => setTimeout(resolve, 300));

    // Query all sensors
    const sensors = simCore.getAllSensors();
    expect(sensors.length).toBe(4);

    // Verify all sensors have valid values
    for (const sensor of sensors) {
      const value = sensor.getValue();
      expect(typeof value).toBe('number');
      expect(isNaN(value)).toBe(false);
    }

    // Query all actuators
    const actuators = simCore.getAllActuators();
    expect(actuators.length).toBe(3);

    // Verify actuator states
    for (const actuator of actuators) {
      const state = actuator.getState();
      expect(state).toBeDefined();
      expect(typeof state.active).toBe('boolean');
    }

    simCore.stop();
  });

  /**
   * Test 8: Error handling across components
   */
  test('Error handling across components', async () => {
    // Try to get non-existent sensor
    expect(() => simCore.getSensor('non-existent')).toThrow('not found');

    // Try to get non-existent actuator
    expect(() => simCore.getActuator('non-existent')).toThrow('not found');

    // Try to load non-existent scenario
    expect(() => simCore.loadScenario('./non-existent.json')).toThrow();

    // Try to load non-existent state
    expect(() => simCore.loadState('./non-existent-state.json')).toThrow();

    // Try to set invalid time acceleration
    expect(() => simCore.setTimeAcceleration(0)).toThrow('between 1 and 1000');
    expect(() => simCore.setTimeAcceleration(1001)).toThrow('between 1 and 1000');

    // API error handling
    await request(app)
      .get('/api/sensors/non-existent')
      .expect(404);

    await request(app)
      .post('/api/actuators/pump-water')
      .send({}) // Missing required field
      .expect(400);
  });

  /**
   * Test 9: Lifecycle state transitions
   */
  test('Lifecycle state transitions', () => {
    // Initial state
    expect(simCore.isRunning()).toBe(false);
    expect(simCore.isPaused()).toBe(false);

    // Start
    simCore.start();
    expect(simCore.isRunning()).toBe(true);
    expect(simCore.isPaused()).toBe(false);

    // Pause
    simCore.pause();
    expect(simCore.isRunning()).toBe(false);
    expect(simCore.isPaused()).toBe(true);

    // Resume
    simCore.resume();
    expect(simCore.isRunning()).toBe(true);
    expect(simCore.isPaused()).toBe(false);

    // Stop
    simCore.stop();
    expect(simCore.isRunning()).toBe(false);
    expect(simCore.isPaused()).toBe(false);
  });

  /**
   * Test 10: Configuration updates at runtime
   */
  test('Configuration updates at runtime', () => {
    // Update time acceleration
    simCore.updateConfig({
      simulation: {
        tickRate: 10,
        timeAcceleration: 50
      }
    });

    expect(simCore.getTimeManager().getAcceleration()).toBe(50);

    // Update physics parameters
    simCore.updateConfig({
      physics: {
        evaporationRate: 1.0,
        plantUptakeRate: 0.5,
        nutrientUptakeRate: 15,
        ambientTemperature: 25,
        temperatureDriftRate: 1.5,
        phDriftRate: 0.2
      }
    });

    expect(simCore.getConfig().physics.evaporationRate).toBe(1.0);
    expect(simCore.getConfig().physics.ambientTemperature).toBe(25);
  });
});
