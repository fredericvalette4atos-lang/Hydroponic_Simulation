/**
 * Temperature Sensor implementation
 * 
 * Simulates a temperature sensor that reads from the hydroponic system state,
 * applies Gaussian noise, simulates drift over time, and ensures values
 * stay within valid bounds (0.0-50.0°C).
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import { Sensor, SensorType, HydroponicState } from '../types';
import { generateGaussianNoise, clamp } from '../utils/noise-generator';

/**
 * Configuration options for TemperatureSensor
 */
export interface TemperatureSensorConfig {
  id: string;
  baseline?: number; // Initial temperature value (default: 22.0°C)
  noiseStdDev?: number; // Noise standard deviation (default: 0.2)
  driftRate?: number; // Drift rate in °C per hour (default: 2.0)
}

/**
 * Temperature Sensor implementation
 * 
 * Measures temperature from the hydroponic system with realistic noise and drift.
 * Valid temperature range: 0.0-50.0°C
 * Noise: ±0.2°C (Gaussian)
 * Drift: ±2.0°C per hour
 */
export class TemperatureSensor implements Sensor {
  public readonly id: string;
  public readonly type: SensorType = SensorType.TEMPERATURE;
  
  private baseline: number;
  private noiseStdDev: number;
  private driftRate: number;
  private currentRawValue: number;
  private driftAccumulator: number;
  private lastUpdateTime: number;
  
  // Temperature bounds
  private static readonly MIN_TEMP = 0.0;
  private static readonly MAX_TEMP = 50.0;
  
  // Default configuration values
  private static readonly DEFAULT_BASELINE = 22.0;
  private static readonly DEFAULT_NOISE_STDDEV = 0.2;
  private static readonly DEFAULT_DRIFT_RATE = 2.0;
  
  constructor(config: TemperatureSensorConfig) {
    this.id = config.id;
    this.baseline = config.baseline ?? TemperatureSensor.DEFAULT_BASELINE;
    this.noiseStdDev = config.noiseStdDev ?? TemperatureSensor.DEFAULT_NOISE_STDDEV;
    this.driftRate = config.driftRate ?? TemperatureSensor.DEFAULT_DRIFT_RATE;
    
    // Validate baseline is within bounds
    if (this.baseline < TemperatureSensor.MIN_TEMP || this.baseline > TemperatureSensor.MAX_TEMP) {
      throw new Error(
        `Temperature baseline must be between 0.0 and 50.0°C, got ${this.baseline}`
      );
    }
    
    // Initialize with baseline value
    this.currentRawValue = this.baseline;
    this.driftAccumulator = 0;
    this.lastUpdateTime = 0;
  }
  
  /**
   * Get current temperature reading with noise applied
   * @returns Temperature value with Gaussian noise, clamped to valid range (0.0-50.0°C)
   */
  getValue(): number {
    const noise = generateGaussianNoise(0, this.noiseStdDev);
    const valueWithNoise = this.currentRawValue + noise;
    
    // Ensure value stays within valid temperature range
    return clamp(valueWithNoise, TemperatureSensor.MIN_TEMP, TemperatureSensor.MAX_TEMP);
  }
  
  /**
   * Get raw temperature value from physics model without noise
   * @returns Raw temperature value, clamped to valid range (0.0-50.0°C)
   */
  getRawValue(): number {
    return clamp(this.currentRawValue, TemperatureSensor.MIN_TEMP, TemperatureSensor.MAX_TEMP);
  }
  
  /**
   * Set the baseline temperature value
   * @param value - New baseline temperature value (must be 0.0-50.0°C)
   */
  setBaseline(value: number): void {
    if (value < TemperatureSensor.MIN_TEMP || value > TemperatureSensor.MAX_TEMP) {
      throw new Error(
        `Temperature baseline must be between 0.0 and 50.0°C, got ${value}`
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
   * Reads temperature from system state and applies drift simulation
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
      
      // Limit total drift to ±2.0°C per hour (accumulated)
      const maxTotalDrift = this.driftRate * (currentTime / 3600);
      this.driftAccumulator = clamp(
        this.driftAccumulator,
        -maxTotalDrift,
        maxTotalDrift
      );
    }
    
    // Read temperature from physics model and apply drift
    this.currentRawValue = systemState.temperature + this.driftAccumulator;
    
    // Ensure value stays within bounds
    this.currentRawValue = clamp(
      this.currentRawValue,
      TemperatureSensor.MIN_TEMP,
      TemperatureSensor.MAX_TEMP
    );
    
    this.lastUpdateTime = currentTime;
  }
}
