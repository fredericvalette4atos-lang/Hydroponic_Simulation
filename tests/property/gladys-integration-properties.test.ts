/**
 * Property-Based Tests for Gladys Integration
 * 
 * Tests universal properties of the Gladys integration adapter using fast-check.
 * These tests verify that the integration behaves correctly across all valid inputs.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import * as fc from 'fast-check';
import { GladysIntegrationAdapter } from '../../src/integration/gladys-integration-adapter';
import { SimulationCore } from '../../src/core/simulation-core';
import { PHSensor } from '../../src/sensors/ph-sensor';
import { ECSensor } from '../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../src/sensors/water-level-sensor';
import { PumpActuator } from '../../src/actuators/pump-actuator';
import { LightActuator } from '../../src/actuators/light-actuator';
import { ValveActuator, ValveType } from '../../src/actuators/valve-actuator';
import { SimulationConfig, PumpType, ActuatorCommand } from '../../src/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a simulation core with registered sensors and actuators
 */
function createSimulationCore(config: SimulationConfig): SimulationCore {
  const simCore = new SimulationCore(config);
  
  // Register sensors
  simCore.registerSensor(new PHSensor({
    id: 'ph-1',
    baseline: config.sensors.ph.baseline,
    noiseStdDev: config.sensors.ph.noiseStdDev ?? 0.1
  }));
  simCore.registerSensor(new ECSensor({
    id: 'ec-1',
    baseline: config.sensors.ec.baseline,
    noiseStdDev: config.sensors.ec.noiseStdDev ?? 0.05
  }));
  simCore.registerSensor(new TemperatureSensor({
    id: 'temp-1',
    baseline: config.sensors.temperature.baseline,
    noiseStdDev: config.sensors.temperature.noiseStdDev ?? 0.2
  }));
  simCore.registerSensor(new WaterLevelSensor({
    id: 'level-1',
    baseline: config.sensors.waterLevel.baseline,
    noiseStdDev: config.sensors.waterLevel.noiseStdDev ?? 1.0
  }));
  
  // Register actuators
  simCore.registerActuator(new PumpActuator({
    id: 'pump-1',
    pumpType: PumpType.WATER,
    flowRate: 5,
    failureProbability: 0
  }));
  simCore.registerActuator(new LightActuator({
    id: 'light-1',
    failureProbability: 0
  }));
  simCore.registerActuator(new ValveActuator({
    id: 'valve-1',
    valveType: ValveType.INLET,
    flowRate: 3,
    failureProbability: 0
  }));
  
  return simCore;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid pH values (0-14)
 */
const arbPH = fc.float({ min: 0.0, max: 14.0 });

/**
 * Generate valid EC values (0-5 mS/cm)
 */
const arbEC = fc.float({ min: 0.0, max: 5.0 });

/**
 * Generate valid temperature values (0-50°C)
 */
const arbTemperature = fc.float({ min: 0.0, max: 50.0 });

/**
 * Generate valid water level values (0-100%)
 */
const arbWaterLevel = fc.float({ min: 0.0, max: 100.0 });

/**
 * Generate valid simulation configuration
 */
const arbSimulationConfig = fc.record({
  reservoir: fc.record({
    capacity: fc.float({ min: 10, max: 1000 }),
    initialWaterLevel: arbWaterLevel
  }),
  sensors: fc.record({
    ph: fc.record({
      id: fc.constant('ph-1'),
      baseline: arbPH,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(0.1) })
    }),
    ec: fc.record({
      id: fc.constant('ec-1'),
      baseline: arbEC,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(0.05) })
    }),
    temperature: fc.record({
      id: fc.constant('temp-1'),
      baseline: arbTemperature,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(0.2) })
    }),
    waterLevel: fc.record({
      id: fc.constant('level-1'),
      baseline: arbWaterLevel,
      noiseStdDev: fc.float({ min: 0, max: Math.fround(1.0) })
    })
  }),
  actuators: fc.constant({
    pumps: [{ id: 'pump-1', type: 'water', flowRate: 5, failureProbability: 0 }],
    lights: [{ id: 'light-1', type: 'light', failureProbability: 0 }],
    valves: [{ id: 'valve-1', type: 'valve', flowRate: 3, failureProbability: 0 }]
  }),
  physics: fc.record({
    evaporationRate: fc.float({ min: 0, max: 1 }),
    plantUptakeRate: fc.float({ min: 0, max: 1 }),
    nutrientUptakeRate: fc.float({ min: 0, max: 50 }),
    ambientTemperature: arbTemperature,
    temperatureDriftRate: fc.float({ min: 0, max: 2 }),
    phDriftRate: fc.float({ min: 0, max: Math.fround(0.5) })
  })
}) as fc.Arbitrary<SimulationConfig>;

/**
 * Generate valid actuator commands
 */
const arbActuatorCommand = fc.oneof(
  fc.record({
    actuatorId: fc.constantFrom('pump-1', 'light-1', 'valve-1'),
    action: fc.constant('on' as const),
    timestamp: fc.nat()
  }),
  fc.record({
    actuatorId: fc.constantFrom('pump-1', 'light-1', 'valve-1'),
    action: fc.constant('off' as const),
    timestamp: fc.nat()
  }),
  fc.record({
    actuatorId: fc.constant('light-1'),
    action: fc.constant('set_intensity' as const),
    value: fc.float({ min: 0, max: 100 }),
    timestamp: fc.nat()
  })
) as fc.Arbitrary<ActuatorCommand>;

// ============================================================================
// Property Tests
// ============================================================================

describe('Gladys Integration Property Tests', () => {
  
  /**
   * Property 24: Gladys Sensor Registration
   * 
   * **Validates: Requirements 9.1**
   * 
   * For any simulated sensor component, the Gladys integration shall expose it 
   * as a Gladys device entity with appropriate features and metadata.
   */
  describe('Property 24: Gladys sensor registration', () => {
    it('should expose all sensors as Gladys devices with valid features', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          const devices = adapter.discoverDevices();
          const sensorDevices = devices.filter(d => d.type === 'sensor');
          
          // Should have exactly 4 sensor devices (pH, EC, temperature, water level)
          expect(sensorDevices).toHaveLength(4);
          
          // Each sensor device must have valid structure
          sensorDevices.forEach(device => {
            // Must have required fields
            expect(device.id).toBeDefined();
            expect(device.name).toBeDefined();
            expect(device.type).toBe('sensor');
            expect(device.model).toBeDefined();
            expect(device.features).toBeDefined();
            expect(Array.isArray(device.features)).toBe(true);
            expect(device.features.length).toBeGreaterThan(0);
            
            // Each feature must have required fields
            device.features.forEach(feature => {
              expect(feature.id).toBeDefined();
              expect(feature.name).toBeDefined();
              expect(feature.category).toBeDefined();
              expect(feature.type).toBe('decimal');
              expect(feature.unit).toBeDefined();
              expect(feature.min).toBeDefined();
              expect(feature.max).toBeDefined();
              expect(feature.min).toBeLessThan(feature.max!);
            });
          });
          
          // Verify specific sensor types are present
          const phDevice = sensorDevices.find(d => d.model === 'ph-sensor');
          const ecDevice = sensorDevices.find(d => d.model === 'ec-sensor');
          const tempDevice = sensorDevices.find(d => d.model === 'temperature-sensor');
          const levelDevice = sensorDevices.find(d => d.model === 'water_level-sensor');
          
          expect(phDevice).toBeDefined();
          expect(ecDevice).toBeDefined();
          expect(tempDevice).toBeDefined();
          expect(levelDevice).toBeDefined();
          
          // Verify pH sensor has correct bounds
          expect(phDevice!.features[0].min).toBe(0);
          expect(phDevice!.features[0].max).toBe(14);
          
          // Verify EC sensor has correct bounds
          expect(ecDevice!.features[0].min).toBe(0);
          expect(ecDevice!.features[0].max).toBe(5);
          
          // Verify temperature sensor has correct bounds
          expect(tempDevice!.features[0].min).toBe(0);
          expect(tempDevice!.features[0].max).toBe(50);
          
          // Verify water level sensor has correct bounds
          expect(levelDevice!.features[0].min).toBe(0);
          expect(levelDevice!.features[0].max).toBe(100);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should create unique device IDs for all sensors', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          const devices = adapter.discoverDevices();
          const deviceIds = devices.map(d => d.id);
          const uniqueIds = new Set(deviceIds);
          
          // All device IDs must be unique
          expect(uniqueIds.size).toBe(deviceIds.length);
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 25: Gladys Actuator Command Handling
   * 
   * **Validates: Requirements 9.2**
   * 
   * For any actuator command sent through the Gladys device API, the corresponding 
   * actuator component shall receive and execute the command.
   */
  describe('Property 25: Gladys actuator command handling', () => {
    it('should forward all actuator commands to the correct actuator', () => {
      fc.assert(
        fc.property(arbSimulationConfig, arbActuatorCommand, (config, command) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          // Discover devices to populate device map
          adapter.discoverDevices();
          
          // Send command through Gladys adapter
          const gladysDeviceId = `gladys-actuator-${command.actuatorId}`;
          adapter.sendActuatorCommand(gladysDeviceId, command);
          
          // Verify actuator received the command
          const actuator = simCore.getActuator(command.actuatorId);
          const state = actuator.getState();
          
          if (command.action === 'on') {
            expect(state.active).toBe(true);
          } else if (command.action === 'off') {
            expect(state.active).toBe(false);
          } else if (command.action === 'set_intensity') {
            expect(state.active).toBe(command.value! > 0);
            expect(state.intensity).toBe(command.value);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle sequences of commands correctly', () => {
      fc.assert(
        fc.property(
          arbSimulationConfig, 
          fc.array(arbActuatorCommand, { minLength: 1, maxLength: 10 }),
          (config, commands) => {
            const simCore = createSimulationCore(config);
            const adapter = new GladysIntegrationAdapter(simCore);
            
            adapter.discoverDevices();
            
            // Send all commands
            commands.forEach(command => {
              const gladysDeviceId = `gladys-actuator-${command.actuatorId}`;
              adapter.sendActuatorCommand(gladysDeviceId, command);
            });
            
            // Verify final state matches last command for each actuator
            const lastCommands = new Map<string, ActuatorCommand>();
            commands.forEach(cmd => lastCommands.set(cmd.actuatorId, cmd));
            
            lastCommands.forEach((command, actuatorId) => {
              const actuator = simCore.getActuator(actuatorId);
              const state = actuator.getState();
              
              if (command.action === 'on') {
                expect(state.active).toBe(true);
              } else if (command.action === 'off') {
                expect(state.active).toBe(false);
              } else if (command.action === 'set_intensity') {
                expect(state.active).toBe(command.value! > 0);
                expect(state.intensity).toBe(command.value);
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  
  /**
   * Property 26: Gladys API Response Time
   * 
   * **Validates: Requirements 9.3, 9.4**
   * 
   * For any Gladys API request (sensor query or actuator command), the integration 
   * shall respond within 50 milliseconds.
   */
  describe('Property 26: Gladys API response time', () => {
    it('should return sensor values within 50ms', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          adapter.discoverDevices();
          
          // Test all sensor types
          const sensorIds = ['gladys-sensor-ph-1', 'gladys-sensor-ec-1', 
                            'gladys-sensor-temp-1', 'gladys-sensor-level-1'];
          
          sensorIds.forEach(deviceId => {
            const startTime = Date.now();
            adapter.getSensorValue(deviceId);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(50);
          });
        }),
        { numRuns: 100 }
      );
    });
    
    it('should forward actuator commands within 50ms', () => {
      fc.assert(
        fc.property(arbSimulationConfig, arbActuatorCommand, (config, command) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          adapter.discoverDevices();
          
          const gladysDeviceId = `gladys-actuator-${command.actuatorId}`;
          const startTime = Date.now();
          adapter.sendActuatorCommand(gladysDeviceId, command);
          const responseTime = Date.now() - startTime;
          
          expect(responseTime).toBeLessThan(50);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should maintain response time under load', () => {
      fc.assert(
        fc.property(
          arbSimulationConfig,
          fc.array(arbActuatorCommand, { minLength: 5, maxLength: 20 }),
          (config, commands) => {
            const simCore = createSimulationCore(config);
            const adapter = new GladysIntegrationAdapter(simCore);
            
            adapter.discoverDevices();
            
            // Send multiple commands and measure response times
            const responseTimes: number[] = [];
            
            commands.forEach(command => {
              const gladysDeviceId = `gladys-actuator-${command.actuatorId}`;
              const startTime = Date.now();
              adapter.sendActuatorCommand(gladysDeviceId, command);
              const responseTime = Date.now() - startTime;
              responseTimes.push(responseTime);
            });
            
            // All response times should be under 50ms
            responseTimes.forEach(time => {
              expect(time).toBeLessThan(50);
            });
            
            // Average response time should be well under 50ms
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            expect(avgResponseTime).toBeLessThan(25);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  
  /**
   * Property 27: Gladys Discovery Protocol Compliance
   * 
   * **Validates: Requirements 9.5**
   * 
   * For any device discovery request following the Gladys protocol, the integration 
   * shall return properly formatted device information for all simulated components.
   */
  describe('Property 27: Gladys discovery protocol compliance', () => {
    it('should return valid Gladys device format for all configurations', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          const devices = adapter.discoverDevices();
          
          // Should discover all components (4 sensors + 3 actuators)
          expect(devices).toHaveLength(7);
          
          // All devices must comply with Gladys format
          devices.forEach(device => {
            // Required fields
            expect(typeof device.id).toBe('string');
            expect(device.id.length).toBeGreaterThan(0);
            expect(typeof device.name).toBe('string');
            expect(device.name.length).toBeGreaterThan(0);
            expect(['sensor', 'actuator']).toContain(device.type);
            expect(typeof device.model).toBe('string');
            expect(device.model.length).toBeGreaterThan(0);
            expect(Array.isArray(device.features)).toBe(true);
            expect(device.features.length).toBeGreaterThan(0);
            
            // Device ID format: gladys-{type}-{id}
            expect(device.id).toMatch(/^gladys-(sensor|actuator)-.+$/);
            
            // Features must be valid
            device.features.forEach(feature => {
              expect(typeof feature.id).toBe('string');
              expect(feature.id.length).toBeGreaterThan(0);
              expect(typeof feature.name).toBe('string');
              expect(feature.name.length).toBeGreaterThan(0);
              expect(typeof feature.category).toBe('string');
              expect(feature.category.length).toBeGreaterThan(0);
              expect(['decimal', 'binary']).toContain(feature.type);
              
              // Decimal features must have unit and bounds
              if (feature.type === 'decimal') {
                expect(feature.unit).toBeDefined();
                expect(typeof feature.unit).toBe('string');
                expect(feature.min).toBeDefined();
                expect(typeof feature.min).toBe('number');
                expect(feature.max).toBeDefined();
                expect(typeof feature.max).toBe('number');
                expect(feature.min).toBeLessThan(feature.max!);
              }
              
              // Binary features must have 0-1 bounds
              if (feature.type === 'binary') {
                expect(feature.min).toBe(0);
                expect(feature.max).toBe(1);
              }
            });
          });
        }),
        { numRuns: 100 }
      );
    });
    
    it('should maintain consistent device IDs across multiple discoveries', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          // Discover devices multiple times
          const discovery1 = adapter.discoverDevices();
          const discovery2 = adapter.discoverDevices();
          const discovery3 = adapter.discoverDevices();
          
          // Device IDs should be consistent
          const ids1 = discovery1.map(d => d.id).sort();
          const ids2 = discovery2.map(d => d.id).sort();
          const ids3 = discovery3.map(d => d.id).sort();
          
          expect(ids1).toEqual(ids2);
          expect(ids2).toEqual(ids3);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should expose actuators with correct feature counts', () => {
      fc.assert(
        fc.property(arbSimulationConfig, (config) => {
          const simCore = createSimulationCore(config);
          const adapter = new GladysIntegrationAdapter(simCore);
          
          const devices = adapter.discoverDevices();
          const actuatorDevices = devices.filter(d => d.type === 'actuator');
          
          // Should have 3 actuators
          expect(actuatorDevices).toHaveLength(3);
          
          // Pump and valve should have 1 feature (binary state)
          const pumpDevice = actuatorDevices.find(d => d.model === 'pump-actuator');
          const valveDevice = actuatorDevices.find(d => d.model === 'valve-actuator');
          expect(pumpDevice!.features).toHaveLength(1);
          expect(valveDevice!.features).toHaveLength(1);
          
          // Light should have 2 features (binary state + intensity)
          const lightDevice = actuatorDevices.find(d => d.model === 'light-actuator');
          expect(lightDevice!.features).toHaveLength(2);
          
          // Verify light features
          const stateFeature = lightDevice!.features.find(f => f.category === 'light');
          const intensityFeature = lightDevice!.features.find(f => f.category === 'light-intensity');
          expect(stateFeature).toBeDefined();
          expect(stateFeature!.type).toBe('binary');
          expect(intensityFeature).toBeDefined();
          expect(intensityFeature!.type).toBe('decimal');
          expect(intensityFeature!.min).toBe(0);
          expect(intensityFeature!.max).toBe(100);
        }),
        { numRuns: 100 }
      );
    });
  });
});
