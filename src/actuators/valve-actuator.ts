/**
 * ValveActuator implementation
 * 
 * Simulates valve actuators for irrigation and drainage control.
 * Supports open/closed states with configurable flow rates for different valve types.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Actuator, ActuatorType, ActuatorState, PhysicsEffect } from '../types';

/**
 * Types of valves for different purposes
 */
export enum ValveType {
  INLET = 'inlet',      // Water inlet valve (positive flow)
  OUTLET = 'outlet',    // Drainage valve (negative flow)
  IRRIGATION = 'irrigation' // Irrigation valve (negative flow)
}

/**
 * Configuration options for ValveActuator
 */
export interface ValveActuatorConfig {
  id: string;
  valveType: ValveType;
  flowRate: number; // liters/hour (positive for inlet, negative for outlet/irrigation)
  failureProbability?: number; // 0.0-1.0, default 0.0
}

/**
 * ValveActuator class implementing the Actuator interface
 * 
 * Supports three valve types:
 * - INLET: Adds water to the system when open
 * - OUTLET: Drains water from the system when open
 * - IRRIGATION: Removes water for irrigation when open
 */
export class ValveActuator implements Actuator {
  public readonly id: string;
  public readonly type: ActuatorType = ActuatorType.VALVE;
  
  private valveType: ValveType;
  private flowRate: number;
  private failureProbability: number;
  private state: ActuatorState;
  private totalRuntime: number; // seconds
  private failed: boolean;
  private lastStateChangeTime: number;

  constructor(config: ValveActuatorConfig) {
    this.id = config.id;
    this.valveType = config.valveType;
    this.flowRate = config.flowRate;
    this.failureProbability = config.failureProbability ?? 0.0;
    
    // Initialize state as inactive (closed)
    this.state = {
      active: false,
      timestamp: Date.now()
    };
    
    this.totalRuntime = 0;
    this.failed = false;
    this.lastStateChangeTime = Date.now();
  }

  /**
   * Set the actuator state (open/closed)
   * Response time: <100ms (requirement 7.1)
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
   * Requirement 7.2: State persistence
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
   * Requirement 7.4: Maintenance tracking
   */
  getTotalRuntime(): number {
    let runtime = this.totalRuntime;
    
    // Add current runtime if actuator is active (valve is open)
    if (this.state.active) {
      runtime += (Date.now() - this.lastStateChangeTime) / 1000;
    }
    
    return runtime;
  }

  /**
   * Get the physics effect based on valve type and state
   * Requirement 7.3: Valve effects on water level
   * Requirement 7.4: Configurable flow rates
   * 
   * Effects per hour of operation when valve is open:
   * - INLET: Adds water to the system (positive flow)
   * - OUTLET: Drains water from the system (negative flow)
   * - IRRIGATION: Removes water for irrigation (negative flow)
   */
  getPhysicsEffect(): PhysicsEffect {
    if (!this.state.active || this.failed) {
      return {};
    }
    
    // Calculate water delta based on valve type
    let waterDelta: number;
    
    switch (this.valveType) {
      case ValveType.INLET:
        waterDelta = this.flowRate; // Positive flow (adds water)
        break;
      
      case ValveType.OUTLET:
      case ValveType.IRRIGATION:
        waterDelta = -this.flowRate; // Negative flow (removes water)
        break;
      
      default:
        waterDelta = 0;
    }
    
    return {
      waterDelta // liters/hour
    };
  }

  /**
   * Check if actuator should fail based on configured probability
   * Requirement 7.5: Failure simulation
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
   * Get valve type
   */
  getValveType(): ValveType {
    return this.valveType;
  }

  /**
   * Get flow rate
   */
  getFlowRate(): number {
    return this.flowRate;
  }
}
