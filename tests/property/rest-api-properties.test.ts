/**
 * Property-based tests for REST API
 * 
 * Tests universal properties that should hold for all REST API operations:
 * - Property 49: REST API sensor query
 * - Property 50: REST API actuator command
 * - Property 51: REST API scenario loading
 * - Property 52: REST API simulation control
 * - Property 53: REST API error handling
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import request from 'supertest';
import { RestAPIServer } from '../../src/api/rest-api-server';
import { SimulationCore } from '../../src/core/simulation-core';
import { PHSensor } from '../../src/sensors/ph-sensor';
import { ECSensor } from '../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../src/sensors/water-level-sensor';
import { PumpActuator } from '../../src/actuators/pump-actuator';
import { LightActuator } from '../../src/actuators/light-actuator';
import { ValveActuator, ValveType } from '../../src/actuators/valve-actuator';
import { SimulationConfig, LogLevel, PumpType, SensorType, ActuatorType } from '../../src/types';

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

describe('REST API Properties', () => {
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

  /**
   * Property 49: REST API Sensor Query
   * 
   * For any sensor component and any GET request to /api/sensors/:id,
   * the API shall return the current sensor value with appropriate metadata
   * (type, unit, timestamp).
   * 
   * **Validates: Requirements 15.1**
   */
  test('Property 49: REST API sensor query returns value with metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ph-test', 'ec-test', 'temp-test', 'water-test'),
        async (sensorId) => {
          const response = await request(app)
            .get(`/api/sensors/${sensorId}`)
            .expect(200);

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.timestamp).toBeGreaterThan(0);
          expect(response.body.simulatedTime).toBeGreaterThanOrEqual(0);

          // Verify sensor data
          const sensorData = response.body.data;
          expect(sensorData.id).toBe(sensorId);
          expect(sensorData.type).toBeDefined();
          expect(typeof sensorData.value).toBe('number');
          expect(sensorData.unit).toBeDefined();
          expect(sensorData.timestamp).toBeGreaterThan(0);

          // Verify value is within valid range based on sensor type
          const sensor = simCore.getSensor(sensorId);
          if (sensor.type === SensorType.PH) {
            expect(sensorData.value).toBeGreaterThanOrEqual(0);
            expect(sensorData.value).toBeLessThanOrEqual(14);
            expect(sensorData.unit).toBe('pH');
          } else if (sensor.type === SensorType.EC) {
            expect(sensorData.value).toBeGreaterThanOrEqual(0);
            expect(sensorData.value).toBeLessThanOrEqual(5);
            expect(sensorData.unit).toBe('mS/cm');
          } else if (sensor.type === SensorType.TEMPERATURE) {
            expect(sensorData.value).toBeGreaterThanOrEqual(0);
            expect(sensorData.value).toBeLessThanOrEqual(50);
            expect(sensorData.unit).toBe('°C');
          } else if (sensor.type === SensorType.WATER_LEVEL) {
            expect(sensorData.value).toBeGreaterThanOrEqual(0);
            expect(sensorData.value).toBeLessThanOrEqual(100);
            expect(sensorData.unit).toBe('%');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 50: REST API Actuator Command
   * 
   * For any actuator component and any POST request to /api/actuators/:id
   * with valid command data, the actuator shall execute the command and
   * the API shall return success.
   * 
   * **Validates: Requirements 15.2**
   */
  test('Property 50: REST API actuator command executes and returns success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('pump-test', 'light-test', 'valve-test'),
        fc.boolean(),
        fc.option(fc.integer({ min: 0, max: 100 })),
        async (actuatorId, state, intensity) => {
          const command: any = { state };
          if (intensity !== null) {
            command.intensity = intensity;
          }

          const response = await request(app)
            .post(`/api/actuators/${actuatorId}`)
            .send(command)
            .expect(200);

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.timestamp).toBeGreaterThan(0);

          // Verify actuator state was updated
          const actuator = simCore.getActuator(actuatorId);
          const actuatorState = actuator.getState();
          expect(actuatorState.active).toBe(state);
          
          if (intensity !== null && actuator.type === ActuatorType.LIGHT) {
            expect(actuatorState.intensity).toBe(intensity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 51: REST API Scenario Loading
   * 
   * For any valid test scenario and any POST request to /api/scenario
   * with the scenario data, the simulator shall load and apply the scenario.
   * 
   * **Validates: Requirements 15.3**
   */
  test('Property 51: REST API scenario loading applies scenario', async () => {
    // Register sensors that match the scenario
    simCore.registerSensor(new PHSensor({ id: 'ph', baseline: 6.0 }));
    simCore.registerSensor(new ECSensor({ id: 'ec', baseline: 1.0 }));
    simCore.registerSensor(new TemperatureSensor({ id: 'temperature', baseline: 20.0 }));
    simCore.registerSensor(new WaterLevelSensor({ id: 'water_level', baseline: 50.0 }));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('./examples/scenarios/ph-adjustment.json'),
        async (scenarioPath) => {
          const response = await request(app)
            .post('/api/scenario')
            .send({ filepath: scenarioPath })
            .expect(200);

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.timestamp).toBeGreaterThan(0);

          // Verify sensors were updated with scenario values
          const phSensor = simCore.getSensor('ph');
          const ecSensor = simCore.getSensor('ec');
          const tempSensor = simCore.getSensor('temperature');
          const waterSensor = simCore.getSensor('water_level');

          // Values from ph-adjustment.json scenario
          expect(phSensor.getRawValue()).toBe(7.5);
          expect(ecSensor.getRawValue()).toBe(1.8);
          expect(tempSensor.getRawValue()).toBe(23);
          expect(waterSensor.getRawValue()).toBe(85);
        }
      ),
      { numRuns: 10 } // Fewer runs since file I/O is involved
    );
  });

  /**
   * Property 52: REST API Simulation Control
   * 
   * For any simulation control command (start, stop, pause, resume) sent
   * via POST to the appropriate endpoint, the simulator shall transition
   * to the requested state.
   * 
   * **Validates: Requirements 15.4**
   */
  test('Property 52: REST API simulation control transitions state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('start', 'stop', 'pause', 'resume'),
        async (command) => {
          // Setup initial state based on command
          if (command === 'stop' || command === 'pause') {
            simCore.start();
          } else if (command === 'resume') {
            simCore.start();
            simCore.pause();
          }

          const response = await request(app)
            .post(`/api/simulation/${command}`)
            .expect(200);

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.timestamp).toBeGreaterThan(0);

          // Verify simulation state
          if (command === 'start') {
            expect(simCore.isRunning()).toBe(true);
          } else if (command === 'stop') {
            expect(simCore.isRunning()).toBe(false);
            expect(simCore.isPaused()).toBe(false);
          } else if (command === 'pause') {
            expect(simCore.isPaused()).toBe(true);
          } else if (command === 'resume') {
            expect(simCore.isRunning()).toBe(true);
            expect(simCore.isPaused()).toBe(false);
          }

          // Cleanup
          if (simCore.isRunning()) {
            simCore.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 52b: REST API simulation status query
   * 
   * GET /api/simulation/status should return current simulation state
   */
  test('Property 52b: REST API simulation status returns current state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // running or not
        fc.boolean(), // paused or not (only valid if running first)
        async (shouldRun, shouldPause) => {
          // Setup state
          if (shouldRun) {
            simCore.start();
            if (shouldPause) {
              simCore.pause();
            }
          }

          const response = await request(app)
            .get('/api/simulation/status')
            .expect(200);

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          
          const status = response.body.data;
          expect(typeof status.running).toBe('boolean');
          expect(typeof status.paused).toBe('boolean');
          expect(typeof status.simulatedTime).toBe('number');
          expect(typeof status.realTime).toBe('number');
          expect(typeof status.timeAcceleration).toBe('number');

          // Verify state matches
          expect(status.running).toBe(simCore.isRunning());
          expect(status.paused).toBe(simCore.isPaused());

          // Cleanup
          if (simCore.isRunning()) {
            simCore.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 52c: REST API time acceleration control
   * 
   * POST /api/simulation/time-acceleration should update time acceleration
   */
  test('Property 52c: REST API time acceleration updates acceleration factor', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        async (factor) => {
          const response = await request(app)
            .post('/api/simulation/time-acceleration')
            .send({ factor })
            .expect(200);

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();

          // Verify time acceleration was updated
          expect(simCore.getTimeManager().getAcceleration()).toBe(factor);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 53: REST API Error Handling
   * 
   * For any malformed API request (invalid JSON, missing required fields,
   * invalid values), the API shall return HTTP 400 status with a descriptive
   * error message in the response body.
   * 
   * **Validates: Requirements 15.5**
   */
  test('Property 53: REST API error handling returns 404 for non-existent resources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          // Non-existent sensor
          { endpoint: '/api/sensors/non-existent', method: 'get' as const, expectedStatus: 404 },
          // Non-existent actuator (POST)
          { endpoint: '/api/actuators/non-existent', method: 'post' as const, body: { state: true }, expectedStatus: 404 }
        ),
        async (testCase) => {
          let response;
          if (testCase.method === 'get') {
            response = await request(app)
              .get(testCase.endpoint)
              .expect(testCase.expectedStatus);
          } else {
            response = await request(app)
              .post(testCase.endpoint)
              .send(testCase.body)
              .expect(testCase.expectedStatus);
          }

          // Verify error response structure
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);
          expect(response.body.timestamp).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 10000); // 10 second timeout

  /**
   * Property 53b: REST API error handling for POST requests
   */
  test('Property 53b: REST API error handling for invalid POST requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          // Missing command state
          { endpoint: '/api/actuators/pump-test', body: {}, errorContains: 'required' },
          // Missing scenario filepath
          { endpoint: '/api/scenario', body: {}, errorContains: 'required' },
          // Missing time acceleration factor
          { endpoint: '/api/simulation/time-acceleration', body: {}, errorContains: 'required' },
          // Invalid time acceleration factor (string instead of number)
          { endpoint: '/api/simulation/time-acceleration', body: { factor: 'invalid' }, errorContains: 'number' },
          // Missing state filepath
          { endpoint: '/api/state/save', body: {}, errorContains: 'required' },
          { endpoint: '/api/state/load', body: {}, errorContains: 'required' }
        ),
        async (testCase) => {
          const response = await request(app)
            .post(testCase.endpoint)
            .send(testCase.body)
            .expect(400);

          // Verify error response structure
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.toLowerCase()).toContain(testCase.errorContains);
          expect(response.body.timestamp).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 10000); // 10 second timeout

  /**
   * Property 53c: REST API error handling for out-of-range values
   */
  test('Property 53c: REST API error handling for out-of-range time acceleration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 1001 })
        ),
        async (invalidFactor) => {
          const response = await request(app)
            .post('/api/simulation/time-acceleration')
            .send({ factor: invalidFactor })
            .expect(400);

          // Verify error response structure
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.toLowerCase()).toContain('between');
          expect(response.body.timestamp).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 10000); // 10 second timeout

  /**
   * Additional test: List sensors endpoint
   */
  test('GET /api/sensors returns all registered sensors', async () => {
    const response = await request(app)
      .get('/api/sensors')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Verify each sensor has required fields
    response.body.data.forEach((sensor: any) => {
      expect(sensor.id).toBeDefined();
      expect(sensor.type).toBeDefined();
      expect(sensor.unit).toBeDefined();
    });
  });

  /**
   * Additional test: List actuators endpoint
   */
  test('GET /api/actuators returns all registered actuators', async () => {
    const response = await request(app)
      .get('/api/actuators')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Verify each actuator has required fields
    response.body.data.forEach((actuator: any) => {
      expect(actuator.id).toBeDefined();
      expect(actuator.type).toBeDefined();
    });
  });
});
