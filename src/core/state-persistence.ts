/**
 * StatePersistence implementation
 * 
 * Handles saving and loading simulation state to/from JSON files.
 * Uses JSON schema validation to ensure state integrity.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { writeFileSync, readFileSync } from 'fs';
import {
  SimulationState,
  SerializedSensorState,
  SerializedActuatorState,
  Sensor,
  Actuator,
  HydroponicState,
  SimulationConfig
} from '../types';
import { validateSimulationState } from '../utils/schema-validator';

/**
 * Interface for components that can provide simulation state
 */
export interface SimulationStateProvider {
  getSensors(): Map<string, Sensor>;
  getActuators(): Map<string, Actuator>;
  getHydroponicState(): HydroponicState;
  getConfig(): SimulationConfig;
  getSimulatedTime(): number;
}

/**
 * Interface for components that can restore simulation state
 */
export interface SimulationStateRestorer {
  restoreSensors(sensors: Map<string, SerializedSensorState>): void;
  restoreActuators(actuators: Map<string, SerializedActuatorState>): void;
  restoreHydroponicState(state: HydroponicState): void;
  restoreConfig(config: SimulationConfig): void;
  restoreSimulatedTime(time: number): void;
}

/**
 * StatePersistence class for saving and loading simulation state
 * 
 * Provides methods to:
 * - Serialize current simulation state to JSON file
 * - Deserialize state from JSON file
 * - Validate state files against JSON schema
 * - Restore simulation state from loaded data
 */
export class StatePersistence {
  private static readonly STATE_VERSION = '1.0.0';

  constructor(
    private stateProvider: SimulationStateProvider,
    private stateRestorer?: SimulationStateRestorer
  ) {}

  /**
   * Save current simulation state to a JSON file
   * 
   * Requirement 12.1: Serialize current state to JSON file
   * 
   * @param filepath - Path to save the state file
   * @throws Error if file write fails
   */
  save(filepath: string): void {
    const state: SimulationState = {
      version: StatePersistence.STATE_VERSION,
      timestamp: Date.now(),
      simulatedTime: this.stateProvider.getSimulatedTime(),
      sensors: this.serializeSensors(),
      actuators: this.serializeActuators(),
      hydroponicState: this.stateProvider.getHydroponicState(),
      config: this.stateProvider.getConfig()
    };

    // Validate state before saving
    this.validate(state);

    // Write to file with pretty formatting
    const json = JSON.stringify(state, null, 2);
    writeFileSync(filepath, json, 'utf-8');
  }

  /**
   * Load simulation state from a JSON file
   * 
   * Requirement 12.2: Deserialize state from JSON file
   * 
   * @param filepath - Path to the state file
   * @returns Loaded simulation state
   * @throws Error if file read fails or validation fails
   */
  load(filepath: string): SimulationState {
    // Read file
    const json = readFileSync(filepath, 'utf-8');
    const state = JSON.parse(json);

    // Validate state
    this.validate(state);

    return state as SimulationState;
  }

  /**
   * Validate a simulation state object against JSON schema
   * 
   * Requirement 12.3: Validate state files using ajv and JSON schema
   * Requirement 12.4: Return descriptive error message for invalid state
   * 
   * @param state - State object to validate
   * @throws SchemaValidationError if validation fails with descriptive message
   */
  validate(state: unknown): asserts state is SimulationState {
    try {
      validateSimulationState(state);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`State validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Restore simulation state from a loaded state object
   * 
   * Applies the loaded state to the simulation by calling the state restorer
   * 
   * @param state - State object to restore
   * @throws Error if state restorer is not configured
   */
  restoreState(state: SimulationState): void {
    if (!this.stateRestorer) {
      throw new Error('State restorer not configured');
    }

    // Convert sensor objects to Map
    const sensorsMap = new Map<string, SerializedSensorState>();
    for (const [id, sensorState] of Object.entries(state.sensors)) {
      sensorsMap.set(id, sensorState);
    }

    // Convert actuator objects to Map
    const actuatorsMap = new Map<string, SerializedActuatorState>();
    for (const [id, actuatorState] of Object.entries(state.actuators)) {
      actuatorsMap.set(id, actuatorState);
    }

    // Restore all state components
    this.stateRestorer.restoreSensors(sensorsMap);
    this.stateRestorer.restoreActuators(actuatorsMap);
    this.stateRestorer.restoreHydroponicState(state.hydroponicState);
    this.stateRestorer.restoreConfig(state.config);
    this.stateRestorer.restoreSimulatedTime(state.simulatedTime);
  }

  /**
   * Serialize all sensors to a plain object
   * 
   * Helper method for save()
   * 
   * @returns Object mapping sensor IDs to serialized sensor states
   */
  private serializeSensors(): { [id: string]: SerializedSensorState } {
    const sensors: { [id: string]: SerializedSensorState } = {};
    
    for (const [id, sensor] of this.stateProvider.getSensors()) {
      sensors[id] = {
        type: sensor.type,
        baseline: sensor.getRawValue(), // Use raw value as baseline for restoration
        currentValue: sensor.getRawValue(),
        noiseStdDev: 0.1 // Default noise level, should be stored in sensor if available
      };
    }

    return sensors;
  }

  /**
   * Serialize all actuators to a plain object
   * 
   * Helper method for save()
   * 
   * @returns Object mapping actuator IDs to serialized actuator states
   */
  private serializeActuators(): { [id: string]: SerializedActuatorState } {
    const actuators: { [id: string]: SerializedActuatorState } = {};
    
    for (const [id, actuator] of this.stateProvider.getActuators()) {
      actuators[id] = {
        type: actuator.type,
        state: actuator.getState(),
        totalRuntime: actuator.getTotalRuntime(),
        failed: actuator.isFailed()
      };
    }

    return actuators;
  }

  /**
   * Load state from file and restore it to the simulation
   * 
   * Convenience method that combines load() and restoreState()
   * 
   * @param filepath - Path to the state file
   * @throws Error if state restorer is not configured or if load/restore fails
   */
  loadAndRestore(filepath: string): void {
    const state = this.load(filepath);
    this.restoreState(state);
  }

  /**
   * Get the current state version
   */
  static getVersion(): string {
    return StatePersistence.STATE_VERSION;
  }
}
