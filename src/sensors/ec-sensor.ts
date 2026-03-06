/**
 * EC (Electrical Conductivity) Sensor implementation
 * 
 * Simulates an EC sensor that reads from the hydroponic system state,
 * applies Gaussian noise, and ensures values stay within valid bounds (0.0-5.0 mS/cm).
 * 
 * Requirements: 2.1, 2.2, 2.5
 */

import { Sensor, SensorType, HydroponicState } from '../types';
import { generateGaussianNoise, clamp } from '../utils/noise-generator';

/**
 * Configuration options for ECSensor
 */
export interface ECSensorConfig {
  id: string;
  baseline?: number; // Initial EC value (default: 1.5 mS/cm)
  noiseStdDev?: number; // Noise standard deviation (default: 0.05)
}

/**
 * EC Sensor implementation
 * 
 * Measures electrical conductivity from the hydroponic system with realistic noise.
 * Valid EC range: 0.0-5.0 mS/cm
 * Noise: ±0.05 mS/cm (Gaussian)
 */
export class ECSensor implements Sensor {
  public readonly id: string;
  public readonly type: SensorType = SensorType.EC;
  
  private baseline: number;
  private noiseStdDev: number;
  private currentRawValue: number;
  
  // EC bounds
  private static readonly MIN_EC = 0.0;
  private static readonly MAX_EC = 5.0;
  
  // Default configuration values
  private static readonly DEFAULT_BASELINE = 1.5;
  private static readonly DEFAULT_NOISE_STDDEV = 0.05;
  
  constructor(config: ECSensorConfig) {
    this.id = config.id;
    this.baseline = config.baseline ?? ECSensor.DEFAULT_BASELINE;
    this.noiseStdDev = config.noiseStdDev ?? ECSensor.DEFAULT_NOISE_STDDEV;
    
    // Validate baseline is within bounds
    if (this.baseline < ECSensor.MIN_EC || this.baseline > ECSensor.MAX_EC) {
      throw new Error(
        `EC baseline must be between 0.0 and 5.0 mS/cm, got ${this.baseline}`
      );
    }
    
    // Initialize with baseline value
    this.currentRawValue = this.baseline;
  }
  
  /**
   * Get current EC reading with noise applied
   * @returns EC value with Gaussian noise, clamped to valid range (0.0-5.0 mS/cm)
   */
  getValue(): number {
    const noise = generateGaussianNoise(0, this.noiseStdDev);
    const valueWithNoise = this.currentRawValue + noise;
    
    // Ensure value stays within valid EC range
    return clamp(valueWithNoise, ECSensor.MIN_EC, ECSensor.MAX_EC);
  }
  
  /**
   * Get raw EC value from physics model without noise
   * @returns Raw EC value, clamped to valid range (0.0-5.0 mS/cm)
   */
  getRawValue(): number {
    return clamp(this.currentRawValue, ECSensor.MIN_EC, ECSensor.MAX_EC);
  }
  
  /**
   * Set the baseline EC value
   * @param value - New baseline EC value (must be 0.0-5.0 mS/cm)
   */
  setBaseline(value: number): void {
    if (value < ECSensor.MIN_EC || value > ECSensor.MAX_EC) {
      throw new Error(
        `EC baseline must be between 0.0 and 5.0 mS/cm, got ${value}`
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
   * Reads EC from system state
   * @param systemState - Current state of the hydroponic system
   */
  updateFromPhysics(systemState: HydroponicState): void {
    // Read EC from physics model
    this.currentRawValue = systemState.ec;
    
    // Ensure value stays within bounds
    this.currentRawValue = clamp(
      this.currentRawValue,
      ECSensor.MIN_EC,
      ECSensor.MAX_EC
    );
  }
}
