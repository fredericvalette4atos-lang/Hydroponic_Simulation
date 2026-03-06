/**
 * Property-Based Tests for Time Management
 * 
 * Tests universal properties of time management including time acceleration range,
 * proportionality, relative timing preservation, responsiveness, and dual time reporting.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import * as fc from 'fast-check';
import { TimeManager } from '../../src/core/time-manager';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid time acceleration factors (1x-1000x)
 */
const arbAccelerationFactor = fc.float({ 
  min: 1.0, 
  max: Math.fround(1000.0), 
  noNaN: true 
});

/**
 * Generate valid time deltas in milliseconds
 */
const arbTimeDeltaMs = fc.integer({ min: 10, max: 1000 });

/**
 * Generate valid time deltas in seconds
 */
const arbTimeDeltaSec = fc.float({ 
  min: Math.fround(0.01), 
  max: Math.fround(10.0), 
  noNaN: true 
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wait for a specified duration in milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Busy wait for a specified duration (more accurate for short durations)
 */
function busyWait(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait
  }
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Time Management Property Tests', () => {

  /**
   * Property 44: Time Acceleration Range
   * 
   * **Validates: Requirements 14.1**
   * 
   * For any time acceleration factor between 1x and 1000x, the simulator shall 
   * accept the configuration and apply the acceleration to all time-dependent behaviors.
   */
  describe('Property 44: Time acceleration range', () => {
    it('should accept acceleration factors from 1x to 1000x', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          (acceleration) => {
            // Should not throw for valid acceleration
            expect(() => {
              const timeManager = new TimeManager(acceleration);
            }).not.toThrow();
            
            // Should be able to set acceleration
            const timeManager = new TimeManager(1);
            expect(() => {
              timeManager.setTimeAcceleration(acceleration);
            }).not.toThrow();
            
            // Should maintain the acceleration value
            expect(timeManager.getAcceleration()).toBeCloseTo(acceleration, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject acceleration factors below 1x', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100.0), max: Math.fround(0.99), noNaN: true }),
          (acceleration) => {
            // Should throw for invalid acceleration
            expect(() => {
              const timeManager = new TimeManager(acceleration);
            }).toThrow(/between 1 and 1000/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject acceleration factors above 1000x', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1000.01), max: Math.fround(10000.0), noNaN: true }),
          (acceleration) => {
            // Should throw for invalid acceleration
            expect(() => {
              const timeManager = new TimeManager(acceleration);
            }).toThrow(/between 1 and 1000/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 45: Time Acceleration Proportionality
   * 
   * **Validates: Requirements 14.2**
   * 
   * For any time-dependent behavior (drift, evaporation, uptake, etc.) and any 
   * time acceleration factor, the behavior rate in simulated time shall equal 
   * the base rate multiplied by the acceleration factor.
   */
  describe('Property 45: Time acceleration proportionality', () => {
    it('simulated time should advance proportionally to acceleration factor', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 500), // Moderate duration
          (acceleration, waitTimeMs) => {
            const timeManager = new TimeManager(acceleration);
            
            // Record start times
            const realStart = timeManager.getRealTime();
            const simStart = timeManager.getSimulatedTime();
            
            // Wait for specified duration
            busyWait(waitTimeMs);
            
            // Record end times
            const realEnd = timeManager.getRealTime();
            const simEnd = timeManager.getSimulatedTime();
            
            // Calculate elapsed times
            const realElapsed = realEnd - realStart;
            const simElapsed = simEnd - simStart;
            
            // Simulated time should be approximately real time * acceleration
            const expectedSimElapsed = realElapsed * acceleration;
            
            // Allow 10% tolerance for timing variations
            expect(simElapsed).toBeGreaterThanOrEqual(expectedSimElapsed * 0.9);
            expect(simElapsed).toBeLessThanOrEqual(expectedSimElapsed * 1.1);
          }
        ),
        { numRuns: 50 } // Fewer runs due to timing operations
      );
    });

    it('ratio of simulated to real time should equal acceleration factor', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 500),
          (acceleration, waitTimeMs) => {
            const timeManager = new TimeManager(acceleration);
            
            // Wait for specified duration
            busyWait(waitTimeMs);
            
            // Get elapsed times
            const realElapsed = timeManager.getRealTime();
            const simElapsed = timeManager.getSimulatedTime();
            
            // Calculate ratio
            const ratio = simElapsed / realElapsed;
            
            // Ratio should be close to acceleration factor (within 10% tolerance)
            expect(ratio).toBeGreaterThanOrEqual(acceleration * 0.9);
            expect(ratio).toBeLessThanOrEqual(acceleration * 1.1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 46: Relative Timing Preservation
   * 
   * **Validates: Requirements 14.3**
   * 
   * For any two time-dependent events A and B with relative timing T, under any 
   * time acceleration factor, the relative timing between A and B shall remain T 
   * in simulated time.
   */
  describe('Property 46: Relative timing preservation', () => {
    it('relative timing between events should be preserved in simulated time', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          fc.integer({ min: 50, max: 200 }), // Time to event A
          fc.integer({ min: 50, max: 200 }), // Time between A and B
          (acceleration, timeToA, timeBetweenAB) => {
            const timeManager = new TimeManager(acceleration);
            
            // Wait until event A
            busyWait(timeToA);
            const eventASimTime = timeManager.getSimulatedTime();
            
            // Wait until event B
            busyWait(timeBetweenAB);
            const eventBSimTime = timeManager.getSimulatedTime();
            
            // Calculate relative timing in simulated time
            const relativeSimTime = eventBSimTime - eventASimTime;
            
            // Calculate expected relative timing
            const expectedRelativeTime = (timeBetweenAB / 1000) * acceleration;
            
            // Relative timing should be preserved (within 10% tolerance)
            expect(relativeSimTime).toBeGreaterThanOrEqual(expectedRelativeTime * 0.9);
            expect(relativeSimTime).toBeLessThanOrEqual(expectedRelativeTime * 1.1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('relative timing should be independent of acceleration factor', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1.0, max: Math.fround(100.0), noNaN: true }), // First acceleration
          fc.float({ min: 1.0, max: Math.fround(100.0), noNaN: true }), // Second acceleration
          fc.integer({ min: 50, max: 200 }), // Time between events
          (accel1, accel2, timeBetween) => {
            // Test with first acceleration
            const tm1 = new TimeManager(accel1);
            busyWait(timeBetween);
            const simElapsed1 = tm1.getSimulatedTime();
            
            // Test with second acceleration
            const tm2 = new TimeManager(accel2);
            busyWait(timeBetween);
            const simElapsed2 = tm2.getSimulatedTime();
            
            // Calculate ratios (should match acceleration ratios)
            const ratio = simElapsed1 / simElapsed2;
            const expectedRatio = accel1 / accel2;
            
            // Ratio should be close to expected (within 15% tolerance)
            expect(ratio).toBeGreaterThanOrEqual(expectedRatio * 0.85);
            expect(ratio).toBeLessThanOrEqual(expectedRatio * 1.15);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 47: Time Acceleration Responsiveness
   * 
   * **Validates: Requirements 14.4**
   * 
   * For any change to the time acceleration factor, all ongoing time-dependent 
   * processes shall adjust to the new rate within one simulation tick.
   */
  describe('Property 47: Time acceleration responsiveness', () => {
    it('should apply new acceleration factor immediately', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 100 && ms <= 300), // Longer wait for measurable effect
          (initialAccel, newAccel, waitTimeMs) => {
            const timeManager = new TimeManager(initialAccel);
            
            // Wait with initial acceleration
            busyWait(waitTimeMs);
            
            // Change acceleration
            const simTimeBeforeChange = timeManager.getSimulatedTime();
            const realTimeBeforeChange = timeManager.getRealTime();
            
            timeManager.setTimeAcceleration(newAccel);
            
            // Verify acceleration changed immediately
            expect(timeManager.getAcceleration()).toBeCloseTo(newAccel, 2);
            
            // Wait with new acceleration
            busyWait(waitTimeMs);
            
            // Calculate elapsed times after change
            const simTimeAfterChange = timeManager.getSimulatedTime();
            const realTimeAfterChange = timeManager.getRealTime();
            
            const realElapsed = realTimeAfterChange - realTimeBeforeChange;
            const simElapsed = simTimeAfterChange - simTimeBeforeChange;
            
            // Skip test if real elapsed time is too small (timing precision issue)
            if (realElapsed < 0.01) {
              return true; // Skip this test case
            }
            
            // Simulated elapsed should match new acceleration (within 15% tolerance)
            const expectedSimElapsed = realElapsed * newAccel;
            expect(simElapsed).toBeGreaterThanOrEqual(expectedSimElapsed * 0.85);
            expect(simElapsed).toBeLessThanOrEqual(expectedSimElapsed * 1.15);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve simulated time when changing acceleration', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          (initialAccel, newAccel, waitTimeMs) => {
            const timeManager = new TimeManager(initialAccel);
            
            // Wait to accumulate some simulated time
            busyWait(waitTimeMs);
            
            // Record simulated time before change
            const simTimeBeforeChange = timeManager.getSimulatedTime();
            
            // Change acceleration
            timeManager.setTimeAcceleration(newAccel);
            
            // Simulated time should be preserved (not reset)
            const simTimeAfterChange = timeManager.getSimulatedTime();
            
            // Should be very close (within 1ms tolerance for immediate read)
            expect(Math.abs(simTimeAfterChange - simTimeBeforeChange)).toBeLessThan(0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 48: Dual Time Reporting
   * 
   * **Validates: Requirements 14.5**
   * 
   * For any log entry or API response, both real time and simulated time shall 
   * be included, and simulated time shall advance according to the acceleration 
   * factor while real time advances normally.
   */
  describe('Property 48: Dual time reporting', () => {
    it('should report both real and simulated time separately', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 500),
          (acceleration, waitTimeMs) => {
            const timeManager = new TimeManager(acceleration);
            
            // Wait for specified duration
            busyWait(waitTimeMs);
            
            // Get both time values
            const realTime = timeManager.getRealTime();
            const simTime = timeManager.getSimulatedTime();
            
            // Both should be positive
            expect(realTime).toBeGreaterThan(0);
            expect(simTime).toBeGreaterThan(0);
            
            // Simulated time should be greater than real time for acceleration > 1
            if (acceleration > 1.0) {
              expect(simTime).toBeGreaterThan(realTime);
            }
            
            // For acceleration = 1, they should be approximately equal
            if (Math.abs(acceleration - 1.0) < 0.01) {
              expect(Math.abs(simTime - realTime)).toBeLessThan(0.01);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide complete time state information', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          (acceleration, waitTimeMs) => {
            const timeManager = new TimeManager(acceleration);
            
            // Wait for specified duration
            busyWait(waitTimeMs);
            
            // Get time state
            const timeState = timeManager.getTimeState();
            
            // Should have all required fields
            expect(timeState).toHaveProperty('realTimeStart');
            expect(timeState).toHaveProperty('simulatedTimeStart');
            expect(timeState).toHaveProperty('currentRealTime');
            expect(timeState).toHaveProperty('currentSimulatedTime');
            expect(timeState).toHaveProperty('acceleration');
            expect(timeState).toHaveProperty('paused');
            
            // Acceleration should match
            expect(timeState.acceleration).toBeCloseTo(acceleration, 2);
            
            // Current times should be positive
            expect(timeState.currentRealTime).toBeGreaterThan(0);
            expect(timeState.currentSimulatedTime).toBeGreaterThan(0);
            
            // Should not be paused initially
            expect(timeState.paused).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('real time should advance at normal rate regardless of acceleration', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 100 && ms <= 300),
          (acceleration, waitTimeMs) => {
            const timeManager = new TimeManager(acceleration);
            
            // Record start time
            const realStart = Date.now();
            
            // Wait for specified duration
            busyWait(waitTimeMs);
            
            // Record end time
            const realEnd = Date.now();
            const actualRealElapsed = (realEnd - realStart) / 1000; // Convert to seconds
            
            // Get reported real time
            const reportedRealTime = timeManager.getRealTime();
            
            // Reported real time should match actual elapsed time (within 10% tolerance)
            expect(reportedRealTime).toBeGreaterThanOrEqual(actualRealElapsed * 0.9);
            expect(reportedRealTime).toBeLessThanOrEqual(actualRealElapsed * 1.1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional Property: Pause/Resume Behavior
   * 
   * Tests that pause and resume work correctly with time management.
   */
  describe('Additional: Pause/Resume behavior', () => {
    it('simulated time should not advance when paused', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          (acceleration, waitBeforePause, waitDuringPause) => {
            const timeManager = new TimeManager(acceleration);
            
            // Wait before pausing
            busyWait(waitBeforePause);
            
            // Pause
            timeManager.pause();
            const simTimeAtPause = timeManager.getSimulatedTime();
            
            // Wait while paused
            busyWait(waitDuringPause);
            
            // Simulated time should not have advanced
            const simTimeAfterWait = timeManager.getSimulatedTime();
            expect(simTimeAfterWait).toBeCloseTo(simTimeAtPause, 6);
            
            // Should report as paused
            expect(timeManager.isPausedState()).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('simulated time should resume advancing after resume', () => {
      fc.assert(
        fc.property(
          arbAccelerationFactor,
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          arbTimeDeltaMs.filter(ms => ms >= 50 && ms <= 200),
          (acceleration, waitBeforePause, waitDuringPause, waitAfterResume) => {
            const timeManager = new TimeManager(acceleration);
            
            // Wait, pause, wait, resume
            busyWait(waitBeforePause);
            timeManager.pause();
            const simTimeAtPause = timeManager.getSimulatedTime();
            busyWait(waitDuringPause);
            timeManager.resume();
            
            // Should not be paused
            expect(timeManager.isPausedState()).toBe(false);
            
            // Wait after resume
            busyWait(waitAfterResume);
            
            // Simulated time should have advanced from pause point
            const simTimeAfterResume = timeManager.getSimulatedTime();
            expect(simTimeAfterResume).toBeGreaterThan(simTimeAtPause);
            
            // The advancement should be proportional to acceleration
            const simElapsed = simTimeAfterResume - simTimeAtPause;
            const expectedElapsed = (waitAfterResume / 1000) * acceleration;
            
            // Within 15% tolerance
            expect(simElapsed).toBeGreaterThanOrEqual(expectedElapsed * 0.85);
            expect(simElapsed).toBeLessThanOrEqual(expectedElapsed * 1.15);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
