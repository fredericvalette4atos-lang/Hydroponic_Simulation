/**
 * Water Level Sensor implementation
 * 
 * Simulates a water level sensor that reads from the hydroponic system state,
 * applies Gaussian noise, and ensures values stay within valid bounds (0.0-100.0%).
 * 
 * Requirements: 4.1, 4.2, 4.5
 */

import { Sensor, SensorType, HydroponicState } from '../types';
import { generateGaussianNoise, clamp } from '../utils/noise-generator';

/**
 * Configuration options for WaterLevelSensor
 */
export interface WaterLevelSensorConfig {
  id: string;
  baseline?: number; // Initial water level value (default: 75.0%)
  noiseStdDev?: number; // Noise standard deviation (default: 1.0)
}

/**
 * Water Level Sensor implementation
 * 
 * Measures water level from the hydroponic system with realistic noise.
 * Valid water level range: 0.0-100.0%
 * Noise: ±1.0% (Gaussian)
 */
export class WaterLevelSensor implements Sensor {
  public readonly id: string;
  public readonly type: SensorType = SensorType.WATER_LEVEL;
  
  private baseline: number;
  private noiseStdDev: number;
  private currentRawValue: number;
  
  // Water level bounds
  private static readonly MIN_LEVEL = 0.0;
  private static readonly MAX_LEVEL = 100.0;
  
  // Default configuration values
  private static readonly DEFAULT_BASELINE = 75.0;
  private static readonly DEFAULT_NOISE_STDDEV = 1.0;
  
  constructor(config: WaterLevelSensorConfig) {
    this.id = config.id;
    this.baseline = config.baseline ?? WaterLevelSensor.DEFAULT_BASELINE;
    this.noiseStdDev = config.noiseStdDev ?? WaterLevelSensor.DEFAULT_NOISE_STDDEV;
    
    // Validate baseline is within bounds
    if (this.baseline < WaterLevelSensor.MIN_LEVEL || this.baseline > WaterLevelSensor.MAX_LEVEL) {
      throw new Error(
        `Water level baseline must be between 0.0 and 100.0%, got ${this.baseline}`
      );
    }
    
    // Initialize with baseline value
    this.currentRawValue = this.baseline;
  }
  
  /**
   * Get current water level reading with noise applied
   * @returns Water level value with Gaussian noise, clamped to valid range (0.0-100.0%)
   */
  getValue(): number {
    const noise = generateGaussianNoise(0, this.noiseStdDev);
    const valueWithNoise = this.currentRawValue + noise;
    
    // Ensure value stays within valid water level range
    return clamp(valueWithNoise, WaterLevelSensor.MIN_LEVEL, WaterLevelSensor.MAX_LEVEL);
  }
  
  /**
   * Get raw water level value from physics model without noise
   * @returns Raw water level value, clamped to valid range (0.0-100.0%)
   */
  getRawValue(): number {
    return clamp(this.currentRawValue, WaterLevelSensor.MIN_LEVEL, WaterLevelSensor.MAX_LEVEL);
  }
  
  /**
   * Set the baseline water level value
   * @param value - New baseline water level value (must be 0.0-100.0%)
   */
  setBaseline(value: number): void {
    if (value < WaterLevelSensor.MIN_LEVEL || value > WaterLevelSensor.MAX_LEVEL) {
      throw new Error(
        `Water level baseline must be between 0.0 and 100.0%, got ${value}`
      );
    }
    
    this.baseline = value;
    this.currentRawValue = value;
  }
  
  /**
   * Set the noise level (standard deviation)
   * @param stddev - Standard deviation for Gaussian noise
   */
  setNoiseLevel(stddev: number): void {
    if (stddev < 0) {
      throw new Error(`Noise standard deviation must be non-negative, got ${stddev}`);
    }
    
    this.noiseStdDev = stddev;
  }
  
  /**
   * Update sensor state from the hydroponic physics model
   * Reads water level from system state
   * @param systemState - Current state of the hydroponic system
   */
  updateFromPhysics(systemState: HydroponicState): void {
    // Read water level from physics model
    this.currentRawValue = systemState.waterLevel;
    
    // Ensure value stays within bounds
    this.currentRawValue = clamp(
      this.currentRawValue,
      WaterLevelSensor.MIN_LEVEL,
      WaterLevelSensor.MAX_LEVEL
    );
  }
}
