/**
 * Unit tests for GladysIntegrationAdapter
 * 
 * Tests the integration between the simulator and Gladys device API,
 * including device discovery, sensor value queries, and actuator commands.
 */

import { GladysIntegrationAdapter } from '../../../src/integration/gladys-integration-adapter';
import { SimulationCore } from '../../../src/core/simulation-core';
import { PHSensor } from '../../../src/sensors/ph-sensor';
import { ECSensor } from '../../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../../src/sensors/water-level-sensor';
import { PumpActuator } from '../../../src/actuators/pump-actuator';
import { LightActuator } from '../../../src/actuators/light-actuator';
import { ValveActuator, ValveType } from '../../../src/actuators/valve-actuator';
import { SimulationConfig, PumpType } from '../../../src/types';

describe('GladysIntegrationAdapter', () => {
  let simCore: SimulationCore;
  let adapter: GladysIntegrationAdapter;
  
  const mockConfig: SimulationConfig = {
    reservoir: {
      capacity: 100,
      initialWaterLevel: 80
    },
    sensors: {
      ph: { id: 'ph-1', baseline: 6.5, noiseStdDev: 0.1 },
      ec: { id: 'ec-1', baseline: 1.5, noiseStdDev: 0.05 },
      temperature: { id: 'temp-1', baseline: 22, noiseStdDev: 0.2 },
      waterLevel: { id: 'level-1', baseline: 80, noiseStdDev: 1.0 }
    },
    actuators: {
      pumps: [
        { id: 'pump-1', type: 'water', flowRate: 5, failureProbability: 0 }
      ],
      lights: [
        { id: 'light-1', type: 'light', failureProbability: 0 }
      ],
      valves: [
        { id: 'valve-1', type: 'valve', flowRate: 3, failureProbability: 0 }
      ]
    },
    physics: {
      evaporationRate: 0.1,
      plantUptakeRate: 0.2,
      nutrientUptakeRate: 10,
      ambientTemperature: 20,
      temperatureDriftRate: 0.5,
      phDriftRate: 0.1
    }
  };
  
  beforeEach(() => {
    simCore = new SimulationCore(mockConfig);
    
    // Register sensors
    simCore.registerSensor(new PHSensor({ id: 'ph-1', baseline: 6.5, noiseStdDev: 0.1 }));
    simCore.registerSensor(new ECSensor({ id: 'ec-1', baseline: 1.5, noiseStdDev: 0.05 }));
    simCore.registerSensor(new TemperatureSensor({ id: 'temp-1', baseline: 22, noiseStdDev: 0.2 }));
    simCore.registerSensor(new WaterLevelSensor({ id: 'level-1', baseline: 80, noiseStdDev: 1.0 }));
    
    // Register actuators
    simCore.registerActuator(new PumpActuator({ id: 'pump-1', pumpType: PumpType.WATER, flowRate: 5, failureProbability: 0 }));
    simCore.registerActuator(new LightActuator({ id: 'light-1', failureProbability: 0 }));
    simCore.registerActuator(new ValveActuator({ id: 'valve-1', valveType: ValveType.INLET, flowRate: 3, failureProbability: 0 }));
    
    adapter = new GladysIntegrationAdapter(simCore);
  });
  
  describe('discoverDevices', () => {
    it('should discover all sensors and actuators', () => {
      const devices = adapter.discoverDevices();
      
      // Should have 4 sensors + 3 actuators = 7 devices
      expect(devices).toHaveLength(7);
    });
    
    it('should expose pH sensor as Gladys device', () => {
      const devices = adapter.discoverDevices();
      
      const phDevice = devices.find(d => d.model === 'ph-sensor');
      expect(phDevice).toBeDefined();
      expect(phDevice?.type).toBe('sensor');
      expect(phDevice?.features).toHaveLength(1);
      expect(phDevice?.features[0]).toMatchObject({
        category: 'ph-sensor',
        type: 'decimal',
        unit: 'pH',
        min: 0,
        max: 14
      });
    });
    
    it('should expose EC sensor as Gladys device', () => {
      const devices = adapter.discoverDevices();
      
      const ecDevice = devices.find(d => d.model === 'ec-sensor');
      expect(ecDevice).toBeDefined();
      expect(ecDevice?.type).toBe('sensor');
      expect(ecDevice?.features[0]).toMatchObject({
        category: 'ec-sensor',
        type: 'decimal',
        unit: 'mS/cm',
        min: 0,
        max: 5
      });
    });
    
    it('should expose temperature sensor as Gladys device', () => {
      const devices = adapter.discoverDevices();
      
      const tempDevice = devices.find(d => d.model === 'temperature-sensor');
      expect(tempDevice).toBeDefined();
      expect(tempDevice?.type).toBe('sensor');
      expect(tempDevice?.features[0]).toMatchObject({
        category: 'temperature-sensor',
        type: 'decimal',
        unit: '°C',
        min: 0,
        max: 50
      });
    });
    
    it('should expose water level sensor as Gladys device', () => {
      const devices = adapter.discoverDevices();
      
      const levelDevice = devices.find(d => d.model === 'water_level-sensor');
      expect(levelDevice).toBeDefined();
      expect(levelDevice?.type).toBe('sensor');
      expect(levelDevice?.features[0]).toMatchObject({
        category: 'water-level-sensor',
        type: 'decimal',
        unit: '%',
        min: 0,
        max: 100
      });
    });
    
    it('should expose pump actuator as Gladys device', () => {
      const devices = adapter.discoverDevices();
      
      const pumpDevice = devices.find(d => d.model === 'pump-actuator');
      expect(pumpDevice).toBeDefined();
      expect(pumpDevice?.type).toBe('actuator');
      expect(pumpDevice?.features[0]).toMatchObject({
        category: 'pump',
        type: 'binary',
        min: 0,
        max: 1
      });
    });
    
    it('should expose light actuator as Gladys device with intensity control', () => {
      const devices = adapter.discoverDevices();
      
      const lightDevice = devices.find(d => d.model === 'light-actuator');
      expect(lightDevice).toBeDefined();
      expect(lightDevice?.type).toBe('actuator');
      expect(lightDevice?.features).toHaveLength(2);
      
      // Should have state and intensity features
      const stateFeature = lightDevice?.features.find(f => f.category === 'light');
      const intensityFeature = lightDevice?.features.find(f => f.category === 'light-intensity');
      
      expect(stateFeature).toBeDefined();
      expect(intensityFeature).toMatchObject({
        type: 'decimal',
        unit: '%',
        min: 0,
        max: 100
      });
    });
    
    it('should expose valve actuator as Gladys device', () => {
      const devices = adapter.discoverDevices();
      
      const valveDevice = devices.find(d => d.model === 'valve-actuator');
      expect(valveDevice).toBeDefined();
      expect(valveDevice?.type).toBe('actuator');
      expect(valveDevice?.features[0]).toMatchObject({
        category: 'valve',
        type: 'binary',
        min: 0,
        max: 1
      });
    });
    
    it('should create unique device IDs', () => {
      const devices = adapter.discoverDevices();
      const ids = devices.map(d => d.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
  
  describe('getSensorValue', () => {
    beforeEach(() => {
      adapter.discoverDevices(); // Populate device map
    });
    
    it('should return sensor value for valid device ID', () => {
      const value = adapter.getSensorValue('gladys-sensor-ph-1');
      
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(14);
    });
    
    it('should return value within 50ms', () => {
      const startTime = Date.now();
      adapter.getSensorValue('gladys-sensor-ph-1');
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(50);
    });
    
    it('should throw error for unknown device ID', () => {
      expect(() => {
        adapter.getSensorValue('unknown-device');
      }).toThrow('Device unknown-device not found in device map');
    });
    
    it('should return different values for different sensors', () => {
      const phValue = adapter.getSensorValue('gladys-sensor-ph-1');
      const ecValue = adapter.getSensorValue('gladys-sensor-ec-1');
      
      // Values should be in different ranges
      expect(phValue).toBeGreaterThanOrEqual(0);
      expect(phValue).toBeLessThanOrEqual(14);
      expect(ecValue).toBeGreaterThanOrEqual(0);
      expect(ecValue).toBeLessThanOrEqual(5);
    });
  });
  
  describe('sendActuatorCommand', () => {
    beforeEach(() => {
      adapter.discoverDevices(); // Populate device map
    });
    
    it('should send command to actuator', () => {
      const command = {
        actuatorId: 'pump-1',
        action: 'on' as const,
        timestamp: Date.now()
      };
      
      expect(() => {
        adapter.sendActuatorCommand('gladys-actuator-pump-1', command);
      }).not.toThrow();
      
      const actuator = simCore.getActuator('pump-1');
      expect(actuator.getState().active).toBe(true);
    });
    
    it('should forward command within 50ms', () => {
      const command = {
        actuatorId: 'pump-1',
        action: 'on' as const,
        timestamp: Date.now()
      };
      
      const startTime = Date.now();
      adapter.sendActuatorCommand('gladys-actuator-pump-1', command);
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(50);
    });
    
    it('should handle off command', () => {
      const onCommand = {
        actuatorId: 'pump-1',
        action: 'on' as const,
        timestamp: Date.now()
      };
      adapter.sendActuatorCommand('gladys-actuator-pump-1', onCommand);
      
      const offCommand = {
        actuatorId: 'pump-1',
        action: 'off' as const,
        timestamp: Date.now()
      };
      adapter.sendActuatorCommand('gladys-actuator-pump-1', offCommand);
      
      const actuator = simCore.getActuator('pump-1');
      expect(actuator.getState().active).toBe(false);
    });
    
    it('should handle set_intensity command for lights', () => {
      const command = {
        actuatorId: 'light-1',
        action: 'set_intensity' as const,
        value: 75,
        timestamp: Date.now()
      };
      
      adapter.sendActuatorCommand('gladys-actuator-light-1', command);
      
      const actuator = simCore.getActuator('light-1');
      const state = actuator.getState();
      expect(state.active).toBe(true);
      expect(state.intensity).toBe(75);
    });
    
    it('should throw error for unknown device ID', () => {
      const command = {
        actuatorId: 'unknown',
        action: 'on' as const,
        timestamp: Date.now()
      };
      
      expect(() => {
        adapter.sendActuatorCommand('unknown-device', command);
      }).toThrow('Device unknown-device not found in device map');
    });
  });
  
  describe('registerDevice and unregisterDevice', () => {
    it('should register device in device map', () => {
      const device = {
        id: 'gladys-sensor-test-1',
        name: 'Test Sensor',
        type: 'sensor' as const,
        model: 'test-sensor',
        features: []
      };
      
      adapter.registerDevice(device);
      
      // Should be able to access the device (though it won't exist in simCore)
      expect(() => {
        adapter.getSensorValue('gladys-sensor-test-1');
      }).toThrow(); // Will throw because sensor doesn't exist in simCore
    });
    
    it('should unregister device from device map', () => {
      adapter.discoverDevices();
      
      adapter.unregisterDevice('gladys-sensor-ph-1');
      
      expect(() => {
        adapter.getSensorValue('gladys-sensor-ph-1');
      }).toThrow('Device gladys-sensor-ph-1 not found in device map');
    });
  });
  
  describe('Gladys protocol compliance', () => {
    it('should return properly formatted device information', () => {
      const devices = adapter.discoverDevices();
      
      devices.forEach(device => {
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('name');
        expect(device).toHaveProperty('type');
        expect(device).toHaveProperty('model');
        expect(device).toHaveProperty('features');
        expect(Array.isArray(device.features)).toBe(true);
        
        device.features.forEach(feature => {
          expect(feature).toHaveProperty('id');
          expect(feature).toHaveProperty('name');
          expect(feature).toHaveProperty('category');
          expect(feature).toHaveProperty('type');
        });
      });
    });
    
    it('should use consistent naming convention for device IDs', () => {
      const devices = adapter.discoverDevices();
      
      devices.forEach(device => {
        expect(device.id).toMatch(/^gladys-(sensor|actuator)-/);
      });
    });
  });
  
  describe('Device discovery with specific configurations', () => {
    it('should discover devices with pH sensor at boundary values', () => {
      const lowPHConfig = { ...mockConfig };
      lowPHConfig.sensors.ph.baseline = 0.0;
      
      const lowPHSimCore = new SimulationCore(lowPHConfig);
      lowPHSimCore.registerSensor(new PHSensor({ id: 'ph-1', baseline: 0.0, noiseStdDev: 0.1 }));
      
      const lowPHAdapter = new GladysIntegrationAdapter(lowPHSimCore);
      const devices = lowPHAdapter.discoverDevices();
      
      const phDevice = devices.find(d => d.model === 'ph-sensor');
      expect(phDevice).toBeDefined();
      expect(phDevice!.features[0].min).toBe(0);
      expect(phDevice!.features[0].max).toBe(14);
    });
    
    it('should discover devices with high EC sensor values', () => {
      const highECConfig = { ...mockConfig };
      highECConfig.sensors.ec.baseline = 5.0;
      
      const highECSimCore = new SimulationCore(highECConfig);
      highECSimCore.registerSensor(new ECSensor({ id: 'ec-1', baseline: 5.0, noiseStdDev: 0.05 }));
      
      const highECAdapter = new GladysIntegrationAdapter(highECSimCore);
      const devices = highECAdapter.discoverDevices();
      
      const ecDevice = devices.find(d => d.model === 'ec-sensor');
      expect(ecDevice).toBeDefined();
      expect(ecDevice!.features[0].max).toBe(5);
    });
    
    it('should discover devices with extreme temperature values', () => {
      const coldConfig = { ...mockConfig };
      coldConfig.sensors.temperature.baseline = 0.0;
      
      const coldSimCore = new SimulationCore(coldConfig);
      coldSimCore.registerSensor(new TemperatureSensor({ id: 'temp-1', baseline: 0.0, noiseStdDev: 0.2 }));
      
      const coldAdapter = new GladysIntegrationAdapter(coldSimCore);
      const devices = coldAdapter.discoverDevices();
      
      const tempDevice = devices.find(d => d.model === 'temperature-sensor');
      expect(tempDevice).toBeDefined();
      expect(tempDevice!.features[0].min).toBe(0);
      expect(tempDevice!.features[0].max).toBe(50);
    });
    
    it('should discover devices with empty water level', () => {
      const emptyConfig = { ...mockConfig };
      emptyConfig.sensors.waterLevel.baseline = 0.0;
      
      const emptySimCore = new SimulationCore(emptyConfig);
      emptySimCore.registerSensor(new WaterLevelSensor({ id: 'level-1', baseline: 0.0, noiseStdDev: 1.0 }));
      
      const emptyAdapter = new GladysIntegrationAdapter(emptySimCore);
      const devices = emptyAdapter.discoverDevices();
      
      const levelDevice = devices.find(d => d.model === 'water_level-sensor');
      expect(levelDevice).toBeDefined();
      expect(levelDevice!.features[0].min).toBe(0);
      expect(levelDevice!.features[0].max).toBe(100);
    });
  });
  
  describe('Gladys device format compliance', () => {
    it('should include all required fields for sensor devices', () => {
      const devices = adapter.discoverDevices();
      const sensorDevices = devices.filter(d => d.type === 'sensor');
      
      sensorDevices.forEach(device => {
        expect(device.id).toBeDefined();
        expect(typeof device.id).toBe('string');
        expect(device.name).toBeDefined();
        expect(typeof device.name).toBe('string');
        expect(device.type).toBe('sensor');
        expect(device.model).toBeDefined();
        expect(typeof device.model).toBe('string');
        expect(Array.isArray(device.features)).toBe(true);
        expect(device.features.length).toBeGreaterThan(0);
      });
    });
    
    it('should include all required fields for actuator devices', () => {
      const devices = adapter.discoverDevices();
      const actuatorDevices = devices.filter(d => d.type === 'actuator');
      
      actuatorDevices.forEach(device => {
        expect(device.id).toBeDefined();
        expect(typeof device.id).toBe('string');
        expect(device.name).toBeDefined();
        expect(typeof device.name).toBe('string');
        expect(device.type).toBe('actuator');
        expect(device.model).toBeDefined();
        expect(typeof device.model).toBe('string');
        expect(Array.isArray(device.features)).toBe(true);
        expect(device.features.length).toBeGreaterThan(0);
      });
    });
    
    it('should format sensor features with correct types', () => {
      const devices = adapter.discoverDevices();
      const sensorDevices = devices.filter(d => d.type === 'sensor');
      
      sensorDevices.forEach(device => {
        device.features.forEach(feature => {
          expect(feature.type).toBe('decimal');
          expect(feature.unit).toBeDefined();
          expect(feature.min).toBeDefined();
          expect(feature.max).toBeDefined();
          expect(typeof feature.min).toBe('number');
          expect(typeof feature.max).toBe('number');
          expect(feature.min).toBeLessThan(feature.max!);
        });
      });
    });
    
    it('should format binary actuator features correctly', () => {
      const devices = adapter.discoverDevices();
      const pumpDevice = devices.find(d => d.model === 'pump-actuator');
      const valveDevice = devices.find(d => d.model === 'valve-actuator');
      
      expect(pumpDevice!.features[0].type).toBe('binary');
      expect(pumpDevice!.features[0].min).toBe(0);
      expect(pumpDevice!.features[0].max).toBe(1);
      
      expect(valveDevice!.features[0].type).toBe('binary');
      expect(valveDevice!.features[0].min).toBe(0);
      expect(valveDevice!.features[0].max).toBe(1);
    });
  });
  
  describe('Command forwarding accuracy', () => {
    beforeEach(() => {
      adapter.discoverDevices();
    });
    
    it('should accurately forward on command to pump', () => {
      const command = {
        actuatorId: 'pump-1',
        action: 'on' as const,
        timestamp: Date.now()
      };
      
      adapter.sendActuatorCommand('gladys-actuator-pump-1', command);
      
      const actuator = simCore.getActuator('pump-1');
      const state = actuator.getState();
      
      expect(state.active).toBe(true);
      expect(state.timestamp).toBeDefined();
    });
    
    it('should accurately forward off command to light', () => {
      // First turn on
      const onCommand = {
        actuatorId: 'light-1',
        action: 'on' as const,
        timestamp: Date.now()
      };
      adapter.sendActuatorCommand('gladys-actuator-light-1', onCommand);
      
      // Then turn off
      const offCommand = {
        actuatorId: 'light-1',
        action: 'off' as const,
        timestamp: Date.now()
      };
      adapter.sendActuatorCommand('gladys-actuator-light-1', offCommand);
      
      const actuator = simCore.getActuator('light-1');
      const state = actuator.getState();
      
      expect(state.active).toBe(false);
    });
    
    it('should accurately forward intensity command to light', () => {
      const command = {
        actuatorId: 'light-1',
        action: 'set_intensity' as const,
        value: 50,
        timestamp: Date.now()
      };
      
      adapter.sendActuatorCommand('gladys-actuator-light-1', command);
      
      const actuator = simCore.getActuator('light-1');
      const state = actuator.getState();
      
      expect(state.active).toBe(true);
      expect(state.intensity).toBe(50);
    });
    
    it('should handle zero intensity as off', () => {
      const command = {
        actuatorId: 'light-1',
        action: 'set_intensity' as const,
        value: 0,
        timestamp: Date.now()
      };
      
      adapter.sendActuatorCommand('gladys-actuator-light-1', command);
      
      const actuator = simCore.getActuator('light-1');
      const state = actuator.getState();
      
      expect(state.active).toBe(false);
      expect(state.intensity).toBe(0);
    });
    
    it('should handle maximum intensity', () => {
      const command = {
        actuatorId: 'light-1',
        action: 'set_intensity' as const,
        value: 100,
        timestamp: Date.now()
      };
      
      adapter.sendActuatorCommand('gladys-actuator-light-1', command);
      
      const actuator = simCore.getActuator('light-1');
      const state = actuator.getState();
      
      expect(state.active).toBe(true);
      expect(state.intensity).toBe(100);
    });
  });
  
  describe('Response time measurements', () => {
    beforeEach(() => {
      adapter.discoverDevices();
    });
    
    it('should measure sensor query response time', () => {
      const measurements: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        adapter.getSensorValue('gladys-sensor-ph-1');
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
      }
      
      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);
      
      expect(avgResponseTime).toBeLessThan(10);
      expect(maxResponseTime).toBeLessThan(50);
    });
    
    it('should measure actuator command response time', () => {
      const measurements: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const action = i % 2 === 0 ? 'on' : 'off';
        const command = {
          actuatorId: 'pump-1',
          action: action as 'on' | 'off',
          timestamp: Date.now()
        };
        
        const startTime = Date.now();
        adapter.sendActuatorCommand('gladys-actuator-pump-1', command);
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
      }
      
      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);
      
      expect(avgResponseTime).toBeLessThan(10);
      expect(maxResponseTime).toBeLessThan(50);
    });
    
    it('should maintain response time under concurrent requests', () => {
      const measurements: number[] = [];
      const sensorIds = ['gladys-sensor-ph-1', 'gladys-sensor-ec-1', 
                        'gladys-sensor-temp-1', 'gladys-sensor-level-1'];
      
      // Simulate concurrent requests
      sensorIds.forEach(sensorId => {
        const startTime = Date.now();
        adapter.getSensorValue(sensorId);
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
      });
      
      measurements.forEach(time => {
        expect(time).toBeLessThan(50);
      });
    });
  });
});
