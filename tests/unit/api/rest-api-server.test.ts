/**
 * Unit tests for REST API Server
 * 
 * Tests specific examples and edge cases for REST API endpoints.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { RestAPIServer } from '../../../src/api/rest-api-server';
import { SimulationCore } from '../../../src/core/simulation-core';
import { PHSensor } from '../../../src/sensors/ph-sensor';
import { ECSensor } from '../../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../../src/sensors/water-level-sensor';
import { PumpActuator } from '../../../src/actuators/pump-actuator';
import { LightActuator } from '../../../src/actuators/light-actuator';
import { ValveActuator, ValveType } from '../../../src/actuators/valve-actuator';
import { SimulationConfig, LogLevel, PumpType } from '../../../src/types';
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
    filepath: './logs/test-api.log',
    rotationPolicy: 'daily'
  }
});

describe('REST API Server', () => {
  let simCore: SimulationCore;
  let apiServer: RestAPIServer;
  let app: any;

  beforeEach(() => {
    const config = createTestConfig();
    simCore = new SimulationCore(config);
    
    // Register sensors
    simCore.registerSensor(new PHSensor({ id: 'ph-test', baseline: 7.0 }));
    simCore.registerSensor(new ECSensor({ id: 'ec-test', baseline: 1.5 }));
    simCore.registerSensor(new TemperatureSensor({ id: 'temp-test', baseline: 22.0 }));
    simCore.registerSensor(new WaterLevelSensor({ id: 'water-test', baseline: 75.0 }));
    
    // Register actuators
    simCore.registerActuator(new PumpActuator({
      id: 'pump-test',
      pumpType: PumpType.WATER,
      flowRate: 10
    }));
    simCore.registerActuator(new LightActuator({
      id: 'light-test',
      temperatureEffect: 2.0
    }));
    simCore.registerActuator(new ValveActuator({
      id: 'valve-test',
      valveType: ValveType.OUTLET,
      flowRate: 5
    }));
    
    apiServer = new RestAPIServer(simCore);
    app = apiServer.getApp();
  });

  afterEach(() => {
    if (simCore.isRunning()) {
      simCore.stop();
    }
  });

  describe('Sensor Endpoints', () => {
    test('GET /api/sensors returns list of all sensors', async () => {
      const response = await request(app)
        .get('/api/sensors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(4);
      
      const sensorIds = response.body.data.map((s: any) => s.id);
      expect(sensorIds).toContain('ph-test');
      expect(sensorIds).toContain('ec-test');
      expect(sensorIds).toContain('temp-test');
      expect(sensorIds).toContain('water-test');
    });

    test('GET /api/sensors/:id returns pH sensor value', async () => {
      const response = await request(app)
        .get('/api/sensors/ph-test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('ph-test');
      expect(response.body.data.type).toBe('ph');
      expect(response.body.data.unit).toBe('pH');
      expect(response.body.data.value).toBeGreaterThanOrEqual(0);
      expect(response.body.data.value).toBeLessThanOrEqual(14);
    });

    test('GET /api/sensors/:id returns EC sensor value', async () => {
      const response = await request(app)
        .get('/api/sensors/ec-test')
        .expect(200);

      expect(response.body.data.type).toBe('ec');
      expect(response.body.data.unit).toBe('mS/cm');
      expect(response.body.data.value).toBeGreaterThanOrEqual(0);
      expect(response.body.data.value).toBeLessThanOrEqual(5);
    });

    test('GET /api/sensors/:id returns temperature sensor value', async () => {
      const response = await request(app)
        .get('/api/sensors/temp-test')
        .expect(200);

      expect(response.body.data.type).toBe('temperature');
      expect(response.body.data.unit).toBe('°C');
      expect(response.body.data.value).toBeGreaterThanOrEqual(0);
      expect(response.body.data.value).toBeLessThanOrEqual(50);
    });

    test('GET /api/sensors/:id returns water level sensor value', async () => {
      const response = await request(app)
        .get('/api/sensors/water-test')
        .expect(200);

      expect(response.body.data.type).toBe('water_level');
      expect(response.body.data.unit).toBe('%');
      expect(response.body.data.value).toBeGreaterThanOrEqual(0);
      expect(response.body.data.value).toBeLessThanOrEqual(100);
    });

    test('GET /api/sensors/:id returns 404 for non-existent sensor', async () => {
      const response = await request(app)
        .get('/api/sensors/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Actuator Endpoints', () => {
    test('GET /api/actuators returns list of all actuators', async () => {
      const response = await request(app)
        .get('/api/actuators')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      
      const actuatorIds = response.body.data.map((a: any) => a.id);
      expect(actuatorIds).toContain('pump-test');
      expect(actuatorIds).toContain('light-test');
      expect(actuatorIds).toContain('valve-test');
    });

    test('POST /api/actuators/:id activates pump', async () => {
      const response = await request(app)
        .post('/api/actuators/pump-test')
        .send({ state: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const actuator = simCore.getActuator('pump-test');
      expect(actuator.getState().active).toBe(true);
    });

    test('POST /api/actuators/:id deactivates pump', async () => {
      // First activate
      await request(app)
        .post('/api/actuators/pump-test')
        .send({ state: true });

      // Then deactivate
      const response = await request(app)
        .post('/api/actuators/pump-test')
        .send({ state: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const actuator = simCore.getActuator('pump-test');
      expect(actuator.getState().active).toBe(false);
    });

    test('POST /api/actuators/:id sets light intensity', async () => {
      const response = await request(app)
        .post('/api/actuators/light-test')
        .send({ state: true, intensity: 75 })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const actuator = simCore.getActuator('light-test');
      const state = actuator.getState();
      expect(state.active).toBe(true);
      expect(state.intensity).toBe(75);
    });

    test('POST /api/actuators/:id returns 400 for missing state', async () => {
      const response = await request(app)
        .post('/api/actuators/pump-test')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('POST /api/actuators/:id returns 404 for non-existent actuator', async () => {
      const response = await request(app)
        .post('/api/actuators/non-existent')
        .send({ state: true })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Scenario Endpoint', () => {
    test('POST /api/scenario loads valid scenario', async () => {
      // Register sensors that match the scenario
      simCore.registerSensor(new PHSensor({ id: 'ph', baseline: 6.0 }));
      simCore.registerSensor(new ECSensor({ id: 'ec', baseline: 1.0 }));
      simCore.registerSensor(new TemperatureSensor({ id: 'temperature', baseline: 20.0 }));
      simCore.registerSensor(new WaterLevelSensor({ id: 'water_level', baseline: 50.0 }));

      const response = await request(app)
        .post('/api/scenario')
        .send({ filepath: './examples/scenarios/ph-adjustment.json' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify sensors were updated
      expect(simCore.getSensor('ph').getRawValue()).toBe(7.5);
      expect(simCore.getSensor('ec').getRawValue()).toBe(1.8);
    });

    test('POST /api/scenario returns 400 for missing filepath', async () => {
      const response = await request(app)
        .post('/api/scenario')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('POST /api/scenario returns error for non-existent file', async () => {
      const response = await request(app)
        .post('/api/scenario')
        .send({ filepath: './non-existent.json' })
        .expect(404); // Scenario loader throws "not found" error

      expect(response.body.success).toBe(false);
    });
  });

  describe('Simulation Control Endpoints', () => {
    test('POST /api/simulation/start starts simulation', async () => {
      const response = await request(app)
        .post('/api/simulation/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(simCore.isRunning()).toBe(true);
      
      simCore.stop(); // Cleanup
    });

    test('POST /api/simulation/stop stops simulation', async () => {
      simCore.start();
      
      const response = await request(app)
        .post('/api/simulation/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(simCore.isRunning()).toBe(false);
    });

    test('POST /api/simulation/pause pauses simulation', async () => {
      simCore.start();
      
      const response = await request(app)
        .post('/api/simulation/pause')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(simCore.isPaused()).toBe(true);
      
      simCore.stop(); // Cleanup
    });

    test('POST /api/simulation/resume resumes simulation', async () => {
      simCore.start();
      simCore.pause();
      
      const response = await request(app)
        .post('/api/simulation/resume')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(simCore.isRunning()).toBe(true);
      expect(simCore.isPaused()).toBe(false);
      
      simCore.stop(); // Cleanup
    });

    test('GET /api/simulation/status returns current status', async () => {
      const response = await request(app)
        .get('/api/simulation/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.running).toBe(false);
      expect(response.body.data.paused).toBe(false);
      expect(typeof response.body.data.simulatedTime).toBe('number');
      expect(typeof response.body.data.realTime).toBe('number');
      expect(typeof response.body.data.timeAcceleration).toBe('number');
    });

    test('POST /api/simulation/time-acceleration sets acceleration', async () => {
      const response = await request(app)
        .post('/api/simulation/time-acceleration')
        .send({ factor: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(simCore.getTimeManager().getAcceleration()).toBe(10);
    });

    test('POST /api/simulation/time-acceleration returns 400 for missing factor', async () => {
      const response = await request(app)
        .post('/api/simulation/time-acceleration')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('POST /api/simulation/time-acceleration returns 400 for invalid factor type', async () => {
      const response = await request(app)
        .post('/api/simulation/time-acceleration')
        .send({ factor: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('number');
    });

    test('POST /api/simulation/time-acceleration returns 400 for out-of-range factor', async () => {
      const response = await request(app)
        .post('/api/simulation/time-acceleration')
        .send({ factor: 1001 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between');
    });
  });

  describe('State Persistence Endpoints', () => {
    const testStateFile = './tests/temp-configs/api-test-state.json';

    afterEach(() => {
      if (existsSync(testStateFile)) {
        unlinkSync(testStateFile);
      }
    });

    test('POST /api/state/save saves state to file', async () => {
      const response = await request(app)
        .post('/api/state/save')
        .send({ filepath: testStateFile })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(existsSync(testStateFile)).toBe(true);
    });

    test('POST /api/state/load loads state from file', async () => {
      // First save a state
      simCore.saveState(testStateFile);
      
      const response = await request(app)
        .post('/api/state/load')
        .send({ filepath: testStateFile })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /api/state/save returns 400 for missing filepath', async () => {
      const response = await request(app)
        .post('/api/state/save')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('POST /api/state/load returns 400 for missing filepath', async () => {
      const response = await request(app)
        .post('/api/state/load')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('POST /api/state/load returns error for non-existent file', async () => {
      const response = await request(app)
        .post('/api/state/load')
        .send({ filepath: './non-existent-state.json' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    test('All successful responses include required fields', async () => {
      const response = await request(app)
        .get('/api/sensors/ph-test')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('simulatedTime');
      expect(response.body.success).toBe(true);
    });

    test('All error responses include required fields', async () => {
      const response = await request(app)
        .get('/api/sensors/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('simulatedTime');
      expect(response.body.success).toBe(false);
    });

    test('Timestamps are valid', async () => {
      const beforeRequest = Date.now();
      
      const response = await request(app)
        .get('/api/sensors/ph-test')
        .expect(200);

      const afterRequest = Date.now();
      
      expect(response.body.timestamp).toBeGreaterThanOrEqual(beforeRequest);
      expect(response.body.timestamp).toBeLessThanOrEqual(afterRequest);
    });
  });

  describe('HTTP Status Codes', () => {
    test('Returns 200 for successful GET requests', async () => {
      await request(app)
        .get('/api/sensors')
        .expect(200);
    });

    test('Returns 200 for successful POST requests', async () => {
      await request(app)
        .post('/api/simulation/start')
        .expect(200);
    });

    test('Returns 400 for malformed requests', async () => {
      await request(app)
        .post('/api/actuators/pump-test')
        .send({})
        .expect(400);
    });

    test('Returns 404 for non-existent resources', async () => {
      await request(app)
        .get('/api/sensors/non-existent')
        .expect(404);
    });
  });
});
