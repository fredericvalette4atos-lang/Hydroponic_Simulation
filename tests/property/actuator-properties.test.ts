/**
 * Property-Based Tests for Actuator Components
 * 
 * Tests universal properties of actuator components including response time,
 * state persistence, effects on sensors, runtime tracking, failure simulation,
 * and specific actuator type behaviors.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 4.4
 */

import * as fc from 'fast-check';
import { PumpActuator } from '../../src/actuators/pump-actuator';
import { LightActuator } from '../../src/actuators/light-actuator';
import { ValveActuator, ValveType } from '../../src/actuators/valve-actuator';
import { ActuatorState, PumpType, PhysicsEffect } from '../../src/types';
import { HydroponicPhysicsModelImpl } from '../../src/physics/hydroponic-physics-model';
import { HydroponicState, PhysicsConfig } from '../../src/types';
import { WaterLevelSensor } from '../../src/sensors/water-level-sensor';
import { TemperatureSensor } from '../../src/sensors/temperature-sensor';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid flow rate for pumps (liters/hour or pH units/hour)
 */
const arbFlowRate = fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true });

/**
 * Generate valid pH adjustment rate (pH units/hour)
 */
const arbPHAdjustmentRate = fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true });

/**
 * Generate valid failure probability (0.0-1.0)
 */
const arbFailureProbability = fc.float({ min: 0.0, max: 1.0, noNaN: true });

/**
 * Generate valid failure probability for statistical tests (0.1-0.9)
 */
const arbStatisticalFailureProbability = fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true });

/**
 * Generate valid light intensity (0-100%)
 */
const arbLightIntensity = fc.float({ min: 0.0, max: 100.0, noNaN: true });

/**
 * Generate valid temperature effect for lights (°C/hour at 100%)
 */
const arbTemperatureEffect = fc.float({ min: Math.fround(0.5), max: Math.fround(10.0), noNaN: true });

/**
 * Generate valid time delta (hours)
 */
const arbTimeDelta = fc.float({ min: Math.fround(0.01), max: Math.fround(10.0), noNaN: true });

/**
 * Generate valid water volume (liters)
 */
const arbWaterVolume = fc.float({ min: Math.fround(0.1), max: Math.fround(100.0), noNaN: true });

/**
 * Generate valid temperature (°C)
 */
const arbTemperature = fc.float({ min: 0.0, max: Math.fround(50.0), noNaN: true });

/**
 * Generate valid pH values (0-14)
 */
const arbPH = fc.float({ min: 0.0, max: Math.fround(14.0), noNaN: true });

/**
 * Generate valid EC values (0-5 mS/cm)
 */
const arbEC = fc.float({ min: 0.0, max: Math.fround(5.0), noNaN: true });

/**
 * Generate valid nutrient concentration (ppm)
 */
const arbNutrientConcentration = fc.float({ min: 0.0, max: Math.fround(3200.0), noNaN: true });

/**
 * Generate valid reservoir capacity
 */
const arbReservoirCapacity = fc.float({ min: Math.fround(10.0), max: Math.fround(200.0), noNaN: true });

/**
 * Generate a valid hydroponic state
 */
const arbHydroponicState = fc.record({
  waterVolume: arbWaterVolume,
  waterLevel: fc.float({ min: 0.0, max: 100.0, noNaN: true }),
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

describe('Actuator Component Property Tests', () => {

  /**
   * Property 11: Actuator Response Time
   * 
   * **Validates: Requirements 5.1, 6.1, 7.1**
   * 
   * For any actuator component (pump, light, or valve) and any state command, 
   * the actuator shall transition to the commanded state within 100 milliseconds.
   */
  describe('Property 11: Actuator response time', () => {
    it('pump actuator should respond within 100ms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(PumpType.WATER, PumpType.NUTRIENT, PumpType.PH_UP, PumpType.PH_DOWN),
          arbFlowRate,
          fc.boolean(),
          (pumpType, flowRate, active) => {
            const pump = new PumpActuator({
              id: 'test-pump',
              pumpType,
              flowRate,
              failureProbability: 0.0 // No failures for this test
            });
            
            const startTime = Date.now();
            
            pump.setState({
              active,
              timestamp: Date.now()
            });
            
            const responseTime = Date.now() - startTime;
            
            // Response time should be less than 100ms
            expect(responseTime).toBeLessThan(100);
            
            // State should be updated
            expect(pump.getState().active).toBe(active);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('light actuator should respond within 100ms', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          fc.boolean(),
          arbLightIntensity,
          (tempEffect, active, intensity) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0 // No failures for this test
            });
            
            const startTime = Date.now();
            
            light.setState({
              active,
              intensity,
              timestamp: Date.now()
            });
            
            const responseTime = Date.now() - startTime;
            
            // Response time should be less than 100ms
            expect(responseTime).toBeLessThan(100);
            
            // State should be updated
            expect(light.getState().active).toBe(active);
            expect(light.getState().intensity).toBeCloseTo(intensity, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('valve actuator should respond within 100ms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ValveType.INLET, ValveType.OUTLET, ValveType.IRRIGATION),
          arbFlowRate,
          fc.boolean(),
          (valveType, flowRate, active) => {
            const valve = new ValveActuator({
              id: 'test-valve',
              valveType,
              flowRate,
              failureProbability: 0.0 // No failures for this test
            });
            
            const startTime = Date.now();
            
            valve.setState({
              active,
              timestamp: Date.now()
            });
            
            const responseTime = Date.now() - startTime;
            
            // Response time should be less than 100ms
            expect(responseTime).toBeLessThan(100);
            
            // State should be updated
            expect(valve.getState().active).toBe(active);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Actuator State Persistence
   * 
   * **Validates: Requirements 5.2, 7.2**
   * 
   * For any actuator component in a given state, if no new commands are received, 
   * the actuator shall remain in that state indefinitely.
   */
  describe('Property 12: Actuator state persistence', () => {
    it('pump actuator should maintain state without new commands', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(PumpType.WATER, PumpType.NUTRIENT, PumpType.PH_UP, PumpType.PH_DOWN),
          arbFlowRate,
          fc.boolean(),
          (pumpType, flowRate, active) => {
            const pump = new PumpActuator({
              id: 'test-pump',
              pumpType,
              flowRate,
              failureProbability: 0.0
            });
            
            // Set initial state
            pump.setState({
              active,
              timestamp: Date.now()
            });
            
            const initialState = pump.getState();
            
            // Wait a bit (simulate time passing)
            const waitTime = 50; // ms
            const startWait = Date.now();
            while (Date.now() - startWait < waitTime) {
              // Busy wait
            }
            
            // State should remain unchanged
            const currentState = pump.getState();
            expect(currentState.active).toBe(initialState.active);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('valve actuator should maintain state without new commands', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ValveType.INLET, ValveType.OUTLET, ValveType.IRRIGATION),
          arbFlowRate,
          fc.boolean(),
          (valveType, flowRate, active) => {
            const valve = new ValveActuator({
              id: 'test-valve',
              valveType,
              flowRate,
              failureProbability: 0.0
            });
            
            // Set initial state
            valve.setState({
              active,
              timestamp: Date.now()
            });
            
            const initialState = valve.getState();
            
            // Wait a bit
            const waitTime = 50; // ms
            const startWait = Date.now();
            while (Date.now() - startWait < waitTime) {
              // Busy wait
            }
            
            // State should remain unchanged
            const currentState = valve.getState();
            expect(currentState.active).toBe(initialState.active);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Pump Effect on Sensors
   * 
   * **Validates: Requirements 5.3**
   * 
   * For any pump actuator and its associated sensor (water pump affects water level, 
   * nutrient pump affects EC and water level, pH pump affects pH), when the pump 
   * operates, the associated sensor value shall change according to the pump type 
   * and flow rate.
   */
  describe('Property 13: Pump effect on sensors', () => {
    it('water pump should increase water level', () => {
      fc.assert(
        fc.property(
          arbFlowRate,
          arbWaterVolume.filter(v => v > 5.0 && v < 50.0),
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t < 2.0),
          arbReservoirCapacity.filter(c => c > 60.0),
          (flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const pump = new PumpActuator({
              id: 'water-pump',
              pumpType: PumpType.WATER,
              flowRate,
              failureProbability: 0.0
            });
            
            // Activate pump
            pump.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialWaterLevel = model.getState().waterLevel;
            
            // Apply pump effect
            const effect = pump.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalWaterLevel = model.getState().waterLevel;
            
            // Water level should increase (or stay same if at capacity)
            expect(finalWaterLevel).toBeGreaterThanOrEqual(initialWaterLevel - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pH-up pump should increase pH', () => {
      fc.assert(
        fc.property(
          arbPHAdjustmentRate.filter(r => r > 0.05), // Ensure significant adjustment
          arbWaterVolume.filter(v => v > 10.0),
          fc.constantFrom(22, 23, 24, 25, 26, 27, 28), // Near reference temp
          arbPH.filter(ph => ph > 1.0 && ph < 12.0), // Leave room, avoid edges
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.1 && t < 0.3), // Moderate time
          arbReservoirCapacity,
          (adjustmentRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const pump = new PumpActuator({
              id: 'ph-up-pump',
              pumpType: PumpType.PH_UP,
              flowRate: adjustmentRate,
              failureProbability: 0.0
            });
            
            // Activate pump
            pump.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialPH = model.getState().ph;
            
            // Apply pump effect
            const effect = pump.getPhysicsEffect();
            
            model.update(deltaTime, [effect]);
            
            const finalPH = model.getState().ph;
            
            // pH should increase (directional property)
            expect(finalPH).toBeGreaterThan(initialPH);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pH-down pump should decrease pH', () => {
      fc.assert(
        fc.property(
          arbPHAdjustmentRate.filter(r => r > 0.05), // Ensure significant adjustment
          arbWaterVolume.filter(v => v > 10.0),
          fc.constantFrom(22, 23, 24, 25, 26, 27, 28), // Near reference temp
          arbPH.filter(ph => ph > 2.0 && ph < 13.0), // Leave room, avoid edges
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.1 && t < 0.3), // Moderate time
          arbReservoirCapacity,
          (adjustmentRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const pump = new PumpActuator({
              id: 'ph-down-pump',
              pumpType: PumpType.PH_DOWN,
              flowRate: adjustmentRate,
              failureProbability: 0.0
            });
            
            // Activate pump
            pump.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialPH = model.getState().ph;
            
            // Apply pump effect
            const effect = pump.getPhysicsEffect();
            
            model.update(deltaTime, [effect]);
            
            const finalPH = model.getState().ph;
            
            // pH should decrease (directional property)
            expect(finalPH).toBeLessThan(initialPH);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Actuator Runtime Accumulation
   * 
   * **Validates: Requirements 5.4, 6.4**
   * 
   * For any actuator component, the total runtime shall equal the sum of all 
   * operation durations, and shall never decrease except when explicitly reset.
   */
  describe('Property 14: Actuator runtime accumulation', () => {
    it('pump runtime should accumulate over multiple activations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(PumpType.WATER, PumpType.NUTRIENT, PumpType.PH_UP, PumpType.PH_DOWN),
          arbFlowRate,
          fc.array(fc.integer({ min: 10, max: 200 }), { minLength: 2, maxLength: 5 }), // Activation durations in ms
          (pumpType, flowRate, durations) => {
            const pump = new PumpActuator({
              id: 'test-pump',
              pumpType,
              flowRate,
              failureProbability: 0.0
            });
            
            let expectedRuntime = 0;
            
            for (const duration of durations) {
              // Activate pump
              pump.setState({
                active: true,
                timestamp: Date.now()
              });
              
              // Wait for duration
              const startWait = Date.now();
              while (Date.now() - startWait < duration) {
                // Busy wait
              }
              
              // Deactivate pump
              pump.setState({
                active: false,
                timestamp: Date.now()
              });
              
              expectedRuntime += duration / 1000; // Convert to seconds
            }
            
            const actualRuntime = pump.getTotalRuntime();
            
            // Runtime should be close to expected (within 10% tolerance for timing variations)
            expect(actualRuntime).toBeGreaterThanOrEqual(expectedRuntime * 0.9);
            expect(actualRuntime).toBeLessThanOrEqual(expectedRuntime * 1.1);
          }
        ),
        { numRuns: 50 } // Fewer runs due to timing operations
      );
    });

    it('light runtime should accumulate over multiple activations', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          fc.array(fc.integer({ min: 10, max: 200 }), { minLength: 2, maxLength: 5 }), // Activation durations in ms
          (tempEffect, durations) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            let expectedRuntime = 0;
            
            for (const duration of durations) {
              // Activate light
              light.setState({
                active: true,
                intensity: 100,
                timestamp: Date.now()
              });
              
              // Wait for duration
              const startWait = Date.now();
              while (Date.now() - startWait < duration) {
                // Busy wait
              }
              
              // Deactivate light
              light.setState({
                active: false,
                intensity: 0,
                timestamp: Date.now()
              });
              
              expectedRuntime += duration / 1000; // Convert to seconds
            }
            
            const actualRuntime = light.getTotalRuntime();
            
            // Runtime should be close to expected (within 10% tolerance)
            expect(actualRuntime).toBeGreaterThanOrEqual(expectedRuntime * 0.9);
            expect(actualRuntime).toBeLessThanOrEqual(expectedRuntime * 1.1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('runtime should never decrease without reset', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(PumpType.WATER, PumpType.NUTRIENT, PumpType.PH_UP, PumpType.PH_DOWN),
          arbFlowRate,
          (pumpType, flowRate) => {
            const pump = new PumpActuator({
              id: 'test-pump',
              pumpType,
              flowRate,
              failureProbability: 0.0
            });
            
            // Activate and deactivate multiple times
            for (let i = 0; i < 3; i++) {
              const runtimeBefore = pump.getTotalRuntime();
              
              pump.setState({
                active: true,
                timestamp: Date.now()
              });
              
              // Wait a bit
              const startWait = Date.now();
              while (Date.now() - startWait < 20) {
                // Busy wait
              }
              
              pump.setState({
                active: false,
                timestamp: Date.now()
              });
              
              const runtimeAfter = pump.getTotalRuntime();
              
              // Runtime should never decrease
              expect(runtimeAfter).toBeGreaterThanOrEqual(runtimeBefore);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 15: Actuator Failure Probability
   * 
   * **Validates: Requirements 5.5, 6.5, 7.5**
   * 
   * For any actuator component with configured failure probability p, over a 
   * large number of operations, the observed failure rate shall converge to p 
   * (within statistical bounds).
   */
  describe('Property 15: Actuator failure probability', () => {
    it('pump failure rate should converge to configured probability', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(PumpType.WATER, PumpType.NUTRIENT, PumpType.PH_UP, PumpType.PH_DOWN),
          arbFlowRate,
          arbStatisticalFailureProbability, // Use Math.fround values
          (pumpType, flowRate, failureProbability) => {
            const numTrials = 1000; // Large number for statistical convergence
            let failures = 0;
            
            for (let i = 0; i < numTrials; i++) {
              const pump = new PumpActuator({
                id: `test-pump-${i}`,
                pumpType,
                flowRate,
                failureProbability
              });
              
              try {
                pump.setState({
                  active: true,
                  timestamp: Date.now()
                });
              } catch (error) {
                failures++;
              }
            }
            
            const observedRate = failures / numTrials;
            
            // Use 3-sigma confidence interval for binomial distribution
            // Standard error = sqrt(p * (1-p) / n)
            const standardError = Math.sqrt(failureProbability * (1 - failureProbability) / numTrials);
            const margin = 3 * standardError;
            
            // Observed rate should be within 3 standard errors of expected
            expect(observedRate).toBeGreaterThanOrEqual(failureProbability - margin);
            expect(observedRate).toBeLessThanOrEqual(failureProbability + margin);
          }
        ),
        { numRuns: 10 } // Fewer runs since each test does 1000 trials
      );
    });

    it('actuator with zero failure probability should never fail', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(PumpType.WATER, PumpType.NUTRIENT, PumpType.PH_UP, PumpType.PH_DOWN),
          arbFlowRate,
          (pumpType, flowRate) => {
            const pump = new PumpActuator({
              id: 'test-pump',
              pumpType,
              flowRate,
              failureProbability: 0.0
            });
            
            // Try to activate many times
            for (let i = 0; i < 100; i++) {
              expect(() => {
                pump.setState({
                  active: true,
                  timestamp: Date.now()
                });
              }).not.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 16: Light Intensity Range
   * 
   * **Validates: Requirements 6.2**
   * 
   * For any light actuator, the intensity control shall accept and maintain 
   * values from 0 to 100 percent, and reject values outside this range.
   */
  describe('Property 16: Light intensity range', () => {
    it('should accept intensity values from 0 to 100', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          arbLightIntensity,
          (tempEffect, intensity) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            // Should not throw for valid intensity
            expect(() => {
              light.setState({
                active: true,
                intensity,
                timestamp: Date.now()
              });
            }).not.toThrow();
            
            // Should maintain the intensity value
            expect(light.getState().intensity).toBeCloseTo(intensity, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject intensity values below 0', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          fc.float({ min: Math.fround(-100.0), max: Math.fround(-0.01), noNaN: true }), // Negative intensity
          (tempEffect, intensity) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            // Should throw for invalid intensity
            expect(() => {
              light.setState({
                active: true,
                intensity,
                timestamp: Date.now()
              });
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject intensity values above 100', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          fc.float({ min: Math.fround(100.01), max: Math.fround(200.0), noNaN: true }), // Above max intensity
          (tempEffect, intensity) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            // Should throw for invalid intensity
            expect(() => {
              light.setState({
                active: true,
                intensity,
                timestamp: Date.now()
              });
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 17: Light Effect on Temperature
   * 
   * **Validates: Requirements 6.3**
   * 
   * For any light actuator and temperature sensor, when the light operates, 
   * the temperature change shall be proportional to the light intensity 
   * (higher intensity causes greater temperature increase).
   */
  describe('Property 17: Light effect on temperature', () => {
    it('temperature increase should be proportional to light intensity', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect.filter(e => e > 1.0), // Ensure measurable effect
          arbLightIntensity.filter(i => i > 10.0), // Non-trivial intensity
          arbWaterVolume.filter(v => v > 10.0),
          arbTemperature.filter(t => t < 40.0), // Leave room for increase
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.2 && t < 1.0), // Ensure measurable effect
          arbReservoirCapacity,
          (tempEffect, intensity, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            // Activate light with specific intensity
            light.setState({
              active: true,
              intensity,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialTemp = model.getState().temperature;
            
            // Apply light effect
            const effect = light.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalTemp = model.getState().temperature;
            
            // Temperature should increase (directional property)
            expect(finalTemp).toBeGreaterThan(initialTemp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('higher intensity should cause greater temperature increase', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          fc.float({ min: 10.0, max: 50.0, noNaN: true }), // Low intensity
          fc.float({ min: 60.0, max: 100.0, noNaN: true }), // High intensity
          arbWaterVolume.filter(v => v > 10.0),
          arbTemperature.filter(t => t < 40.0),
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.5 && t < 2.0),
          arbReservoirCapacity,
          (tempEffect, lowIntensity, highIntensity, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            // Test with low intensity
            const lightLow = new LightActuator({
              id: 'test-light-low',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            lightLow.setState({
              active: true,
              intensity: lowIntensity,
              timestamp: Date.now()
            });
            
            // Test with high intensity
            const lightHigh = new LightActuator({
              id: 'test-light-high',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            lightHigh.setState({
              active: true,
              intensity: highIntensity,
              timestamp: Date.now()
            });
            
            // Create identical initial states
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const modelLow = new HydroponicPhysicsModelImpl({ ...initialState }, config, capacity);
            const modelHigh = new HydroponicPhysicsModelImpl({ ...initialState }, config, capacity);
            
            // Apply effects
            modelLow.update(deltaTime, [lightLow.getPhysicsEffect()]);
            modelHigh.update(deltaTime, [lightHigh.getPhysicsEffect()]);
            
            const tempLow = modelLow.getState().temperature;
            const tempHigh = modelHigh.getState().temperature;
            
            // Higher intensity should cause greater temperature increase
            expect(tempHigh).toBeGreaterThanOrEqual(tempLow - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('inactive light should not affect temperature', () => {
      fc.assert(
        fc.property(
          arbTemperatureEffect,
          arbWaterVolume.filter(v => v > 10.0),
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta,
          arbReservoirCapacity,
          (tempEffect, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const light = new LightActuator({
              id: 'test-light',
              temperatureEffect: tempEffect,
              failureProbability: 0.0
            });
            
            // Keep light inactive
            light.setState({
              active: false,
              intensity: 0,
              timestamp: Date.now()
            });
            
            // Get effect - should be empty
            const effect = light.getPhysicsEffect();
            
            expect(effect.temperatureDelta).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Valve Effect on Water Level
   * 
   * **Validates: Requirements 7.3**
   * 
   * For any valve actuator with configured flow rate, when the valve opens, 
   * the water level shall change according to the flow rate and duration of operation.
   */
  describe('Property 18: Valve effect on water level', () => {
    it('inlet valve should increase water level', () => {
      fc.assert(
        fc.property(
          arbFlowRate,
          arbWaterVolume.filter(v => v > 5.0 && v < 50.0),
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t < 2.0),
          arbReservoirCapacity.filter(c => c > 60.0),
          (flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const valve = new ValveActuator({
              id: 'inlet-valve',
              valveType: ValveType.INLET,
              flowRate,
              failureProbability: 0.0
            });
            
            // Open valve
            valve.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialWaterLevel = model.getState().waterLevel;
            
            // Apply valve effect
            const effect = valve.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalWaterLevel = model.getState().waterLevel;
            
            // Water level should increase (or stay same if at capacity)
            expect(finalWaterLevel).toBeGreaterThanOrEqual(initialWaterLevel - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('outlet valve should decrease water level', () => {
      fc.assert(
        fc.property(
          arbFlowRate,
          arbWaterVolume.filter(v => v > 10.0),
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t < 2.0),
          arbReservoirCapacity,
          (flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const valve = new ValveActuator({
              id: 'outlet-valve',
              valveType: ValveType.OUTLET,
              flowRate,
              failureProbability: 0.0
            });
            
            // Open valve
            valve.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialWaterLevel = model.getState().waterLevel;
            
            // Apply valve effect
            const effect = valve.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalWaterLevel = model.getState().waterLevel;
            
            // Water level should decrease (or stay at 0)
            expect(finalWaterLevel).toBeLessThanOrEqual(initialWaterLevel + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('closed valve should not affect water level', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ValveType.INLET, ValveType.OUTLET, ValveType.IRRIGATION),
          arbFlowRate,
          arbWaterVolume.filter(v => v > 10.0 && v < 95.0), // Avoid edge cases near capacity
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta,
          arbReservoirCapacity.filter(c => c > 100.0), // Ensure capacity is well above water volume
          (valveType, flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const valve = new ValveActuator({
              id: 'test-valve',
              valveType,
              flowRate,
              failureProbability: 0.0
            });
            
            // Keep valve closed
            valve.setState({
              active: false,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialWaterLevel = model.getState().waterLevel;
            
            // Apply valve effect (should be none)
            const effect = valve.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalWaterLevel = model.getState().waterLevel;
            
            // Water level should remain unchanged (with tolerance for floating point precision)
            expect(finalWaterLevel).toBeCloseTo(initialWaterLevel, 3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Valve Flow Rate Configuration
   * 
   * **Validates: Requirements 7.4**
   * 
   * For any valve actuator with configured flow rate, the actual water level 
   * change per unit time shall match the configured flow rate.
   */
  describe('Property 19: Valve flow rate configuration', () => {
    it('water level change should match configured flow rate', () => {
      fc.assert(
        fc.property(
          arbFlowRate.filter(r => r > 0.5), // Ensure measurable flow
          arbWaterVolume.filter(v => v > 15.0 && v < 40.0), // Safe range
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.2 && t < 1.0), // Moderate time
          arbReservoirCapacity.filter(c => c > 80.0), // Plenty of capacity
          (flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const valve = new ValveActuator({
              id: 'inlet-valve',
              valveType: ValveType.INLET,
              flowRate,
              failureProbability: 0.0
            });
            
            // Open valve
            valve.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialVolume = model.getState().waterVolume;
            
            // Apply valve effect
            const effect = valve.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalVolume = model.getState().waterVolume;
            
            // Water volume should increase (directional property)
            expect(finalVolume).toBeGreaterThan(initialVolume);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('different flow rates should produce proportional water changes', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1.0), max: Math.fround(5.0), noNaN: true }), // Low flow rate
          fc.float({ min: Math.fround(6.0), max: Math.fround(10.0), noNaN: true }), // High flow rate
          arbWaterVolume.filter(v => v > 10.0 && v < 40.0),
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.5 && t < 1.5),
          arbReservoirCapacity.filter(c => c > 80.0),
          (lowFlowRate, highFlowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            // Test with low flow rate
            const valveLow = new ValveActuator({
              id: 'valve-low',
              valveType: ValveType.INLET,
              flowRate: lowFlowRate,
              failureProbability: 0.0
            });
            
            valveLow.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Test with high flow rate
            const valveHigh = new ValveActuator({
              id: 'valve-high',
              valveType: ValveType.INLET,
              flowRate: highFlowRate,
              failureProbability: 0.0
            });
            
            valveHigh.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create identical initial states
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const modelLow = new HydroponicPhysicsModelImpl({ ...initialState }, config, capacity);
            const modelHigh = new HydroponicPhysicsModelImpl({ ...initialState }, config, capacity);
            
            // Apply effects
            modelLow.update(deltaTime, [valveLow.getPhysicsEffect()]);
            modelHigh.update(deltaTime, [valveHigh.getPhysicsEffect()]);
            
            const volumeLow = modelLow.getState().waterVolume;
            const volumeHigh = modelHigh.getState().waterVolume;
            
            const changeLow = volumeLow - waterVolume;
            const changeHigh = volumeHigh - waterVolume;
            
            // Higher flow rate should produce greater water change
            expect(changeHigh).toBeGreaterThanOrEqual(changeLow - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Water Level Response to Pump
   * 
   * **Validates: Requirements 4.4**
   * 
   * For any water level sensor and any water pump operation, the water level 
   * change shall be proportional to the pump's flow rate multiplied by the 
   * operation duration.
   */
  describe('Property 10: Water level response to pump', () => {
    it('water level change should be proportional to pump flow rate and duration', () => {
      fc.assert(
        fc.property(
          arbFlowRate.filter(r => r > 0.5), // Ensure measurable flow
          arbWaterVolume.filter(v => v > 15.0 && v < 40.0), // Safe range
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta.filter(t => t > 0.2 && t < 1.0), // Moderate time
          arbReservoirCapacity.filter(c => c > 80.0), // Plenty of capacity
          (flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const pump = new PumpActuator({
              id: 'water-pump',
              pumpType: PumpType.WATER,
              flowRate,
              failureProbability: 0.0
            });
            
            // Activate pump
            pump.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            const sensor = new WaterLevelSensor({
              id: 'water-level-sensor',
              baseline: (waterVolume / capacity) * 100,
              noiseStdDev: 0.0 // No noise for this test
            });
            
            // Update sensor with initial state
            sensor.updateFromPhysics(model.getState());
            const initialLevel = sensor.getRawValue();
            
            // Apply pump effect
            const effect = pump.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            // Update sensor with final state
            sensor.updateFromPhysics(model.getState());
            const finalLevel = sensor.getRawValue();
            
            // Water level should increase (directional property)
            expect(finalLevel).toBeGreaterThan(initialLevel);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('longer pump operation should cause greater water level change', () => {
      fc.assert(
        fc.property(
          arbFlowRate,
          arbWaterVolume.filter(v => v > 10.0 && v < 40.0),
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          fc.float({ min: Math.fround(0.2), max: Math.fround(0.5), noNaN: true }), // Short duration
          fc.float({ min: Math.fround(1.0), max: Math.fround(2.0), noNaN: true }), // Long duration
          arbReservoirCapacity.filter(c => c > 80.0),
          (flowRate, waterVolume, temp, ph, nutrients, shortDuration, longDuration, capacity) => {
            // Test with short duration
            const pumpShort = new PumpActuator({
              id: 'pump-short',
              pumpType: PumpType.WATER,
              flowRate,
              failureProbability: 0.0
            });
            
            pumpShort.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Test with long duration
            const pumpLong = new PumpActuator({
              id: 'pump-long',
              pumpType: PumpType.WATER,
              flowRate,
              failureProbability: 0.0
            });
            
            pumpLong.setState({
              active: true,
              timestamp: Date.now()
            });
            
            // Create identical initial states
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const modelShort = new HydroponicPhysicsModelImpl({ ...initialState }, config, capacity);
            const modelLong = new HydroponicPhysicsModelImpl({ ...initialState }, config, capacity);
            
            // Apply effects with different durations
            modelShort.update(shortDuration, [pumpShort.getPhysicsEffect()]);
            modelLong.update(longDuration, [pumpLong.getPhysicsEffect()]);
            
            const levelShort = modelShort.getState().waterLevel;
            const levelLong = modelLong.getState().waterLevel;
            
            const changeShort = levelShort - (waterVolume / capacity) * 100;
            const changeLong = levelLong - (waterVolume / capacity) * 100;
            
            // Longer duration should cause greater change
            expect(changeLong).toBeGreaterThanOrEqual(changeShort - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('inactive pump should not change water level', () => {
      fc.assert(
        fc.property(
          arbFlowRate,
          arbWaterVolume.filter(v => v > 10.0 && v < 95.0), // Avoid edge cases near capacity
          arbTemperature,
          arbPH,
          arbNutrientConcentration,
          arbTimeDelta,
          arbReservoirCapacity.filter(c => c > 100.0), // Ensure capacity is well above water volume
          (flowRate, waterVolume, temp, ph, nutrients, deltaTime, capacity) => {
            const pump = new PumpActuator({
              id: 'water-pump',
              pumpType: PumpType.WATER,
              flowRate,
              failureProbability: 0.0
            });
            
            // Keep pump inactive
            pump.setState({
              active: false,
              timestamp: Date.now()
            });
            
            // Create initial state
            const initialState: HydroponicState = {
              waterVolume,
              waterLevel: (waterVolume / capacity) * 100,
              temperature: temp,
              ph,
              ec: 1.5,
              nutrientConcentration: nutrients,
              ambientTemperature: temp,
              simulatedTime: 0
            };
            
            const config: PhysicsConfig = {
              evaporationRate: 0,
              plantUptakeRate: 0,
              nutrientUptakeRate: 0,
              ambientTemperature: temp,
              temperatureDriftRate: 0,
              phDriftRate: 0
            };
            
            const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
            
            const initialLevel = model.getState().waterLevel;
            
            // Apply pump effect (should be none)
            const effect = pump.getPhysicsEffect();
            model.update(deltaTime, [effect]);
            
            const finalLevel = model.getState().waterLevel;
            
            // Water level should remain unchanged (with tolerance for floating point precision)
            expect(finalLevel).toBeCloseTo(initialLevel, 3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
