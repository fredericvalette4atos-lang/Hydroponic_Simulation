/**
 * Hydroponic Test Simulation System
 * Entry point for the simulator
 */

// Main application
export { HydroponicSimulatorApp } from './main';

// Core components
export { SimulationCore } from './core/simulation-core';
export { TimeManager } from './core/time-manager';
export { EventLogger } from './core/event-logger';
export { StatePersistence } from './core/state-persistence';

// Configuration
export { ConfigurationLoader, DEFAULT_CONFIG } from './config/configuration-loader';
export { ScenarioLoader } from './config/scenario-loader';

// Sensors
export { PHSensor } from './sensors/ph-sensor';
export { ECSensor } from './sensors/ec-sensor';
export { TemperatureSensor } from './sensors/temperature-sensor';
export { WaterLevelSensor } from './sensors/water-level-sensor';

// Actuators
export { PumpActuator } from './actuators/pump-actuator';
export { LightActuator } from './actuators/light-actuator';
export { ValveActuator } from './actuators/valve-actuator';

// Physics
export { HydroponicPhysicsModelImpl } from './physics/hydroponic-physics-model';
export { ChemistryModelImpl } from './physics/chemistry-model';

// Integration
export { GladysIntegrationAdapter } from './integration/gladys-integration-adapter';
export { RestAPIServer } from './api/rest-api-server';

// Types
export * from './types';

// Version
export const version = '1.0.0';
