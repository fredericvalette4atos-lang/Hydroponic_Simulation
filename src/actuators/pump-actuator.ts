/**
 * PumpActuator implementation
 * 
 * Simulates pump actuators for water, nutrients, and pH adjustment.
 * Supports different pump types with configurable flow rates and failure simulation.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Actuator, ActuatorType, ActuatorState, PhysicsEffect, PumpType } from '../types';

/**
 * Configuration options for PumpActuator
 */
export interface PumpActuatorConfig {
  id: string;
  pumpType: PumpType;
  flowRate: number; // liters/hour or pH units/hour depending on pump type
  failureProbability?: number; // 0.0-1.0, default 0.0
}

/**
 * PumpActuator class implementing the Actuator interface
 * 
 * Supports four pump types:
 * - WATER: Adds water to the system
 * - NUTRIENT: Adds nutrient solution (water + nutrients)
 * - PH_UP: Increases pH
 * - PH_DOWN: Decreases pH
 */
export class PumpActuator implements Actuator {
  public readonly id: string;
  public readonly type: ActuatorType = ActuatorType.PUMP;
  
  private pumpType: PumpType;
  private flowRate: number;
  private failureProbability: number;
  private state: ActuatorState;
  private totalRuntime: number; // seconds
  private failed: boolean;
  private lastStateChangeTime: number;

  constructor(config: PumpActuatorConfig) {
    this.id = config.id;
    this.pumpType = config.pumpType;
    this.flowRate = config.flowRate;
    this.failureProbability = config.failureProbability ?? 0.0;
    
    // Initialize state as inactive
    this.state = {
      active: false,
      timestamp: Date.now()
    };
    
    this.totalRuntime = 0;
    this.failed = false;
    this.lastStateChangeTime = Date.now();
  }

  /**
   * Set the actuator state
   * Response time: <100ms (requirement 5.1)
   * 
   * @throws Error if actuator has failed
   */
  setState(state: ActuatorState): void {
    const startTime = Date.now();
    
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
    
    // Update state
    this.state = {
      ...state,
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
   * Requirement 5.2: State persistence
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
   * Requirement 5.4: Maintenance tracking
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
   * Get the physics effect based on pump type
   * Requirement 5.3: Pump effects on system
   * 
   * Effects per hour of operation:
   * - WATER: Adds water volume
   * - NUTRIENT: Adds water and nutrients
   * - PH_UP: Increases pH
   * - PH_DOWN: Decreases pH
   */
  getPhysicsEffect(): PhysicsEffect {
    if (!this.state.active || this.failed) {
      return {};
    }
    
    switch (this.pumpType) {
      case PumpType.WATER:
        return {
          waterDelta: this.flowRate // liters/hour
        };
      
      case PumpType.NUTRIENT:
        return {
          waterDelta: this.flowRate, // liters/hour
          nutrientDelta: this.flowRate // adds nutrients proportional to flow
        };
      
      case PumpType.PH_UP:
        return {
          phDelta: this.flowRate // pH units/hour
        };
      
      case PumpType.PH_DOWN:
        return {
          phDelta: -this.flowRate // pH units/hour (negative)
        };
      
      default:
        return {};
    }
  }

  /**
   * Check if actuator should fail based on configured probability
   * Requirement 5.5: Failure simulation
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
      timestamp: Date.now()
    };
  }

  /**
   * Get pump type
   */
  getPumpType(): PumpType {
    return this.pumpType;
  }

  /**
   * Get flow rate
   */
  getFlowRate(): number {
    return this.flowRate;
  }
}
