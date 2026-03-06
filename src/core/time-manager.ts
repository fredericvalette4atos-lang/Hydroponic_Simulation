/**
 * TimeManager - Manages time acceleration for the simulation
 * 
 * This class handles time acceleration, allowing tests to run faster than real-time.
 * It tracks both real elapsed time and simulated time separately, supporting
 * acceleration factors from 1x (real-time) to 1000x (very fast simulation).
 * 
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

import { TimeState } from '../types';

export class TimeManager {
  private realTimeStart: number;
  private simulatedTimeStart: number;
  private pausedAt: number | null;
  private pausedSimulatedTime: number;
  private acceleration: number;
  private isPaused: boolean;

  /**
   * Create a new TimeManager
   * @param initialAcceleration - Initial time acceleration factor (1x-1000x)
   */
  constructor(initialAcceleration: number = 1) {
    this.validateAcceleration(initialAcceleration);
    
    this.realTimeStart = Date.now();
    this.simulatedTimeStart = 0;
    this.pausedAt = null;
    this.pausedSimulatedTime = 0;
    this.acceleration = initialAcceleration;
    this.isPaused = false;
  }

  /**
   * Get the current simulated time in seconds
   * @returns Simulated time in seconds since simulation start
   */
  getSimulatedTime(): number {
    if (this.isPaused) {
      return this.pausedSimulatedTime;
    }

    const realElapsed = (Date.now() - this.realTimeStart) / 1000; // Convert to seconds
    return this.simulatedTimeStart + (realElapsed * this.acceleration);
  }

  /**
   * Get the current real time in seconds
   * @returns Real time in seconds since simulation start
   */
  getRealTime(): number {
    if (this.isPaused && this.pausedAt !== null) {
      return (this.pausedAt - this.realTimeStart) / 1000;
    }
    
    return (Date.now() - this.realTimeStart) / 1000;
  }

  /**
   * Set the time acceleration factor with immediate effect
   * @param factor - Time acceleration factor (1x-1000x)
   * @throws Error if factor is outside valid range
   */
  setTimeAcceleration(factor: number): void {
    this.validateAcceleration(factor);

    // Capture current simulated time before changing acceleration
    const currentSimulatedTime = this.getSimulatedTime();
    
    // Reset the time tracking with new acceleration
    this.realTimeStart = Date.now();
    this.simulatedTimeStart = currentSimulatedTime;
    this.acceleration = factor;
  }

  /**
   * Pause the simulation time
   */
  pause(): void {
    if (this.isPaused) {
      return; // Already paused
    }

    this.pausedAt = Date.now();
    this.pausedSimulatedTime = this.getSimulatedTime();
    this.isPaused = true;
  }

  /**
   * Resume the simulation time
   */
  resume(): void {
    if (!this.isPaused) {
      return; // Not paused
    }

    // Reset time tracking to continue from where we paused
    this.realTimeStart = Date.now();
    this.simulatedTimeStart = this.pausedSimulatedTime;
    this.pausedAt = null;
    this.isPaused = false;
  }

  /**
   * Check if simulation is currently paused
   * @returns true if paused, false otherwise
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Get the current acceleration factor
   * @returns Current time acceleration factor
   */
  getAcceleration(): number {
    return this.acceleration;
  }

  /**
   * Get complete time state
   * @returns TimeState object with all time tracking information
   */
  getTimeState(): TimeState {
    return {
      realTimeStart: this.realTimeStart,
      simulatedTimeStart: this.simulatedTimeStart,
      currentRealTime: this.getRealTime(),
      currentSimulatedTime: this.getSimulatedTime(),
      acceleration: this.acceleration,
      paused: this.isPaused
    };
  }

  /**
   * Reset the time manager to initial state
   * @param acceleration - Optional new acceleration factor
   */
  reset(acceleration?: number): void {
    if (acceleration !== undefined) {
      this.validateAcceleration(acceleration);
      this.acceleration = acceleration;
    }

    this.realTimeStart = Date.now();
    this.simulatedTimeStart = 0;
    this.pausedAt = null;
    this.pausedSimulatedTime = 0;
    this.isPaused = false;
  }

  /**
   * Validate acceleration factor is within acceptable range
   * @param factor - Acceleration factor to validate
   * @throws Error if factor is outside valid range (1-1000)
   */
  private validateAcceleration(factor: number): void {
    if (factor < 1 || factor > 1000) {
      throw new Error(
        `Time acceleration factor must be between 1 and 1000, got ${factor}`
      );
    }
  }
}
