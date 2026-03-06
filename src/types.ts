/**
 * Core type definitions for the Hydroponic Test Simulation system
 * 
 * This file contains all interfaces, enums, and type definitions used throughout
 * the simulation system, including sensors, actuators, physics models, configuration,
 * and integration interfaces.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Types of sensors supported by the simulation
 */
export enum SensorType {
  PH = 'ph',
  EC = 'ec',
  TEMPERATURE = 'temperature',
  WATER_LEVEL = 'water_level'
}

/**
 * Types of actuators supported by the simulation
 */
export enum ActuatorType {
  PUMP = 'pump',
  LIGHT = 'light',
  VALVE = 'valve'
}

/**
 * Types of pumps for different purposes
 */
export enum PumpType {
  WATER = 'water',
  NUTRIENT = 'nutrient',
  PH_UP = 'ph_up',
  PH_DOWN = 'ph_down'
}

/**
 * Log severity levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * Quality indicator for sensor readings
 */
export enum ReadingQuality {
  GOOD = 'good',
  DEGRADED = 'degraded',
  FAILED = 'failed'
}

// ============================================================================
// Sensor Interfaces
// ============================================================================

/**
 * Base interface for all sensor components
 */
export interface Sensor {
  id: string;
  type: SensorType;
  
  /**
   * Get current reading with noise applied
   */
  getValue(): number;
  
  /**
   * Get raw value from physics model (no noise)
   */
  getRawValue(): number;
  
  /**
   * Set the baseline value for the sensor
   */
  setBaseline(value: number): void;
  
  /**
   * Set the noise level (standard deviation)
   */
  setNoiseLevel(stddev: number): void;
  
  /**
   * Update sensor state from physics model
   */
  updateFromPhysics(systemState: HydroponicState): void;
}

/**
 * Configuration for a sensor component
 */
export interface SensorConfig {
  id: string;
  baseline: number;
  noiseStdDev?: number;
  driftRate?: number;
}

/**
 * Sensor reading with metadata
 */
export interface SensorReading {
  sensorId: string;
  value: number;
  unit: string;
  timestamp: number;
  simulatedTime: number;
  quality: ReadingQuality;
}

// ============================================================================
// Actuator Interfaces
// ============================================================================

/**
 * State of an actuator
 */
export interface ActuatorState {
  active: boolean;
  intensity?: number; // For lights (0-100%)
  timestamp: number;
}

/**
 * Base interface for all actuator components
 */
export interface Actuator {
  id: string;
  type: ActuatorType;
  
  /**
   * Set the actuator state
   */
  setState(state: ActuatorState): void;
  
  /**
   * Get current actuator state
   */
  getState(): ActuatorState;
  
  /**
   * Set failure probability (0.0-1.0)
   */
  setFailureProbability(probability: number): void;
  
  /**
   * Check if actuator has failed
   */
  isFailed(): boolean;
  
  /**
   * Get total runtime in seconds
   */
  getTotalRuntime(): number;
  
  /**
   * Get the effect this actuator has on the physics model
   */
  getPhysicsEffect(): PhysicsEffect;
}

/**
 * Configuration for an actuator component
 */
export interface ActuatorConfig {
  id: string;
  type: string;
  flowRate?: number;
  failureProbability: number;
}

/**
 * Command to control an actuator
 */
export interface ActuatorCommand {
  actuatorId: string;
  action: 'on' | 'off' | 'set_intensity';
  value?: number;
  timestamp: number;
}

/**
 * Effect an actuator has on the physics model
 */
export interface PhysicsEffect {
  waterDelta?: number;
  nutrientDelta?: number;
  temperatureDelta?: number;
  phDelta?: number;
}

// ============================================================================
// Physics Model Interfaces
// ============================================================================

/**
 * Complete state of the hydroponic system
 */
export interface HydroponicState {
  // Water properties
  waterVolume: number; // liters
  waterLevel: number; // percentage (0-100)
  temperature: number; // celsius
  
  // Chemical properties
  ph: number; // 0-14 scale
  ec: number; // mS/cm
  nutrientConcentration: number; // ppm
  
  // Environmental
  ambientTemperature: number; // celsius
  
  // Time
  simulatedTime: number; // seconds
}

/**
 * Configuration for physics simulation parameters
 */
export interface PhysicsConfig {
  evaporationRate: number; // liters/hour
  plantUptakeRate: number; // liters/hour
  nutrientUptakeRate: number; // ppm/hour
  ambientTemperature: number; // celsius
  temperatureDriftRate: number; // celsius/hour
  phDriftRate: number; // pH units/hour
  bufferCapacity?: number; // 0-1, resistance to pH changes
}

/**
 * Snapshot of physics state at a point in time
 */
export interface PhysicsSnapshot {
  waterVolume: number;
  waterLevel: number;
  temperature: number;
  ph: number;
  ec: number;
  nutrientConcentration: number;
  ambientTemperature: number;
}

// ============================================================================
// Time Management Interfaces
// ============================================================================

/**
 * State of the time management system
 */
export interface TimeState {
  realTimeStart: number;
  simulatedTimeStart: number;
  currentRealTime: number;
  currentSimulatedTime: number;
  acceleration: number;
  paused: boolean;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Complete simulation configuration
 */
export interface SimulationConfig {
  // Reservoir configuration
  reservoir: {
    capacity: number; // liters
    initialWaterLevel: number; // percentage
  };
  
  // Sensor configurations
  sensors: {
    ph: SensorConfig;
    ec: SensorConfig;
    temperature: SensorConfig;
    waterLevel: SensorConfig;
  };
  
  // Actuator configurations
  actuators: {
    pumps: ActuatorConfig[];
    lights: ActuatorConfig[];
    valves: ActuatorConfig[];
  };
  
  // Physics parameters
  physics: PhysicsConfig;
  
  // Simulation parameters
  simulation?: {
    tickRate: number; // updates per second
    timeAcceleration: number;
  };
  
  // Logging configuration
  logging?: {
    level: LogLevel;
    filepath: string;
    rotationPolicy: 'daily' | 'size';
    maxSize?: number; // MB
  };
}

// ============================================================================
// Test Scenario Interfaces
// ============================================================================

/**
 * Event in a test scenario
 */
export interface ScenarioEvent {
  time: number; // simulated seconds from start
  type: 'actuator_command' | 'parameter_change' | 'disturbance';
  target: string;
  value: any;
}

/**
 * Failure condition in a test scenario
 */
export interface ScenarioFailure {
  actuatorId: string;
  failureTime: number; // simulated seconds
  duration: number; // seconds
}

/**
 * Complete test scenario definition
 */
export interface TestScenario {
  name: string;
  description: string;
  
  // Initial conditions
  initialState: {
    ph: number;
    ec: number;
    temperature: number;
    waterLevel: number;
  };
  
  // Scheduled events
  events: ScenarioEvent[];
  
  // Failure conditions
  failures?: ScenarioFailure[];
}

// ============================================================================
// State Persistence Interfaces
// ============================================================================

/**
 * Serialized sensor state
 */
export interface SerializedSensorState {
  type: string;
  baseline: number;
  currentValue: number;
  noiseStdDev: number;
}

/**
 * Serialized actuator state
 */
export interface SerializedActuatorState {
  type: string;
  state: ActuatorState;
  totalRuntime: number;
  failed: boolean;
}

/**
 * Complete simulation state for persistence
 */
export interface SimulationState {
  version: string;
  timestamp: number;
  simulatedTime: number;
  
  // Sensor states
  sensors: {
    [id: string]: SerializedSensorState;
  };
  
  // Actuator states
  actuators: {
    [id: string]: SerializedActuatorState;
  };
  
  // Physics state
  hydroponicState: HydroponicState;
  
  // Configuration
  config: SimulationConfig;
}

// ============================================================================
// Gladys Integration Interfaces
// ============================================================================

/**
 * Gladys device feature definition
 */
export interface GladysFeature {
  id: string;
  name: string;
  category: string; // 'ph-sensor', 'ec-sensor', 'pump', etc.
  type: 'decimal' | 'binary';
  unit?: string;
  min?: number;
  max?: number;
}

/**
 * Gladys device definition
 */
export interface GladysDevice {
  id: string;
  name: string;
  type: 'sensor' | 'actuator';
  model: string;
  features: GladysFeature[];
}

// ============================================================================
// API Response Interfaces
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  simulatedTime: number;
}

/**
 * Sensor value response
 */
export interface SensorValueResponse {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: number;
}

/**
 * Actuator command request
 */
export interface ActuatorCommandRequest {
  state: boolean;
  intensity?: number;
}

/**
 * Simulation status response
 */
export interface SimulationStatusResponse {
  running: boolean;
  paused: boolean;
  simulatedTime: number;
  realTime: number;
  timeAcceleration: number;
}

// ============================================================================
// Event Logging Interfaces
// ============================================================================

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  simulatedTime: number;
  level: LogLevel;
  message: string;
  context?: any;
}

// ============================================================================
// Error Interfaces
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
