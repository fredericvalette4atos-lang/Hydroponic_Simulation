/**
 * Scenario loader for the Hydroponic Test Simulation system
 * 
 * This module provides functionality to load and validate test scenarios from JSON files.
 * Scenarios define initial system state, scheduled events, and failure conditions for testing.
 */

import { readFileSync } from 'fs';
import { TestScenario } from '../types';
import { schemaValidator, SchemaValidationError } from '../utils/schema-validator';

/**
 * Interface for simulation core (to be implemented in task 13)
 * This defines the minimal interface needed for applying scenarios
 */
export interface ISimulationCore {
  getSensor(id: string): ISensor;
  getAllSensors(): ISensor[];
  scheduleEvent(event: any): void;
  scheduleFailure(failure: any): void;
}

/**
 * Minimal sensor interface for scenario application
 */
export interface ISensor {
  id: string;
  type: string;
  setBaseline(value: number): void;
}

/**
 * Scenario loader class
 * 
 * Handles loading test scenarios from JSON files, validating against schema,
 * and applying scenarios to initialize simulation state.
 */
export class ScenarioLoader {
  /**
   * Load a test scenario from a JSON file
   * 
   * @param filepath - Path to the scenario JSON file
   * @returns Validated test scenario object
   * @throws {Error} If file cannot be read or parsed
   * @throws {SchemaValidationError} If scenario is invalid
   */
  loadFromFile(filepath: string): TestScenario {
    try {
      // Read and parse JSON file
      const fileContent = readFileSync(filepath, 'utf-8');
      const scenario = JSON.parse(fileContent);
      
      // Validate against schema
      this.validate(scenario);
      
      return scenario as TestScenario;
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        // Re-throw validation errors with detailed message
        throw new Error(
          `Scenario validation failed for file '${filepath}':\n${error.getDetailedMessage()}`
        );
      } else if (error instanceof SyntaxError) {
        // JSON parsing error
        throw new Error(
          `Failed to parse scenario file '${filepath}': Invalid JSON syntax - ${error.message}`
        );
      } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not found
        throw new Error(
          `Scenario file not found: '${filepath}'`
        );
      } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        // Permission denied
        throw new Error(
          `Permission denied reading scenario file: '${filepath}'`
        );
      } else {
        // Other errors
        throw new Error(
          `Failed to load scenario from '${filepath}': ${(error as Error).message}`
        );
      }
    }
  }

  /**
   * Validate a test scenario against JSON schema
   * 
   * @param scenario - Scenario object to validate
   * @throws {SchemaValidationError} If validation fails with detailed error information
   */
  validate(scenario: unknown): asserts scenario is TestScenario {
    try {
      schemaValidator.validateTestScenario(scenario);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        // Enhance error message with specific field information
        const errorDetails = error.errors.map(err => {
          const field = err.instancePath || 'root';
          const message = err.message || 'validation failed';
          
          // Add helpful context based on error type
          let hint = '';
          if (err.keyword === 'required') {
            hint = ` (missing required field: ${err.params.missingProperty})`;
          } else if (err.keyword === 'type') {
            hint = ` (expected ${err.params.type})`;
          } else if (err.keyword === 'minimum') {
            hint = ` (must be >= ${err.params.limit})`;
          } else if (err.keyword === 'maximum') {
            hint = ` (must be <= ${err.params.limit})`;
          } else if (err.keyword === 'enum') {
            hint = ` (allowed values: ${err.params.allowedValues.join(', ')})`;
          } else if (err.keyword === 'minLength') {
            hint = ` (must have at least ${err.params.limit} characters)`;
          }
          
          return `  ${field}: ${message}${hint}`;
        }).join('\n');
        
        throw new SchemaValidationError(
          `Test scenario validation failed:\n${errorDetails}`,
          error.errors
        );
      }
      throw error;
    }
  }

  /**
   * Apply a test scenario to initialize simulation state
   * 
   * This method configures the simulation core with the scenario's initial state,
   * schedules all events, and configures failure conditions.
   * 
   * @param simCore - Simulation core instance to configure
   * @param scenario - Test scenario to apply
   * @throws {Error} If sensors are not found or configuration fails
   */
  applyScenario(simCore: ISimulationCore, scenario: TestScenario): void {
    try {
      // Set initial sensor states
      this.applyInitialState(simCore, scenario);
      
      // Schedule events
      this.scheduleEvents(simCore, scenario);
      
      // Configure failures
      this.scheduleFailures(simCore, scenario);
      
    } catch (error) {
      throw new Error(
        `Failed to apply scenario '${scenario.name}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Apply initial state from scenario to sensors
   * 
   * @param simCore - Simulation core instance
   * @param scenario - Test scenario with initial state
   * @throws {Error} If sensor is not found
   */
  private applyInitialState(simCore: ISimulationCore, scenario: TestScenario): void {
    const { initialState } = scenario;
    
    try {
      // Get all sensors and create a map by type
      const allSensors = simCore.getAllSensors();
      const sensorsByType = new Map<string, ISensor>();
      
      for (const sensor of allSensors) {
        sensorsByType.set(sensor.type, sensor);
      }
      
      // Set pH sensor baseline
      const phSensor = sensorsByType.get('ph');
      if (!phSensor) {
        throw new Error('Sensor with type ph not found');
      }
      phSensor.setBaseline(initialState.ph);
      
      // Set EC sensor baseline
      const ecSensor = sensorsByType.get('ec');
      if (!ecSensor) {
        throw new Error('Sensor with type ec not found');
      }
      ecSensor.setBaseline(initialState.ec);
      
      // Set temperature sensor baseline
      const tempSensor = sensorsByType.get('temperature');
      if (!tempSensor) {
        throw new Error('Sensor with type temperature not found');
      }
      tempSensor.setBaseline(initialState.temperature);
      
      // Set water level sensor baseline
      const waterLevelSensor = sensorsByType.get('water_level');
      if (!waterLevelSensor) {
        throw new Error('Sensor with type water_level not found');
      }
      waterLevelSensor.setBaseline(initialState.waterLevel);
      
    } catch (error) {
      throw new Error(
        `Failed to set initial state: ${(error as Error).message}`
      );
    }
  }

  /**
   * Schedule events from scenario
   * 
   * @param simCore - Simulation core instance
   * @param scenario - Test scenario with events
   */
  private scheduleEvents(simCore: ISimulationCore, scenario: TestScenario): void {
    if (!scenario.events || scenario.events.length === 0) {
      return;
    }
    
    try {
      for (const event of scenario.events) {
        simCore.scheduleEvent(event);
      }
    } catch (error) {
      throw new Error(
        `Failed to schedule events: ${(error as Error).message}`
      );
    }
  }

  /**
   * Schedule failure conditions from scenario
   * 
   * @param simCore - Simulation core instance
   * @param scenario - Test scenario with optional failures
   */
  private scheduleFailures(simCore: ISimulationCore, scenario: TestScenario): void {
    if (!scenario.failures || scenario.failures.length === 0) {
      return;
    }
    
    try {
      for (const failure of scenario.failures) {
        simCore.scheduleFailure(failure);
      }
    } catch (error) {
      throw new Error(
        `Failed to schedule failures: ${(error as Error).message}`
      );
    }
  }
}
