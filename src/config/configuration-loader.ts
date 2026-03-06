/**
 * Configuration loader for the Hydroponic Test Simulation system
 * 
 * This module provides functionality to load, validate, and apply defaults
 * to simulation configuration files.
 */

import { readFileSync } from 'fs';
import { SimulationConfig, LogLevel } from '../types';
import { schemaValidator, SchemaValidationError } from '../utils/schema-validator';

/**
 * Default configuration values for optional parameters
 */
export const DEFAULT_CONFIG: Partial<SimulationConfig> = {
  simulation: {
    tickRate: 10, // 10 updates per second
    timeAcceleration: 1 // Real-time by default
  },
  logging: {
    level: LogLevel.INFO,
    filepath: './logs/simulation.log',
    rotationPolicy: 'daily'
  },
  physics: {
    evaporationRate: 0.1, // 0.1 liters/hour
    plantUptakeRate: 0.05, // 0.05 liters/hour
    nutrientUptakeRate: 5, // 5 ppm/hour
    ambientTemperature: 22, // 22°C
    temperatureDriftRate: 0.5, // 0.5°C/hour
    phDriftRate: 0.1, // 0.1 pH units/hour
    bufferCapacity: 0.3 // Moderate buffering
  }
};

/**
 * Default sensor configuration values
 */
const DEFAULT_SENSOR_CONFIG = {
  noiseStdDev: 0.05,
  driftRate: 0.0
};

/**
 * Configuration loader class
 * 
 * Handles loading configuration from JSON files, validating against schema,
 * and applying default values for optional parameters.
 */
export class ConfigurationLoader {
  /**
   * Load configuration from a JSON file
   * 
   * @param filepath - Path to the configuration JSON file
   * @returns Validated configuration with defaults applied
   * @throws {Error} If file cannot be read
   * @throws {SchemaValidationError} If configuration is invalid
   */
  loadFromFile(filepath: string): SimulationConfig {
    try {
      // Read and parse JSON file
      const fileContent = readFileSync(filepath, 'utf-8');
      const config = JSON.parse(fileContent);
      
      // Validate against schema
      this.validate(config);
      
      // Apply defaults and return
      return this.applyDefaults(config);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        // Re-throw validation errors with detailed message
        throw new Error(
          `Configuration validation failed for file '${filepath}':\n${error.getDetailedMessage()}`
        );
      } else if (error instanceof SyntaxError) {
        // JSON parsing error
        throw new Error(
          `Failed to parse configuration file '${filepath}': Invalid JSON syntax - ${error.message}`
        );
      } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not found
        throw new Error(
          `Configuration file not found: '${filepath}'`
        );
      } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        // Permission denied
        throw new Error(
          `Permission denied reading configuration file: '${filepath}'`
        );
      } else {
        // Other errors
        throw new Error(
          `Failed to load configuration from '${filepath}': ${(error as Error).message}`
        );
      }
    }
  }

  /**
   * Validate configuration against JSON schema
   * 
   * @param config - Configuration object to validate
   * @throws {SchemaValidationError} If validation fails with detailed error information
   */
  validate(config: unknown): asserts config is SimulationConfig {
    try {
      schemaValidator.validateConfiguration(config);
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
          }
          
          return `  ${field}: ${message}${hint}`;
        }).join('\n');
        
        throw new SchemaValidationError(
          `Configuration validation failed:\n${errorDetails}`,
          error.errors
        );
      }
      throw error;
    }
  }

  /**
   * Apply default values for optional parameters
   * 
   * @param config - Partial configuration object
   * @returns Complete configuration with defaults applied
   */
  applyDefaults(config: Partial<SimulationConfig>): SimulationConfig {
    // Deep merge configuration with defaults
    const mergedConfig: SimulationConfig = {
      reservoir: config.reservoir!,
      sensors: {
        ph: this.applySensorDefaults(config.sensors?.ph!),
        ec: this.applySensorDefaults(config.sensors?.ec!),
        temperature: this.applySensorDefaults(config.sensors?.temperature!),
        waterLevel: this.applySensorDefaults(config.sensors?.waterLevel!)
      },
      actuators: {
        pumps: config.actuators?.pumps || [],
        lights: config.actuators?.lights || [],
        valves: config.actuators?.valves || []
      },
      physics: {
        ...DEFAULT_CONFIG.physics!,
        ...config.physics
      },
      simulation: {
        ...DEFAULT_CONFIG.simulation!,
        ...config.simulation
      },
      logging: {
        ...DEFAULT_CONFIG.logging!,
        ...config.logging
      }
    };

    return mergedConfig;
  }

  /**
   * Apply default values to sensor configuration
   * 
   * @param sensorConfig - Partial sensor configuration
   * @returns Complete sensor configuration with defaults
   */
  private applySensorDefaults(sensorConfig: any): any {
    return {
      ...DEFAULT_SENSOR_CONFIG,
      ...sensorConfig
    };
  }
}
