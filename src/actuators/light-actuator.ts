/**
 * LightActuator implementation
 * 
 * Simulates grow light actuators with intensity control.
 * Supports intensity control from 0-100% and produces temperature effects
 * proportional to the intensity level.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Actuator, ActuatorType, ActuatorState, PhysicsEffect } from '../types';

/**
 * Configuration options for LightActuator
 */
export interface LightActuatorConfig {
  id: string;
  temperatureEffect?: number; // Temperature increase per hour at 100% intensity (default: 5°C/hour)
  failureProbability?: number; // 0.0-1.0, default 0.0
}

/**
 * LightActuator class implementing the Actuator interface
 * 
 * Simulates grow lights with variable intensity control (0-100%).
 * When active, lights increase temperature proportionally to intensity.
 */
export class LightActuator implements Actuator {
  public readonly id: string;
  public readonly type: ActuatorType = ActuatorType.LIGHT;
  
  private temperatureEffect: number;
  private failureProbability: number;
  private state: ActuatorState;
  private totalRuntime: number; // seconds
  private failed: boolean;
  private lastStateChangeTime: number;

  constructor(config: LightActuatorConfig) {
    this.id = config.id;
    this.temperatureEffect = config.temperatureEffect ?? 5.0; // Default 5°C/hour at 100%
    this.failureProbability = config.failureProbability ?? 0.0;
    
    // Initialize state as inactive with 0% intensity
    this.state = {
      active: false,
      intensity: 0,
      timestamp: Date.now()
    };
    
    this.totalRuntime = 0;
    this.failed = false;
    this.lastStateChangeTime = Date.now();
  }

  /**
   * Set the actuator state with intensity control
   * Response time: <100ms (requirement 6.1)
   * Intensity range: 0-100% (requirement 6.2)
   * 
   * @throws Error if actuator has failed or intensity is out of range
   */
  setState(state: ActuatorState): void {
    const startTime = Date.now();
    
    // Validate intensity if provided
    if (state.intensity !== undefined) {
      if (state.intensity < 0 || state.intensity > 100) {
        throw new Error(`Light intensity must be between 0 and 100, got ${state.intensity}`);
      }
    }
    
    // Check for failure simulation
    if (this.checkFailure()) {
      this.failed = true;
      throw new Error(`Actuator ${this.id} has failed`);
    }
    
    // Update runtime if transitioning from active to inactive
    if (this.state.active && !state.active) {
      const runtime = (Date.now() - this.lastStateChangeTime) / 1000;
      this.totalRuntime += runtime;
    }
    
    // Update state with intensity
    this.state = {
      active: state.active,
      intensity: state.intensity ?? (state.active ? 100 : 0), // Default to 100% if active, 0% if inactive
      timestamp: Date.now()
    };
    
    this.lastStateChangeTime = Date.now();
    
    // Ensure response time is <100ms
    const responseTime = Date.now() - startTime;
    if (responseTime >= 100) {
      console.warn(`Actuator ${this.id} response time ${responseTime}ms exceeds 100ms threshold`);
    }
  }

  /**
   * Get current actuator state
   * Requirement 6.1: State persistence
   */
  getState(): ActuatorState {
    return { ...this.state };
  }

  /**
   * Set failure probability
   * 
   * @param probability Value between 0.0 and 1.0
   */
  setFailureProbability(probability: number): void {
    if (probability < 0.0 || probability > 1.0) {
      throw new Error('Failure probability must be between 0.0 and 1.0');
    }
    this.failureProbability = probability;
  }

  /**
   * Check if actuator has failed
   */
  isFailed(): boolean {
    return this.failed;
  }

  /**
   * Get total runtime in seconds
   * Requirement 6.4: Maintenance tracking
   */
  getTotalRuntime(): number {
    let runtime = this.totalRuntime;
    
    // Add current runtime if actuator is active
    if (this.state.active) {
      runtime += (Date.now() - this.lastStateChangeTime) / 1000;
    }
    
    return runtime;
  }

  /**
   * Get the physics effect based on light intensity
   * Requirement 6.3: Temperature effect proportional to intensity
   * 
   * Effect per hour of operation:
   * - Temperature increase proportional to intensity (0-100%)
   * - At 100% intensity: temperatureEffect °C/hour
   * - At 50% intensity: (temperatureEffect * 0.5) °C/hour
   * - At 0% intensity or inactive: no effect
   */
  getPhysicsEffect(): PhysicsEffect {
    if (!this.state.active || this.failed) {
      return {};
    }
    
    // Calculate temperature effect proportional to intensity
    const intensity = this.state.intensity ?? 0;
    const temperatureDelta = this.temperatureEffect * (intensity / 100);
    
    return {
      temperatureDelta // °C/hour, proportional to intensity
    };
  }

  /**
   * Check if actuator should fail based on configured probability
   * Requirement 6.5: Failure simulation
   * 
   * @returns true if failure occurs
   */
  private checkFailure(): boolean {
    if (this.failureProbability === 0.0) {
      return false;
    }
    
    return Math.random() < this.failureProbability;
  }

  /**
   * Reset the actuator from failed state (for testing/maintenance simulation)
   */
  reset(): void {
    this.failed = false;
    this.state = {
      active: false,
      intensity: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Get temperature effect at 100% intensity
   */
  getTemperatureEffect(): number {
    return this.temperatureEffect;
  }

  /**
   * Get current intensity
   */
  getIntensity(): number {
    return this.state.intensity ?? 0;
  }
}
