/**
 * pH Sensor implementation
 * 
 * Simulates a pH sensor that reads from the hydroponic system state,
 * applies Gaussian noise, simulates drift over time, and ensures values
 * stay within valid bounds (0.0-14.0).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */

import { Sensor, SensorType, HydroponicState } from '../types';
import { generateGaussianNoise, clamp } from '../utils/noise-generator';

/**
 * Configuration options for PHSensor
 */
export interface PHSensorConfig {
  id: string;
  baseline?: number; // Initial pH value (default: 7.0)
  noiseStdDev?: number; // Noise standard deviation (default: 0.1)
  driftRate?: number; // Drift rate in pH units per hour (default: 0.5)
}

/**
 * pH Sensor implementation
 * 
 * Measures pH from the hydroponic system with realistic noise and drift.
 * Valid pH range: 0.0-14.0
 * Noise: ±0.1 pH units (Gaussian)
 * Drift: ±0.5 pH units per hour
 */
export class PHSensor implements Sensor {
  public readonly id: string;
  public readonly type: SensorType = SensorType.PH;
  
  private baseline: number;
  private noiseStdDev: number;
  private driftRate: number;
  private currentRawValue: number;
  private driftAccumulator: number;
  private lastUpdateTime: number;
  
  // pH bounds
  private static readonly MIN_PH = 0.0;
  private static readonly MAX_PH = 14.0;
  
  // Default configuration values
  private static readonly DEFAULT_BASELINE = 7.0;
  private static readonly DEFAULT_NOISE_STDDEV = 0.1;
  private static readonly DEFAULT_DRIFT_RATE = 0.5;
  
  constructor(config: PHSensorConfig) {
    this.id = config.id;
    this.baseline = config.baseline ?? PHSensor.DEFAULT_BASELINE;
    this.noiseStdDev = config.noiseStdDev ?? PHSensor.DEFAULT_NOISE_STDDEV;
    this.driftRate = config.driftRate ?? PHSensor.DEFAULT_DRIFT_RATE;
    
    // Validate baseline is within bounds
    if (this.baseline < PHSensor.MIN_PH || this.baseline > PHSensor.MAX_PH) {
      throw new Error(
        `pH baseline must be between 0.0 and 14.0, got ${this.baseline}`
      );
    }
    
    // Initialize with baseline value
    this.currentRawValue = this.baseline;
    this.driftAccumulator = 0;
    this.lastUpdateTime = 0;
  }
  
  /**
   * Get current pH reading with noise applied
   * @returns pH value with Gaussian noise, clamped to valid range (0.0-14.0)
   */
  getValue(): number {
    const noise = generateGaussianNoise(0, this.noiseStdDev);
    const valueWithNoise = this.currentRawValue + noise;
    
    // Ensure value stays within valid pH range
    return clamp(valueWithNoise, PHSensor.MIN_PH, PHSensor.MAX_PH);
  }
  
  /**
   * Get raw pH value from physics model without noise
   * @returns Raw pH value, clamped to valid range (0.0-14.0)
   */
  getRawValue(): number {
    return clamp(this.currentRawValue, PHSensor.MIN_PH, PHSensor.MAX_PH);
  }
  
  /**
   * Set the baseline pH value
   * @param value - New baseline pH value (must be 0.0-14.0)
   */
  setBaseline(value: number): void {
    if (value < PHSensor.MIN_PH || value > PHSensor.MAX_PH) {
      throw new Error(
        `pH baseline must be between 0.0 and 14.0, got ${value}`
      );
    }
    
    this.baseline = value;
    this.currentRawValue = value;
    this.driftAccumulator = 0;
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
   * Reads pH from system state and applies drift simulation
   * @param systemState - Current state of the hydroponic system
   */
  updateFromPhysics(systemState: HydroponicState): void {
    // Calculate time delta in hours
    const currentTime = systemState.simulatedTime;
    const timeDeltaHours = this.lastUpdateTime === 0 
      ? 0 
      : (currentTime - this.lastUpdateTime) / 3600; // Convert seconds to hours
    
    // Apply drift over time
    if (timeDeltaHours > 0) {
      // Drift is random walk: small random changes that accumulate
      // Maximum drift rate is ±driftRate per hour
      const maxDriftThisStep = this.driftRate * timeDeltaHours;
      const driftThisStep = generateGaussianNoise(0, maxDriftThisStep / 3);
      
      this.driftAccumulator += driftThisStep;
      
      // Limit total drift to ±0.5 pH per hour (accumulated)
      const maxTotalDrift = this.driftRate * (currentTime / 3600);
      this.driftAccumulator = clamp(
        this.driftAccumulator,
        -maxTotalDrift,
        maxTotalDrift
      );
    }
    
    // Read pH from physics model and apply drift
    this.currentRawValue = systemState.ph + this.driftAccumulator;
    
    // Ensure value stays within bounds
    this.currentRawValue = clamp(
      this.currentRawValue,
      PHSensor.MIN_PH,
      PHSensor.MAX_PH
    );
    
    this.lastUpdateTime = currentTime;
  }
}
