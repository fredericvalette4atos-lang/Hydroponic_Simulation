/**
 * Gladys Integration Adapter
 * 
 * Bridges the simulator with Gladys device API, exposing simulated sensors
 * and actuators as Gladys device entities.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { SimulationCore } from '../core/simulation-core';
import { 
  GladysDevice, 
  GladysFeature, 
  ActuatorCommand,
  Sensor,
  Actuator,
  SensorType,
  ActuatorType,
  PumpType
} from '../types';

/**
 * Adapter that integrates the hydroponic simulator with Gladys home automation
 */
export class GladysIntegrationAdapter {
  private simCore: SimulationCore;
  private deviceMap: Map<string, string>; // Gladys ID -> Simulator ID
  
  constructor(simCore: SimulationCore) {
    this.simCore = simCore;
    this.deviceMap = new Map();
  }
  
  /**
   * Discover all simulated devices and expose them as Gladys devices
   * Requirement 9.5: Support standard Gladys device discovery protocol
   * 
   * @returns Array of Gladys device definitions
   */
  discoverDevices(): GladysDevice[] {
    const devices: GladysDevice[] = [];
    
    // Register all sensors
    for (const sensor of this.simCore.getAllSensors()) {
      const device = this.createGladysDevice(sensor);
      devices.push(device);
      this.deviceMap.set(device.id, sensor.id);
    }
    
    // Register all actuators
    for (const actuator of this.simCore.getAllActuators()) {
      const device = this.createGladysDevice(actuator);
      devices.push(device);
      this.deviceMap.set(device.id, actuator.id);
    }
    
    return devices;
  }
  
  /**
   * Get current value from a sensor
   * Requirement 9.3: Return sensor values within 50ms
   * 
   * @param deviceId Gladys device ID
   * @returns Current sensor value
   * @throws Error if device not found or is not a sensor
   */
  getSensorValue(deviceId: string): number {
    const startTime = Date.now();
    
    const sensorId = this.deviceMap.get(deviceId);
    if (!sensorId) {
      throw new Error(`Device ${deviceId} not found in device map`);
    }
    
    const sensor = this.simCore.getSensor(sensorId);
    const value = sensor.getValue();
    
    const responseTime = Date.now() - startTime;
    if (responseTime > 50) {
      console.warn(`Sensor value response time exceeded 50ms: ${responseTime}ms`);
    }
    
    return value;
  }
  
  /**
   * Send command to an actuator
   * Requirement 9.4: Forward actuator commands within 50ms
   * 
   * @param deviceId Gladys device ID
   * @param command Actuator command to execute
   * @throws Error if device not found or is not an actuator
   */
  sendActuatorCommand(deviceId: string, command: ActuatorCommand): void {
    const startTime = Date.now();
    
    const actuatorId = this.deviceMap.get(deviceId);
    if (!actuatorId) {
      throw new Error(`Device ${deviceId} not found in device map`);
    }
    
    const actuator = this.simCore.getActuator(actuatorId);
    
    // Convert Gladys command to actuator state
    const state = {
      active: command.action === 'on' || (command.action === 'set_intensity' && (command.value ?? 0) > 0),
      intensity: command.action === 'set_intensity' ? command.value : undefined,
      timestamp: command.timestamp
    };
    
    actuator.setState(state);
    
    const responseTime = Date.now() - startTime;
    if (responseTime > 50) {
      console.warn(`Actuator command response time exceeded 50ms: ${responseTime}ms`);
    }
  }
  
  /**
   * Register a device in the device map
   * 
   * @param device Gladys device to register
   */
  registerDevice(device: GladysDevice): void {
    // Extract the simulator ID from the device ID (format: gladys-{type}-{simId})
    const parts = device.id.split('-');
    if (parts.length >= 3) {
      const simId = parts.slice(2).join('-');
      this.deviceMap.set(device.id, simId);
    }
  }
  
  /**
   * Unregister a device from the device map
   * 
   * @param deviceId Gladys device ID to unregister
   */
  unregisterDevice(deviceId: string): void {
    this.deviceMap.delete(deviceId);
  }
  
  /**
   * Create a Gladys device definition from a simulator component
   * Requirement 9.1: Expose simulated sensors as Gladys device entities
   * Requirement 9.2: Accept actuator commands through Gladys device API
   * 
   * @param component Sensor or Actuator component
   * @returns Gladys device definition
   */
  private createGladysDevice(component: Sensor | Actuator): GladysDevice {
    const isSensor = 'getValue' in component;
    
    if (isSensor) {
      return this.createSensorDevice(component as Sensor);
    } else {
      return this.createActuatorDevice(component as Actuator);
    }
  }
  
  /**
   * Create a Gladys device definition for a sensor
   * 
   * @param sensor Sensor component
   * @returns Gladys device definition
   */
  private createSensorDevice(sensor: Sensor): GladysDevice {
    const features: GladysFeature[] = [];
    
    switch (sensor.type) {
      case SensorType.PH:
        features.push({
          id: `${sensor.id}-ph`,
          name: 'pH Level',
          category: 'ph-sensor',
          type: 'decimal',
          unit: 'pH',
          min: 0,
          max: 14
        });
        break;
        
      case SensorType.EC:
        features.push({
          id: `${sensor.id}-ec`,
          name: 'Electrical Conductivity',
          category: 'ec-sensor',
          type: 'decimal',
          unit: 'mS/cm',
          min: 0,
          max: 5
        });
        break;
        
      case SensorType.TEMPERATURE:
        features.push({
          id: `${sensor.id}-temp`,
          name: 'Temperature',
          category: 'temperature-sensor',
          type: 'decimal',
          unit: '°C',
          min: 0,
          max: 50
        });
        break;
        
      case SensorType.WATER_LEVEL:
        features.push({
          id: `${sensor.id}-level`,
          name: 'Water Level',
          category: 'water-level-sensor',
          type: 'decimal',
          unit: '%',
          min: 0,
          max: 100
        });
        break;
    }
    
    return {
      id: `gladys-sensor-${sensor.id}`,
      name: `Hydroponic ${sensor.type.toUpperCase()} Sensor`,
      type: 'sensor',
      model: `${sensor.type}-sensor`,
      features
    };
  }
  
  /**
   * Create a Gladys device definition for an actuator
   * 
   * @param actuator Actuator component
   * @returns Gladys device definition
   */
  private createActuatorDevice(actuator: Actuator): GladysDevice {
    const features: GladysFeature[] = [];
    
    switch (actuator.type) {
      case ActuatorType.PUMP:
        features.push({
          id: `${actuator.id}-state`,
          name: 'Pump State',
          category: 'pump',
          type: 'binary',
          min: 0,
          max: 1
        });
        break;
        
      case ActuatorType.LIGHT:
        features.push({
          id: `${actuator.id}-state`,
          name: 'Light State',
          category: 'light',
          type: 'binary',
          min: 0,
          max: 1
        });
        features.push({
          id: `${actuator.id}-intensity`,
          name: 'Light Intensity',
          category: 'light-intensity',
          type: 'decimal',
          unit: '%',
          min: 0,
          max: 100
        });
        break;
        
      case ActuatorType.VALVE:
        features.push({
          id: `${actuator.id}-state`,
          name: 'Valve State',
          category: 'valve',
          type: 'binary',
          min: 0,
          max: 1
        });
        break;
    }
    
    return {
      id: `gladys-actuator-${actuator.id}`,
      name: `Hydroponic ${actuator.type.toUpperCase()} Actuator`,
      type: 'actuator',
      model: `${actuator.type}-actuator`,
      features
    };
  }
}
