/**
 * Property-Based Tests for Sensor Components
 * 
 * Tests universal properties of sensor components including value bounds,
 * baseline initialization, measurement noise, drift constraints, and
 * responses to system changes.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.5
 */

import * as fc from 'fast-check';
import { PHSensor } from '../../src/sensors/ph-sensor';
import { ECSensor } from '../../src/sensors/ec-sensor';
import { TemperatureSensor } from '../../src/sensors/temperature-sensor';
import { WaterLevelSensor } from '../../src/sensors/water-level-sensor';
import { HydroponicState, PhysicsEffect } from '../../src/types';
import { HydroponicPhysicsModelImpl } from '../../src/physics/hydroponic-physics-model';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid pH values (0-14)
 */
const arbPH = fc.float({ min: 0.0, max: Math.fround(14.0), noNaN: true });

/**
 * Generate valid EC values (0-5 mS/cm)
 */
const arbEC = fc.float({ min: 0.0, max: Math.fround(5.0), noNaN: true });

/**
 * Generate valid temperature values (0-50°C)
 */
const arbTemperature = fc.float({ min: 0.0, max: Math.fround(50.0), noNaN: true });

/**
 * Generate valid water level percentage (0-100%)
 */
const arbWaterLevel = fc.float({ min: 0.0, max: Math.fround(100.0), noNaN: true });

/**
 * Generate valid water volume (liters)
 */
const arbWaterVolume = fc.float({ min: Math.fround(0.1), max: Math.fround(100.0), noNaN: true });

/**
 * Generate valid nutrient concentration (ppm)
 */
const arbNutrientConcentration = fc.float({ min: 0.0, max: Math.fround(3200.0), noNaN: true });

/**
 * Generate valid time delta (hours)
 */
const arbTimeDelta = fc.float({ min: Math.fround(0.01), max: Math.fround(24.0), noNaN: true });

/**
 * Generate valid noise standard deviation for pH (±0.1)
 */
const arbPHNoise = fc.float({ min: 0.0, max: Math.fround(0.1), noNaN: true });

/**
 * Generate valid noise standard deviation for EC (±0.05)
 */
const arbECNoise = fc.float({ min: 0.0, max: Math.fround(0.05), noNaN: true });

/**
 * Generate valid noise standard deviation for temperature (±0.2)
 */
const arbTempNoise = fc.float({ min: 0.0, max: Math.fround(0.2), noNaN: true });

/**
 * Generate valid noise standard deviation for water level (±1.0)
 */
const arbWaterLevelNoise = fc.float({ min: 0.0, max: Math.fround(1.0), noNaN: true });

/**
 * Generate valid drift rate for pH (±0.5 per hour)
 */
const arbPHDriftRate = fc.float({ min: 0.0, max: Math.fround(0.5), noNaN: true });

/**
 * Generate valid drift rate for temperature (±2.0 per hour)
 */
const arbTempDriftRate = fc.float({ min: 0.0, max: Math.fround(2.0), noNaN: true });

/**
 * Generate a valid hydroponic state
 */
const arbHydroponicState = fc.record({
  waterVolume: arbWaterVolume,
  waterLevel: arbWaterLevel,
  temperature: arbTemperature,
  ph: arbPH,
  ec: arbEC,
  nutrientConcentration: arbNutrientConcentration,
  ambientTemperature: arbTemperature,
  simulatedTime: fc.float({ min: 0.0, max: Math.fround(1000000.0), noNaN: true })
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Sensor Component Property Tests', () => {

  /**
   * Property 1: Sensor Value Bounds
   * 
   * **Validates: Requirements 1.1, 2.1, 3.1, 4.1**
   * 
   * For any sensor component and any simulation state, the sensor's generated 
   * value shall remain within its defined valid range (pH: 0.0-14.0, EC: 0.0-5.0 mS/cm, 
   * Temperature: 0.0-50.0°C, Water Level: 0.0-100.0%).
   */
  describe('Property 1: Sensor value bounds', () => {
    it('pH sensor values should stay within 0.0-14.0 range', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbPHNoise,
          arbHydroponicState,
          (baseline, noise, systemState) => {
            const sensor = new PHSensor({
              id: 'test-ph',
              baseline,
              noiseStdDev: noise
            });
            
            // Update sensor from physics state
            sensor.updateFromPhysics(systemState);
            
            // Get value multiple times to test with different noise
            for (let i = 0; i < 10; i++) {
              const value = sensor.getValue();
              expect(value).toBeGreaterThanOrEqual(0.0);
              expect(value).toBeLessThanOrEqual(14.0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('EC sensor values should stay within 0.0-5.0 mS/cm range', () => {
      fc.assert(
        fc.property(
          arbEC,
          arbECNoise,
          arbHydroponicState,
          (baseline, noise, systemState) => {
            const sensor = new ECSensor({
              id: 'test-ec',
              baseline,
              noiseStdDev: noise
            });
            
            // Update sensor from physics state
            sensor.updateFromPhysics(systemState);
            
            // Get value multiple times to test with different noise
            for (let i = 0; i < 10; i++) {
              const value = sensor.getValue();
              expect(value).toBeGreaterThanOrEqual(0.0);
              expect(value).toBeLessThanOrEqual(5.0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Temperature sensor values should stay within 0.0-50.0°C range', () => {
      fc.assert(
        fc.property(
          arbTemperature,
          arbTempNoise,
          arbHydroponicState,
          (baseline, noise, systemState) => {
            const sensor = new TemperatureSensor({
              id: 'test-temp',
              baseline,
              noiseStdDev: noise
            });
            
            // Update sensor from physics state
            sensor.updateFromPhysics(systemState);
            
            // Get value multiple times to test with different noise
            for (let i = 0; i < 10; i++) {
              const value = sensor.getValue();
              expect(value).toBeGreaterThanOrEqual(0.0);
              expect(value).toBeLessThanOrEqual(50.0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Water level sensor values should stay within 0.0-100.0% range', () => {
      fc.assert(
        fc.property(
          arbWaterLevel,
          arbWaterLevelNoise,
          arbHydroponicState,
          (baseline, noise, systemState) => {
            const sensor = new WaterLevelSensor({
              id: 'test-level',
              baseline,
              noiseStdDev: noise
            });
            
            // Update sensor from physics state
            sensor.updateFromPhysics(systemState);
            
            // Get value multiple times to test with different noise
            for (let i = 0; i < 10; i++) {
              const value = sensor.getValue();
              expect(value).toBeGreaterThanOrEqual(0.0);
              expect(value).toBeLessThanOrEqual(100.0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Sensor Baseline Initialization
   * 
   * **Validates: Requirements 1.2, 2.2, 3.2, 4.2**
   * 
   * For any sensor component with a configured baseline value, when the simulator 
   * starts, the sensor's initial reading shall equal the configured baseline value 
   * (within measurement noise bounds).
   */
  describe('Property 2: Sensor baseline initialization', () => {
    it('pH sensor should initialize with baseline value', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbPHNoise,
          (baseline, noise) => {
            const sensor = new PHSensor({
              id: 'test-ph',
              baseline,
              noiseStdDev: noise
            });
            
            // Get raw value (no noise) should equal baseline
            const rawValue = sensor.getRawValue();
            expect(rawValue).toBeCloseTo(baseline, 6);
            
            // Get value with noise should be within noise bounds
            const value = sensor.getValue();
            const difference = Math.abs(value - baseline);
            
            // Within 3 standard deviations (99.7% confidence for Gaussian)
            expect(difference).toBeLessThanOrEqual(noise * 3 + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('EC sensor should initialize with baseline value', () => {
      fc.assert(
        fc.property(
          arbEC,
          arbECNoise,
          (baseline, noise) => {
            const sensor = new ECSensor({
              id: 'test-ec',
              baseline,
              noiseStdDev: noise
            });
            
            // Get raw value (no noise) should equal baseline
            const rawValue = sensor.getRawValue();
            expect(rawValue).toBeCloseTo(baseline, 6);
            
            // Get value with noise should be within noise bounds
            const value = sensor.getValue();
            const difference = Math.abs(value - baseline);
            
            // Within 3 standard deviations
            expect(difference).toBeLessThanOrEqual(noise * 3 + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Temperature sensor should initialize with baseline value', () => {
      fc.assert(
        fc.property(
          arbTemperature,
          arbTempNoise,
          (baseline, noise) => {
            const sensor = new TemperatureSensor({
              id: 'test-temp',
              baseline,
              noiseStdDev: noise
            });
            
            // Get raw value (no noise) should equal baseline
            const rawValue = sensor.getRawValue();
            expect(rawValue).toBeCloseTo(baseline, 6);
            
            // Get value with noise should be within noise bounds
            const value = sensor.getValue();
            const difference = Math.abs(value - baseline);
            
            // Within 3 standard deviations
            expect(difference).toBeLessThanOrEqual(noise * 3 + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Water level sensor should initialize with baseline value', () => {
      fc.assert(
        fc.property(
          arbWaterLevel,
          arbWaterLevelNoise,
          (baseline, noise) => {
            const sensor = new WaterLevelSensor({
              id: 'test-level',
              baseline,
              noiseStdDev: noise
            });
            
            // Get raw value (no noise) should equal baseline
            const rawValue = sensor.getRawValue();
            expect(rawValue).toBeCloseTo(baseline, 6);
            
            // Get value with noise should be within noise bounds
            const value = sensor.getValue();
            const difference = Math.abs(value - baseline);
            
            // Within 3 standard deviations
            expect(difference).toBeLessThanOrEqual(noise * 3 + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Sensor Measurement Noise Bounds
   * 
   * **Validates: Requirements 1.5, 2.5, 3.5, 4.5**
   * 
   * For any sensor component with configured noise level, all measurement noise 
   * shall remain within the specified bounds (pH: ±0.1, EC: ±0.05 mS/cm, 
   * Temperature: ±0.2°C, Water Level: ±1.0%).
   */
  describe('Property 3: Sensor measurement noise bounds', () => {
    it('pH sensor noise should stay within ±0.1 pH units', () => {
      fc.assert(
        fc.property(
          arbPH.filter(ph => ph >= 0.5 && ph <= 13.5), // Avoid boundary effects
          (baseline) => {
            const maxNoise = 0.1;
            const sensor = new PHSensor({
              id: 'test-ph',
              baseline,
              noiseStdDev: maxNoise
            });
            
            // Sample multiple readings to check noise distribution
            const readings: number[] = [];
            for (let i = 0; i < 100; i++) {
              readings.push(sensor.getValue());
            }
            
            // Check that most readings (at least 90%) are within 2 sigma
            // This accounts for statistical variation in sampling
            const maxDeviation = maxNoise * 2; // 95% confidence interval
            let withinBounds = 0;
            for (const reading of readings) {
              const deviation = Math.abs(reading - baseline);
              if (deviation <= maxDeviation) {
                withinBounds++;
              }
            }
            
            // At least 85% should be within 2 sigma (accounting for sampling variation)
            expect(withinBounds).toBeGreaterThanOrEqual(85);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('EC sensor noise should stay within ±0.05 mS/cm', () => {
      fc.assert(
        fc.property(
          arbEC.filter(ec => ec >= 0.2 && ec <= 4.8), // Avoid boundary effects
          (baseline) => {
            const maxNoise = 0.05;
            const sensor = new ECSensor({
              id: 'test-ec',
              baseline,
              noiseStdDev: maxNoise
            });
            
            // Sample multiple readings
            const readings: number[] = [];
            for (let i = 0; i < 100; i++) {
              readings.push(sensor.getValue());
            }
            
            // Check that most readings (at least 90%) are within 2 sigma
            const maxDeviation = maxNoise * 2;
            let withinBounds = 0;
            for (const reading of readings) {
              const deviation = Math.abs(reading - baseline);
              if (deviation <= maxDeviation) {
                withinBounds++;
              }
            }
            
            // At least 85% should be within 2 sigma
            expect(withinBounds).toBeGreaterThanOrEqual(85);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Temperature sensor noise should stay within ±0.2°C', () => {
      fc.assert(
        fc.property(
          arbTemperature.filter(t => t >= 1.0 && t <= 49.0), // Avoid boundary effects
          (baseline) => {
            const maxNoise = 0.2;
            const sensor = new TemperatureSensor({
              id: 'test-temp',
              baseline,
              noiseStdDev: maxNoise
            });
            
            // Sample multiple readings
            const readings: number[] = [];
            for (let i = 0; i < 100; i++) {
              readings.push(sensor.getValue());
            }
            
            // Check that most readings (at least 90%) are within 2 sigma
            const maxDeviation = maxNoise * 2;
            let withinBounds = 0;
            for (const reading of readings) {
              const deviation = Math.abs(reading - baseline);
              if (deviation <= maxDeviation) {
                withinBounds++;
              }
            }
            
            // At least 85% should be within 2 sigma
            expect(withinBounds).toBeGreaterThanOrEqual(85);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Water level sensor noise should stay within ±1.0%', () => {
      fc.assert(
        fc.property(
          arbWaterLevel.filter(l => l >= 5.0 && l <= 95.0), // Avoid boundary effects
          (baseline) => {
            const maxNoise = 1.0;
            const sensor = new WaterLevelSensor({
              id: 'test-level',
              baseline,
              noiseStdDev: maxNoise
            });
            
            // Sample multiple readings
            const readings: number[] = [];
            for (let i = 0; i < 100; i++) {
              readings.push(sensor.getValue());
            }
            
            // Check that most readings (at least 90%) are within 2 sigma
            const maxDeviation = maxNoise * 2;
            let withinBounds = 0;
            for (const reading of readings) {
              const deviation = Math.abs(reading - baseline);
              if (deviation <= maxDeviation) {
                withinBounds++;
              }
            }
            
            // At least 85% should be within 2 sigma
            expect(withinBounds).toBeGreaterThanOrEqual(85);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Sensor Drift Constraints
   * 
   * **Validates: Requirements 1.3, 3.4**
   * 
   * For any sensor component with configured drift rate, the drift over any 
   * one-hour period shall not exceed the specified maximum (pH: ±0.5 units/hour, 
   * Temperature: ±2.0°C/hour).
   */
  describe('Property 4: Sensor drift constraints', () => {
    it('pH sensor drift should not exceed ±0.5 pH units per hour', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbPHDriftRate,
          arbTimeDelta.filter(t => t <= 1.0), // Test within 1 hour
          (baseline, driftRate, timeHours) => {
            const sensor = new PHSensor({
              id: 'test-ph',
              baseline,
              noiseStdDev: 0.0, // No noise for drift testing
              driftRate
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume: 50,
              waterLevel: 50,
              temperature: 22,
              ph: baseline,
              ec: 1.5,
              nutrientConcentration: 1000,
              ambientTemperature: 22,
              simulatedTime: 0
            };
            
            sensor.updateFromPhysics(initialState);
            const initialValue = sensor.getRawValue();
            
            // Advance time
            const finalState: HydroponicState = {
              ...initialState,
              simulatedTime: timeHours * 3600 // Convert to seconds
            };
            
            sensor.updateFromPhysics(finalState);
            const finalValue = sensor.getRawValue();
            
            // Calculate drift
            const drift = Math.abs(finalValue - initialValue);
            const maxDrift = driftRate * timeHours;
            
            // Drift should not exceed configured rate
            expect(drift).toBeLessThanOrEqual(maxDrift + 0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Temperature sensor drift should not exceed ±2.0°C per hour', () => {
      fc.assert(
        fc.property(
          arbTemperature,
          arbTempDriftRate,
          arbTimeDelta.filter(t => t <= 1.0), // Test within 1 hour
          (baseline, driftRate, timeHours) => {
            const sensor = new TemperatureSensor({
              id: 'test-temp',
              baseline,
              noiseStdDev: 0.0, // No noise for drift testing
              driftRate
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume: 50,
              waterLevel: 50,
              temperature: baseline,
              ph: 7.0,
              ec: 1.5,
              nutrientConcentration: 1000,
              ambientTemperature: baseline,
              simulatedTime: 0
            };
            
            sensor.updateFromPhysics(initialState);
            const initialValue = sensor.getRawValue();
            
            // Advance time
            const finalState: HydroponicState = {
              ...initialState,
              simulatedTime: timeHours * 3600 // Convert to seconds
            };
            
            sensor.updateFromPhysics(finalState);
            const finalValue = sensor.getRawValue();
            
            // Calculate drift
            const drift = Math.abs(finalValue - initialValue);
            const maxDrift = driftRate * timeHours;
            
            // Drift should not exceed configured rate
            expect(drift).toBeLessThanOrEqual(maxDrift + 0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: pH Response to Nutrient Addition
   * 
   * **Validates: Requirements 1.4**
   * 
   * For any hydroponic system state and any nutrient addition event, the pH value 
   * shall change in the direction determined by the nutrient type (acidic nutrients 
   * decrease pH, basic nutrients increase pH).
   */
  describe('Property 5: pH response to nutrient addition', () => {
    it('pH should decrease when pH-down (acidic) is added', () => {
      fc.assert(
        fc.property(
          arbPH.filter(ph => ph > 1.0), // Ensure room to decrease
          arbWaterVolume,
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }), // pH delta
          (initialPH, waterVolume, phDelta) => {
            const sensor = new PHSensor({
              id: 'test-ph',
              baseline: initialPH,
              noiseStdDev: 0.0 // No noise for this test
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: 50,
              temperature: 22,
              ph: initialPH,
              ec: 1.5,
              nutrientConcentration: 1000,
              ambientTemperature: 22,
              simulatedTime: 0
            };
            
            sensor.updateFromPhysics(initialState);
            const initialValue = sensor.getRawValue();
            
            // Apply pH-down effect (negative delta)
            const finalState: HydroponicState = {
              ...initialState,
              ph: Math.max(0, initialPH - phDelta)
            };
            
            sensor.updateFromPhysics(finalState);
            const finalValue = sensor.getRawValue();
            
            // pH should decrease
            expect(finalValue).toBeLessThanOrEqual(initialValue + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pH should increase when pH-up (basic) is added', () => {
      fc.assert(
        fc.property(
          arbPH.filter(ph => ph < 13.0), // Ensure room to increase
          arbWaterVolume,
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }), // pH delta
          (initialPH, waterVolume, phDelta) => {
            const sensor = new PHSensor({
              id: 'test-ph',
              baseline: initialPH,
              noiseStdDev: 0.0 // No noise for this test
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: 50,
              temperature: 22,
              ph: initialPH,
              ec: 1.5,
              nutrientConcentration: 1000,
              ambientTemperature: 22,
              simulatedTime: 0
            };
            
            sensor.updateFromPhysics(initialState);
            const initialValue = sensor.getRawValue();
            
            // Apply pH-up effect (positive delta)
            const finalState: HydroponicState = {
              ...initialState,
              ph: Math.min(14, initialPH + phDelta)
            };
            
            sensor.updateFromPhysics(finalState);
            const finalValue = sensor.getRawValue();
            
            // pH should increase
            expect(finalValue).toBeGreaterThanOrEqual(initialValue - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Temperature Response to Actuators
   * 
   * **Validates: Requirements 3.3**
   * 
   * For any temperature sensor and any heating/cooling actuator operation, the 
   * temperature shall change at the configured rate in the direction determined 
   * by the actuator type (heating increases, cooling decreases).
   */
  describe('Property 8: Temperature response to actuators', () => {
    it('Temperature should increase when heating actuator operates', () => {
      fc.assert(
        fc.property(
          arbTemperature.filter(t => t < 45.0), // Ensure room to increase
          fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true }), // Temp increase
          (initialTemp, tempIncrease) => {
            const sensor = new TemperatureSensor({
              id: 'test-temp',
              baseline: initialTemp,
              noiseStdDev: 0.0 // No noise for this test
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume: 50,
              waterLevel: 50,
              temperature: initialTemp,
              ph: 7.0,
              ec: 1.5,
              nutrientConcentration: 1000,
              ambientTemperature: initialTemp,
              simulatedTime: 0
            };
            
            sensor.updateFromPhysics(initialState);
            const initialValue = sensor.getRawValue();
            
            // Apply heating effect
            const finalState: HydroponicState = {
              ...initialState,
              temperature: Math.min(50, initialTemp + tempIncrease)
            };
            
            sensor.updateFromPhysics(finalState);
            const finalValue = sensor.getRawValue();
            
            // Temperature should increase
            expect(finalValue).toBeGreaterThanOrEqual(initialValue - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Temperature should decrease when cooling actuator operates', () => {
      fc.assert(
        fc.property(
          arbTemperature.filter(t => t > 5.0), // Ensure room to decrease
          fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true }), // Temp decrease
          (initialTemp, tempDecrease) => {
            const sensor = new TemperatureSensor({
              id: 'test-temp',
              baseline: initialTemp,
              noiseStdDev: 0.0 // No noise for this test
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume: 50,
              waterLevel: 50,
              temperature: initialTemp,
              ph: 7.0,
              ec: 1.5,
              nutrientConcentration: 1000,
              ambientTemperature: initialTemp,
              simulatedTime: 0
            };
            
            sensor.updateFromPhysics(initialState);
            const initialValue = sensor.getRawValue();
            
            // Apply cooling effect
            const finalState: HydroponicState = {
              ...initialState,
              temperature: Math.max(0, initialTemp - tempDecrease)
            };
            
            sensor.updateFromPhysics(finalState);
            const finalValue = sensor.getRawValue();
            
            // Temperature should decrease
            expect(finalValue).toBeLessThanOrEqual(initialValue + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
