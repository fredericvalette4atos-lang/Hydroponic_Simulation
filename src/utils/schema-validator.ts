/**
 * Schema validation utilities using AJV (Another JSON Schema Validator)
 * 
 * This module provides validation functions for configuration, scenarios, and state
 * persistence using JSON Schema definitions.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import { SimulationConfig, TestScenario, SimulationState } from '../types';

// Import JSON schemas
import configSchema from '../schemas/config.schema.json';
import scenarioSchema from '../schemas/scenario.schema.json';
import stateSchema from '../schemas/state.schema.json';

/**
 * Custom error class for schema validation failures
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public errors: ErrorObject[]
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }

  /**
   * Get a human-readable error message with all validation errors
   */
  getDetailedMessage(): string {
    const errorMessages = this.errors.map(err => {
      const path = err.instancePath || 'root';
      return `  - ${path}: ${err.message}`;
    });
    return `${this.message}\n${errorMessages.join('\n')}`;
  }
}

/**
 * Schema validator class that manages AJV instances and validation functions
 */
export class SchemaValidator {
  private ajv: Ajv;
  private validateConfig: ValidateFunction;
  private validateScenario: ValidateFunction;
  private validateState: ValidateFunction;

  constructor() {
    // Initialize AJV with strict mode and all errors
    this.ajv = new Ajv({
      allErrors: true,
      strict: true,
      validateFormats: true
    });

    // Compile validation functions
    this.validateConfig = this.ajv.compile(configSchema);
    this.validateScenario = this.ajv.compile(scenarioSchema);
    this.validateState = this.ajv.compile(stateSchema);
  }

  /**
   * Validate a simulation configuration object
   * 
   * @param config - Configuration object to validate
   * @throws {SchemaValidationError} If validation fails
   */
  validateConfiguration(config: unknown): asserts config is SimulationConfig {
    const valid = this.validateConfig(config);
    if (!valid && this.validateConfig.errors) {
      throw new SchemaValidationError(
        'Configuration validation failed',
        this.validateConfig.errors
      );
    }
  }

  /**
   * Validate a test scenario object
   * 
   * @param scenario - Scenario object to validate
   * @throws {SchemaValidationError} If validation fails
   */
  validateTestScenario(scenario: unknown): asserts scenario is TestScenario {
    const valid = this.validateScenario(scenario);
    if (!valid && this.validateScenario.errors) {
      throw new SchemaValidationError(
        'Test scenario validation failed',
        this.validateScenario.errors
      );
    }
  }

  /**
   * Validate a simulation state object
   * 
   * @param state - State object to validate
   * @throws {SchemaValidationError} If validation fails
   */
  validateSimulationState(state: unknown): asserts state is SimulationState {
    const valid = this.validateState(state);
    if (!valid && this.validateState.errors) {
      throw new SchemaValidationError(
        'Simulation state validation failed',
        this.validateState.errors
      );
    }
  }

  /**
   * Check if a configuration is valid without throwing
   * 
   * @param config - Configuration object to check
   * @returns true if valid, false otherwise
   */
  isValidConfiguration(config: unknown): config is SimulationConfig {
    return this.validateConfig(config) === true;
  }

  /**
   * Check if a scenario is valid without throwing
   * 
   * @param scenario - Scenario object to check
   * @returns true if valid, false otherwise
   */
  isValidTestScenario(scenario: unknown): scenario is TestScenario {
    return this.validateScenario(scenario) === true;
  }

  /**
   * Check if a state is valid without throwing
   * 
   * @param state - State object to check
   * @returns true if valid, false otherwise
   */
  isValidSimulationState(state: unknown): state is SimulationState {
    return this.validateState(state) === true;
  }

  /**
   * Get validation errors from the last validation attempt
   * 
   * @param type - Type of schema ('config', 'scenario', or 'state')
   * @returns Array of error objects or null if no errors
   */
  getErrors(type: 'config' | 'scenario' | 'state'): ErrorObject[] | null {
    switch (type) {
      case 'config':
        return this.validateConfig.errors || null;
      case 'scenario':
        return this.validateScenario.errors || null;
      case 'state':
        return this.validateState.errors || null;
    }
  }

  /**
   * Format validation errors into a human-readable string
   * 
   * @param errors - Array of AJV error objects
   * @returns Formatted error message
   */
  formatErrors(errors: ErrorObject[]): string {
    return errors.map(err => {
      const path = err.instancePath || 'root';
      const message = err.message || 'validation failed';
      const params = err.params ? ` (${JSON.stringify(err.params)})` : '';
      return `${path}: ${message}${params}`;
    }).join('\n');
  }
}

// Export a singleton instance for convenience
export const schemaValidator: SchemaValidator = new SchemaValidator();

/**
 * Convenience function to validate configuration
 */
export function validateConfiguration(config: unknown): asserts config is SimulationConfig {
  schemaValidator.validateConfiguration(config);
}

/**
 * Convenience function to validate test scenario
 */
export function validateTestScenario(scenario: unknown): asserts scenario is TestScenario {
  schemaValidator.validateTestScenario(scenario);
}

/**
 * Convenience function to validate simulation state
 */
export function validateSimulationState(state: unknown): asserts state is SimulationState {
  schemaValidator.validateSimulationState(state);
}
