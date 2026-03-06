/**
 * Unit tests for TimeManager class
 * 
 * Tests time acceleration, pause/resume functionality, and time tracking.
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

import { TimeManager } from '../../../src/core/time-manager';

describe('TimeManager', () => {
  describe('Initialization', () => {
    test('initializes with default 1x acceleration', () => {
      const tm = new TimeManager();
      expect(tm.getAcceleration()).toBe(1);
      expect(tm.isPausedState()).toBe(false);
    });

    test('initializes with custom acceleration factor', () => {
      const tm = new TimeManager(10);
      expect(tm.getAcceleration()).toBe(10);
    });

    test('rejects acceleration factor below 1', () => {
      expect(() => new TimeManager(0.5)).toThrow(
        'Time acceleration factor must be between 1 and 1000'
      );
    });

    test('rejects acceleration factor above 1000', () => {
      expect(() => new TimeManager(1001)).toThrow(
        'Time acceleration factor must be between 1 and 1000'
      );
    });

    test('accepts acceleration factor at lower boundary (1)', () => {
      expect(() => new TimeManager(1)).not.toThrow();
    });

    test('accepts acceleration factor at upper boundary (1000)', () => {
      expect(() => new TimeManager(1000)).not.toThrow();
    });
  });

  describe('Time Tracking', () => {
    test('getSimulatedTime starts at zero', () => {
      const tm = new TimeManager();
      const simTime = tm.getSimulatedTime();
      expect(simTime).toBeCloseTo(0, 1);
    });

    test('getRealTime starts at zero', () => {
      const tm = new TimeManager();
      const realTime = tm.getRealTime();
      expect(realTime).toBeCloseTo(0, 1);
    });

    test('simulated time advances with 1x acceleration', async () => {
      const tm = new TimeManager(1);
      await sleep(100); // Wait 100ms
      const simTime = tm.getSimulatedTime();
      expect(simTime).toBeGreaterThan(0.05); // At least 50ms
      expect(simTime).toBeLessThan(0.2); // Less than 200ms
    });

    test('simulated time advances faster with 10x acceleration', async () => {
      const tm = new TimeManager(10);
      await sleep(100); // Wait 100ms
      const simTime = tm.getSimulatedTime();
      expect(simTime).toBeGreaterThan(0.5); // At least 500ms simulated
      expect(simTime).toBeLessThan(2.0); // Less than 2s simulated
    });

    test('simulated time advances much faster with 100x acceleration', async () => {
      const tm = new TimeManager(100);
      await sleep(100); // Wait 100ms
      const simTime = tm.getSimulatedTime();
      expect(simTime).toBeGreaterThan(5); // At least 5s simulated
      expect(simTime).toBeLessThan(20); // Less than 20s simulated
    });

    test('real time advances independently of acceleration', async () => {
      const tm1 = new TimeManager(1);
      const tm10 = new TimeManager(10);
      
      await sleep(100);
      
      const realTime1 = tm1.getRealTime();
      const realTime10 = tm10.getRealTime();
      
      // Real time should be similar regardless of acceleration
      expect(Math.abs(realTime1 - realTime10)).toBeLessThan(0.05);
    });

    test('tracks both real and simulated time separately', async () => {
      const tm = new TimeManager(10);
      await sleep(100);
      
      const realTime = tm.getRealTime();
      const simTime = tm.getSimulatedTime();
      
      expect(simTime).toBeGreaterThan(realTime * 5); // Simulated should be much larger
    });
  });

  describe('Time Acceleration Changes', () => {
    test('setTimeAcceleration changes acceleration factor immediately', () => {
      const tm = new TimeManager(1);
      tm.setTimeAcceleration(10);
      expect(tm.getAcceleration()).toBe(10);
    });

    test('setTimeAcceleration preserves simulated time', async () => {
      const tm = new TimeManager(10);
      await sleep(100);
      
      const simTimeBefore = tm.getSimulatedTime();
      tm.setTimeAcceleration(1);
      const simTimeAfter = tm.getSimulatedTime();
      
      // Simulated time should be preserved (within small margin)
      expect(Math.abs(simTimeAfter - simTimeBefore)).toBeLessThan(0.1);
    });

    test('setTimeAcceleration affects future time progression', async () => {
      const tm = new TimeManager(1);
      await sleep(50);
      
      tm.setTimeAcceleration(100);
      const simTimeAtChange = tm.getSimulatedTime();
      
      await sleep(50);
      const simTimeAfter = tm.getSimulatedTime();
      
      const delta = simTimeAfter - simTimeAtChange;
      expect(delta).toBeGreaterThan(2); // Should advance quickly with 100x
    });

    test('setTimeAcceleration rejects invalid factors', () => {
      const tm = new TimeManager(10);
      expect(() => tm.setTimeAcceleration(0)).toThrow();
      expect(() => tm.setTimeAcceleration(1001)).toThrow();
      expect(() => tm.setTimeAcceleration(-5)).toThrow();
    });

    test('setTimeAcceleration accepts boundary values', () => {
      const tm = new TimeManager(10);
      expect(() => tm.setTimeAcceleration(1)).not.toThrow();
      expect(() => tm.setTimeAcceleration(1000)).not.toThrow();
    });
  });

  describe('Pause and Resume', () => {
    test('pause stops simulated time progression', async () => {
      const tm = new TimeManager(10);
      await sleep(50);
      
      tm.pause();
      const simTimeAtPause = tm.getSimulatedTime();
      
      await sleep(100);
      const simTimeAfterPause = tm.getSimulatedTime();
      
      expect(simTimeAfterPause).toBeCloseTo(simTimeAtPause, 2);
    });

    test('pause stops real time progression', async () => {
      const tm = new TimeManager(10);
      await sleep(50);
      
      tm.pause();
      const realTimeAtPause = tm.getRealTime();
      
      await sleep(100);
      const realTimeAfterPause = tm.getRealTime();
      
      expect(realTimeAfterPause).toBeCloseTo(realTimeAtPause, 2);
    });

    test('isPausedState returns true when paused', () => {
      const tm = new TimeManager();
      expect(tm.isPausedState()).toBe(false);
      
      tm.pause();
      expect(tm.isPausedState()).toBe(true);
    });

    test('resume continues time progression', async () => {
      const tm = new TimeManager(10);
      await sleep(50);
      
      tm.pause();
      const simTimeAtPause = tm.getSimulatedTime();
      
      await sleep(50);
      tm.resume();
      
      await sleep(50);
      const simTimeAfterResume = tm.getSimulatedTime();
      
      expect(simTimeAfterResume).toBeGreaterThan(simTimeAtPause);
    });

    test('isPausedState returns false after resume', () => {
      const tm = new TimeManager();
      tm.pause();
      expect(tm.isPausedState()).toBe(true);
      
      tm.resume();
      expect(tm.isPausedState()).toBe(false);
    });

    test('multiple pause calls are idempotent', async () => {
      const tm = new TimeManager(10);
      await sleep(50);
      
      tm.pause();
      const simTime1 = tm.getSimulatedTime();
      
      tm.pause();
      tm.pause();
      const simTime2 = tm.getSimulatedTime();
      
      expect(simTime2).toBeCloseTo(simTime1, 2);
    });

    test('multiple resume calls are idempotent', async () => {
      const tm = new TimeManager(10);
      tm.pause();
      tm.resume();
      
      const simTime1 = tm.getSimulatedTime();
      tm.resume();
      tm.resume();
      
      await sleep(50);
      const simTime2 = tm.getSimulatedTime();
      
      expect(simTime2).toBeGreaterThan(simTime1);
    });

    test('pause-resume cycle preserves simulated time', async () => {
      const tm = new TimeManager(10);
      await sleep(50);
      
      const simTimeBefore = tm.getSimulatedTime();
      
      tm.pause();
      await sleep(100);
      tm.resume();
      
      const simTimeAfter = tm.getSimulatedTime();
      
      expect(Math.abs(simTimeAfter - simTimeBefore)).toBeLessThan(0.1);
    });
  });

  describe('Time State', () => {
    test('getTimeState returns complete time information', () => {
      const tm = new TimeManager(10);
      const state = tm.getTimeState();
      
      expect(state).toHaveProperty('realTimeStart');
      expect(state).toHaveProperty('simulatedTimeStart');
      expect(state).toHaveProperty('currentRealTime');
      expect(state).toHaveProperty('currentSimulatedTime');
      expect(state).toHaveProperty('acceleration');
      expect(state).toHaveProperty('paused');
      
      expect(state.acceleration).toBe(10);
      expect(state.paused).toBe(false);
    });

    test('getTimeState reflects paused state', () => {
      const tm = new TimeManager(5);
      tm.pause();
      
      const state = tm.getTimeState();
      expect(state.paused).toBe(true);
    });

    test('getTimeState shows current acceleration', () => {
      const tm = new TimeManager(1);
      tm.setTimeAcceleration(50);
      
      const state = tm.getTimeState();
      expect(state.acceleration).toBe(50);
    });
  });

  describe('Reset', () => {
    test('reset returns time to zero', async () => {
      const tm = new TimeManager(10);
      await sleep(100);
      
      tm.reset();
      
      const simTime = tm.getSimulatedTime();
      const realTime = tm.getRealTime();
      
      expect(simTime).toBeCloseTo(0, 1);
      expect(realTime).toBeCloseTo(0, 1);
    });

    test('reset preserves acceleration if not specified', () => {
      const tm = new TimeManager(10);
      tm.reset();
      
      expect(tm.getAcceleration()).toBe(10);
    });

    test('reset changes acceleration if specified', () => {
      const tm = new TimeManager(10);
      tm.reset(50);
      
      expect(tm.getAcceleration()).toBe(50);
    });

    test('reset clears paused state', () => {
      const tm = new TimeManager(10);
      tm.pause();
      
      tm.reset();
      
      expect(tm.isPausedState()).toBe(false);
    });

    test('reset validates new acceleration factor', () => {
      const tm = new TimeManager(10);
      expect(() => tm.reset(0)).toThrow();
      expect(() => tm.reset(1001)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles very high acceleration (1000x)', async () => {
      const tm = new TimeManager(1000);
      await sleep(10); // Just 10ms
      
      const simTime = tm.getSimulatedTime();
      expect(simTime).toBeGreaterThan(5); // Should be at least 5 seconds simulated
    });

    test('handles rapid acceleration changes', () => {
      const tm = new TimeManager(1);
      
      for (let i = 1; i <= 100; i += 10) {
        tm.setTimeAcceleration(i);
        expect(tm.getAcceleration()).toBe(i);
      }
    });

    test('handles rapid pause/resume cycles', () => {
      const tm = new TimeManager(10);
      
      for (let i = 0; i < 10; i++) {
        tm.pause();
        expect(tm.isPausedState()).toBe(true);
        tm.resume();
        expect(tm.isPausedState()).toBe(false);
      }
    });

    test('time values are always non-negative', async () => {
      const tm = new TimeManager(1);
      
      for (let i = 0; i < 10; i++) {
        await sleep(10);
        expect(tm.getSimulatedTime()).toBeGreaterThanOrEqual(0);
        expect(tm.getRealTime()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Specific Acceleration Factors', () => {
    test('1x acceleration: simulated time equals real time', async () => {
      const tm = new TimeManager(1);
      await sleep(100);
      
      const simTime = tm.getSimulatedTime();
      const realTime = tm.getRealTime();
      
      expect(Math.abs(simTime - realTime)).toBeLessThan(0.05);
    });

    test('10x acceleration: simulated time is 10x real time', async () => {
      const tm = new TimeManager(10);
      await sleep(100);
      
      const simTime = tm.getSimulatedTime();
      const realTime = tm.getRealTime();
      
      const ratio = simTime / realTime;
      expect(ratio).toBeGreaterThan(8);
      expect(ratio).toBeLessThan(12);
    });

    test('100x acceleration: simulated time is 100x real time', async () => {
      const tm = new TimeManager(100);
      await sleep(100);
      
      const simTime = tm.getSimulatedTime();
      const realTime = tm.getRealTime();
      
      const ratio = simTime / realTime;
      expect(ratio).toBeGreaterThan(80);
      expect(ratio).toBeLessThan(120);
    });

    test('1000x acceleration: simulated time is 1000x real time', async () => {
      const tm = new TimeManager(1000);
      await sleep(100);
      
      const simTime = tm.getSimulatedTime();
      const realTime = tm.getRealTime();
      
      const ratio = simTime / realTime;
      expect(ratio).toBeGreaterThan(800);
      expect(ratio).toBeLessThan(1200);
    });
  });

  describe('Maximum Time Acceleration Edge Cases', () => {
    test('maximum acceleration (1000x) maintains time consistency', async () => {
      const tm = new TimeManager(1000);
      await sleep(50);
      
      const simTime1 = tm.getSimulatedTime();
      await sleep(50);
      const simTime2 = tm.getSimulatedTime();
      
      // Time should always increase
      expect(simTime2).toBeGreaterThan(simTime1);
      
      // Difference should be significant (at least 25 seconds simulated)
      expect(simTime2 - simTime1).toBeGreaterThan(25);
    });

    test('maximum acceleration does not cause numeric overflow', async () => {
      const tm = new TimeManager(1000);
      
      // Simulate for a short time
      await sleep(100);
      const simTime = tm.getSimulatedTime();
      
      // Should be a valid number, not Infinity or NaN
      expect(Number.isFinite(simTime)).toBe(true);
      expect(simTime).toBeGreaterThan(0);
    });

    test('maximum acceleration with multiple time checks', async () => {
      const tm = new TimeManager(1000);
      const times: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        times.push(tm.getSimulatedTime());
        await sleep(20);
      }
      
      // All times should be monotonically increasing
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    test('maximum acceleration with pause/resume maintains consistency', async () => {
      const tm = new TimeManager(1000);
      await sleep(50);
      
      const timeBefore = tm.getSimulatedTime();
      tm.pause();
      
      await sleep(100);
      const timePaused = tm.getSimulatedTime();
      
      // Time should not change while paused
      expect(timePaused).toBeCloseTo(timeBefore, 1);
      
      tm.resume();
      await sleep(50);
      const timeAfterResume = tm.getSimulatedTime();
      
      // Time should resume advancing
      expect(timeAfterResume).toBeGreaterThan(timePaused);
    });

    test('maximum acceleration state is retrievable', () => {
      const tm = new TimeManager(1000);
      const state = tm.getTimeState();
      
      expect(state.acceleration).toBe(1000);
      expect(Number.isFinite(state.currentSimulatedTime)).toBe(true);
    });
  });

  describe('Minimum Time Acceleration Edge Cases', () => {
    test('minimum acceleration (1x) maintains real-time progression', async () => {
      const tm = new TimeManager(1);
      await sleep(100);
      
      const simTime = tm.getSimulatedTime();
      const realTime = tm.getRealTime();
      
      // At 1x, simulated and real time should be nearly equal
      expect(Math.abs(simTime - realTime)).toBeLessThan(0.05);
    });

    test('minimum acceleration with multiple measurements', async () => {
      const tm = new TimeManager(1);
      const measurements: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        measurements.push(tm.getSimulatedTime());
        await sleep(20);
      }
      
      // All measurements should be monotonically increasing
      for (let i = 1; i < measurements.length; i++) {
        expect(measurements[i]).toBeGreaterThanOrEqual(measurements[i - 1]);
      }
    });

    test('minimum acceleration with pause/resume', async () => {
      const tm = new TimeManager(1);
      await sleep(50);
      
      const timeBefore = tm.getSimulatedTime();
      tm.pause();
      
      await sleep(100);
      const timePaused = tm.getSimulatedTime();
      
      expect(timePaused).toBeCloseTo(timeBefore, 1);
      
      tm.resume();
      await sleep(50);
      const timeAfterResume = tm.getSimulatedTime();
      
      expect(timeAfterResume).toBeGreaterThan(timePaused);
    });

    test('minimum acceleration state is retrievable', () => {
      const tm = new TimeManager(1);
      const state = tm.getTimeState();
      
      expect(state.acceleration).toBe(1);
      expect(Number.isFinite(state.currentSimulatedTime)).toBe(true);
    });

    test('minimum acceleration with acceleration change', async () => {
      const tm = new TimeManager(1);
      await sleep(50);
      
      const timeAt1x = tm.getSimulatedTime();
      tm.setTimeAcceleration(10);
      
      await sleep(50);
      const timeAt10x = tm.getSimulatedTime();
      
      // Time should advance faster after acceleration change
      const delta = timeAt10x - timeAt1x;
      expect(delta).toBeGreaterThan(0.4); // At least 400ms simulated
    });
  });

  describe('Pause During Acceleration Change', () => {
    test('pause before acceleration change preserves time', async () => {
      const tm = new TimeManager(1);
      await sleep(50);
      
      tm.pause();
      const timePaused = tm.getSimulatedTime();
      
      tm.setTimeAcceleration(100);
      const timeAfterAccelChange = tm.getSimulatedTime();
      
      // Time should remain the same while paused
      expect(timeAfterAccelChange).toBeCloseTo(timePaused, 1);
    });

    test('pause after acceleration change preserves time', async () => {
      const tm = new TimeManager(1);
      await sleep(50);
      
      tm.setTimeAcceleration(100);
      await sleep(50);
      
      tm.pause();
      const timePaused = tm.getSimulatedTime();
      
      await sleep(100);
      const timeAfterWait = tm.getSimulatedTime();
      
      // Time should not advance while paused
      expect(timeAfterWait).toBeCloseTo(timePaused, 1);
    });

    test('pause during rapid acceleration changes', async () => {
      const tm = new TimeManager(1);
      await sleep(30);
      
      tm.setTimeAcceleration(10);
      await sleep(30);
      
      tm.pause();
      const timePaused = tm.getSimulatedTime();
      
      // Change acceleration while paused
      tm.setTimeAcceleration(100);
      const timeAfterChange = tm.getSimulatedTime();
      
      // Time should remain the same
      expect(timeAfterChange).toBeCloseTo(timePaused, 1);
      
      tm.resume();
      await sleep(30);
      const timeAfterResume = tm.getSimulatedTime();
      
      // Time should advance with new acceleration
      expect(timeAfterResume).toBeGreaterThan(timePaused);
    });

    test('pause state is maintained across acceleration changes', () => {
      const tm = new TimeManager(1);
      tm.pause();
      
      expect(tm.isPausedState()).toBe(true);
      
      tm.setTimeAcceleration(100);
      
      expect(tm.isPausedState()).toBe(true);
    });

    test('multiple acceleration changes while paused', () => {
      const tm = new TimeManager(1);
      tm.pause();
      
      const initialTime = tm.getSimulatedTime();
      
      for (let i = 10; i <= 100; i += 10) {
        tm.setTimeAcceleration(i);
        const currentTime = tm.getSimulatedTime();
        
        // Time should not change while paused
        expect(currentTime).toBeCloseTo(initialTime, 1);
      }
    });

    test('pause-resume-accelerate-pause sequence', async () => {
      const tm = new TimeManager(1);
      await sleep(30);
      
      tm.pause();
      const time1 = tm.getSimulatedTime();
      
      tm.resume();
      await sleep(30);
      
      tm.setTimeAcceleration(50);
      await sleep(30);
      
      tm.pause();
      const time2 = tm.getSimulatedTime();
      
      // Time should have advanced
      expect(time2).toBeGreaterThan(time1);
      
      // Pause should stop time
      await sleep(50);
      const time3 = tm.getSimulatedTime();
      
      expect(time3).toBeCloseTo(time2, 1);
    });
  });

  describe('Time Overflow Scenarios', () => {
    test('large simulated time values remain finite', async () => {
      const tm = new TimeManager(1000);
      
      // Simulate for a reasonable time
      await sleep(200);
      
      const simTime = tm.getSimulatedTime();
      
      // Should be a valid finite number
      expect(Number.isFinite(simTime)).toBe(true);
      expect(simTime).toBeGreaterThan(0);
      expect(simTime).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    test('time state with large values is valid', async () => {
      const tm = new TimeManager(1000);
      await sleep(100);
      
      const state = tm.getTimeState();
      
      expect(Number.isFinite(state.currentSimulatedTime)).toBe(true);
      expect(Number.isFinite(state.currentRealTime)).toBe(true);
      expect(state.currentSimulatedTime).toBeGreaterThan(0);
      expect(state.currentRealTime).toBeGreaterThan(0);
    });

    test('acceleration changes with large time values', async () => {
      const tm = new TimeManager(1000);
      await sleep(100);
      
      const timeBeforeChange = tm.getSimulatedTime();
      
      tm.setTimeAcceleration(1);
      const timeAfterChange = tm.getSimulatedTime();
      
      // Time should be preserved
      expect(Math.abs(timeAfterChange - timeBeforeChange)).toBeLessThan(0.1);
    });

    test('pause/resume with large time values', async () => {
      const tm = new TimeManager(1000);
      await sleep(100);
      
      const timeBefore = tm.getSimulatedTime();
      
      tm.pause();
      const timePaused = tm.getSimulatedTime();
      
      expect(timePaused).toBeCloseTo(timeBefore, 1);
      
      tm.resume();
      await sleep(50);
      
      const timeAfterResume = tm.getSimulatedTime();
      
      expect(timeAfterResume).toBeGreaterThan(timePaused);
    });

    test('reset with large time values', async () => {
      const tm = new TimeManager(1000);
      await sleep(100);
      
      const largeTime = tm.getSimulatedTime();
      expect(largeTime).toBeGreaterThan(0);
      
      tm.reset();
      
      const resetTime = tm.getSimulatedTime();
      expect(resetTime).toBeCloseTo(0, 1);
    });

    test('rapid time checks do not cause overflow', async () => {
      const tm = new TimeManager(1000);
      
      const times: number[] = [];
      for (let i = 0; i < 100; i++) {
        times.push(tm.getSimulatedTime());
      }
      
      // All times should be valid and finite
      for (const time of times) {
        expect(Number.isFinite(time)).toBe(true);
      }
      
      // Times should be monotonically increasing
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    test('time values remain consistent across multiple operations', async () => {
      const tm = new TimeManager(500);
      
      await sleep(50);
      const time1 = tm.getSimulatedTime();
      
      tm.setTimeAcceleration(100);
      await sleep(50);
      const time2 = tm.getSimulatedTime();
      
      tm.pause();
      const time3 = tm.getSimulatedTime();
      
      tm.resume();
      await sleep(50);
      const time4 = tm.getSimulatedTime();
      
      // All times should be valid and increasing
      expect(Number.isFinite(time1)).toBe(true);
      expect(Number.isFinite(time2)).toBe(true);
      expect(Number.isFinite(time3)).toBe(true);
      expect(Number.isFinite(time4)).toBe(true);
      
      expect(time2).toBeGreaterThan(time1);
      expect(time3).toBeGreaterThanOrEqual(time2);
      expect(time4).toBeGreaterThan(time3);
    });
  });
});

/**
 * Helper function to sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
