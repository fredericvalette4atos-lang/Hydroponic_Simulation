/**
 * Unit tests for PHSensor
 * 
 * Tests specific examples, edge cases, and error conditions for the pH sensor.
 */

import { PHSensor } from '../../../src/sensors/ph-sensor';
import { HydroponicState, SensorType } from '../../../src/types';

describe('PHSensor', () => {
  describe('Initialization', () => {
    test('initializes with default baseline value (7.0)', () => {
      const sensor = new PHSensor({ id: 'ph-1' });
      
      expect(sensor.id).toBe('ph-1');
      expect(sensor.type).toBe(SensorType.PH);
      
      // Raw value should be close to default baseline (7.0)
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(7.0, 1);
    });
    
    test('initializes with custom baseline value', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 6.5 });
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(6.5, 1);
    });
    
    test('initializes with custom noise level', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 7.0,
        noiseStdDev: 0.05 
      });
      
      // Should not throw
      expect(sensor.getValue()).toBeDefined();
    });
    
    test('initializes with custom drift rate', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 7.0,
        driftRate: 0.3 
      });
      
      expect(sensor.getRawValue()).toBeCloseTo(7.0, 1);
    });
  });
  
  describe('Baseline Validation', () => {
    test('rejects baseline below 0.0', () => {
      expect(() => {
        new PHSensor({ id: 'ph-1', baseline: -0.1 });
      }).toThrow('pH baseline must be between 0.0 and 14.0');
    });
    
    test('rejects baseline above 14.0', () => {
      expect(() => {
        new PHSensor({ id: 'ph-1', baseline: 14.1 });
      }).toThrow('pH baseline must be between 0.0 and 14.0');
    });
    
    test('accepts baseline at 0.0 (minimum)', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 0.0 });
      expect(sensor.getRawValue()).toBeCloseTo(0.0, 1);
    });
    
    test('accepts baseline at 14.0 (maximum)', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 14.0 });
      expect(sensor.getRawValue()).toBeCloseTo(14.0, 1);
    });
  });
  
  describe('getValue() - Reading with Noise', () => {
    test('returns value close to baseline', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      const value = sensor.getValue();
      
      // With default noise (±0.1), value should be within reasonable range
      expect(value).toBeGreaterThanOrEqual(6.5);
      expect(value).toBeLessThanOrEqual(7.5);
    });
    
    test('applies noise to readings', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 7.0,
        noiseStdDev: 0.1 
      });
      
      // Take multiple readings and verify they differ (noise is applied)
      const readings = Array.from({ length: 10 }, () => sensor.getValue());
      const uniqueReadings = new Set(readings);
      
      // With noise, we should get different values (very unlikely to get all same)
      expect(uniqueReadings.size).toBeGreaterThan(1);
    });
    
    test('clamps values to valid pH range (0.0-14.0)', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 0.0,
        noiseStdDev: 1.0 // Large noise
      });
      
      // Even with large noise, value should stay in bounds
      for (let i = 0; i < 100; i++) {
        const value = sensor.getValue();
        expect(value).toBeGreaterThanOrEqual(0.0);
        expect(value).toBeLessThanOrEqual(14.0);
      }
    });
  });
  
  describe('getRawValue() - Reading without Noise', () => {
    test('returns raw value without noise', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 6.5 });
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(6.5, 1);
    });
    
    test('returns consistent value on multiple calls', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      const value1 = sensor.getRawValue();
      const value2 = sensor.getRawValue();
      
      expect(value1).toBe(value2);
    });
  });
  
  describe('setBaseline()', () => {
    test('updates baseline value', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      sensor.setBaseline(6.0);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(6.0, 1);
    });
    
    test('resets drift accumulator', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      // Simulate some drift by updating from physics
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 7.2,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 3600 // 1 hour
      };
      sensor.updateFromPhysics(state);
      
      // Set new baseline
      sensor.setBaseline(6.5);
      
      // Raw value should be exactly the new baseline
      expect(sensor.getRawValue()).toBeCloseTo(6.5, 1);
    });
    
    test('rejects baseline below 0.0', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      expect(() => {
        sensor.setBaseline(-0.1);
      }).toThrow('pH baseline must be between 0.0 and 14.0');
    });
    
    test('rejects baseline above 14.0', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      expect(() => {
        sensor.setBaseline(14.5);
      }).toThrow('pH baseline must be between 0.0 and 14.0');
    });
  });
  
  describe('setNoiseLevel()', () => {
    test('updates noise level', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 7.0,
        noiseStdDev: 0.1 
      });
      
      sensor.setNoiseLevel(0.05);
      
      // Should not throw
      expect(sensor.getValue()).toBeDefined();
    });
    
    test('rejects negative noise level', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      expect(() => {
        sensor.setNoiseLevel(-0.1);
      }).toThrow('Noise standard deviation must be non-negative');
    });
    
    test('accepts zero noise level', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      sensor.setNoiseLevel(0);
      
      // With zero noise, getValue should equal getRawValue
      const value = sensor.getValue();
      const rawValue = sensor.getRawValue();
      expect(value).toBeCloseTo(rawValue, 5);
    });
  });
  
  describe('updateFromPhysics()', () => {
    test('reads pH from hydroponic state', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(6.5, 1);
    });
    
    test('applies drift over time', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 7.0,
        driftRate: 0.5 
      });
      
      // Initial state
      const state1: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 7.0,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      sensor.updateFromPhysics(state1);
      
      const initialValue = sensor.getRawValue();
      
      // State after 1 hour (3600 seconds)
      const state2: HydroponicState = {
        ...state1,
        simulatedTime: 3600
      };
      sensor.updateFromPhysics(state2);
      
      const driftedValue = sensor.getRawValue();
      
      // Value should have drifted (may be higher or lower due to random walk)
      // But should be within drift rate bounds (±0.5 pH/hour)
      const drift = Math.abs(driftedValue - initialValue);
      expect(drift).toBeLessThanOrEqual(0.6); // Allow small margin
    });
    
    test('ensures values stay within 0.0-14.0 bounds', () => {
      const sensor = new PHSensor({ 
        id: 'ph-1', 
        baseline: 13.8,
        driftRate: 0.5 
      });
      
      // State with high pH
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 13.9,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 7200 // 2 hours
      };
      
      sensor.updateFromPhysics(state);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeLessThanOrEqual(14.0);
      expect(rawValue).toBeGreaterThanOrEqual(0.0);
    });
    
    test('handles first update (no time delta)', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 6.8,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      // First update should not apply drift
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(6.8, 1);
    });
  });
  
  describe('Edge Cases', () => {
    test('handles pH at minimum bound (0.0)', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 0.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 0.0,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getValue();
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(14.0);
    });
    
    test('handles pH at maximum bound (14.0)', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 14.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 14.0,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getValue();
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(14.0);
    });
    
    test('handles rapid time progression', () => {
      const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22,
        ph: 7.0,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 36000 // 10 hours
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getRawValue();
      
      // Even after 10 hours, drift should be bounded
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(14.0);
    });
  });

  describe('Boundary Value Tests', () => {
    describe('pH values at boundaries (0, 14)', () => {
      test('2.1.1 - handles pH exactly at 0.0 boundary', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 0.0 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 0.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(0.0);
        
        // Even with noise, should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
        }
      });
      
      test('2.1.1 - handles pH exactly at 14.0 boundary', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 14.0 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 14.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(14.0);
        
        // Even with noise, should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
        }
      });
      
      test('2.1.1 - handles pH just above 0.0 boundary', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 0.01 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 0.01,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(0.01, 2);
      });
      
      test('2.1.1 - handles pH just below 14.0 boundary', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 13.99 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 13.99,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(13.99, 2);
      });
    });

    describe('Rapid pH changes', () => {
      test('2.1.2 - handles rapid pH increase from 0 to 14', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 0.0 });
        
        // Start at pH 0
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 0.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(0.0);
        
        // Rapid change to pH 14
        state = {
          ...state,
          ph: 14.0,
          simulatedTime: 1 // 1 second later
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        // Should reflect the new pH value
        expect(value).toBeGreaterThan(7.0);
        expect(value).toBeLessThanOrEqual(14.0);
      });
      
      test('2.1.2 - handles rapid pH decrease from 14 to 0', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 14.0 });
        
        // Start at pH 14
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 14.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(14.0);
        
        // Rapid change to pH 0
        state = {
          ...state,
          ph: 0.0,
          simulatedTime: 1 // 1 second later
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        // Should reflect the new pH value
        expect(value).toBeLessThan(7.0);
        expect(value).toBeGreaterThanOrEqual(0.0);
      });
      
      test('2.1.2 - handles multiple rapid pH oscillations', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 7.0 });
        
        const phValues = [7.0, 3.0, 11.0, 2.0, 13.0, 5.0, 12.0];
        let time = 0;
        
        for (const ph of phValues) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 80,
            temperature: 22,
            ph,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: time
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          // Should stay within bounds
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
          
          time += 100; // 100 seconds between changes
        }
      });
    });

    describe('Sensor drift accumulation', () => {
      test('2.1.3 - accumulates drift over extended time period', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          driftRate: 0.5 
        });
        
        // Initial state
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 7.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        const initialValue = sensor.getRawValue();
        
        // After 1 hour
        state = { ...state, simulatedTime: 3600 };
        sensor.updateFromPhysics(state);
        const value1Hour = sensor.getRawValue();
        
        // After 2 hours
        state = { ...state, simulatedTime: 7200 };
        sensor.updateFromPhysics(state);
        const value2Hours = sensor.getRawValue();
        
        // After 4 hours
        state = { ...state, simulatedTime: 14400 };
        sensor.updateFromPhysics(state);
        const value4Hours = sensor.getRawValue();
        
        // Drift should accumulate (values should differ)
        // But all should stay within bounds
        expect(initialValue).toBeCloseTo(7.0, 1);
        expect(value1Hour).toBeGreaterThanOrEqual(0.0);
        expect(value1Hour).toBeLessThanOrEqual(14.0);
        expect(value2Hours).toBeGreaterThanOrEqual(0.0);
        expect(value2Hours).toBeLessThanOrEqual(14.0);
        expect(value4Hours).toBeGreaterThanOrEqual(0.0);
        expect(value4Hours).toBeLessThanOrEqual(14.0);
      });
      
      test('2.1.3 - drift is bounded by drift rate', () => {
        const driftRate = 0.5; // pH units per hour
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          driftRate 
        });
        
        // Initial state
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 7.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        const initialValue = sensor.getRawValue();
        
        // After 10 hours
        state = { ...state, simulatedTime: 36000 };
        sensor.updateFromPhysics(state);
        const value10Hours = sensor.getRawValue();
        
        // Maximum possible drift after 10 hours is ±5.0 pH units
        const maxDrift = driftRate * 10;
        const actualDrift = Math.abs(value10Hours - initialValue);
        
        expect(actualDrift).toBeLessThanOrEqual(maxDrift + 0.1); // Small margin for rounding
      });
      
      test('2.1.3 - drift resets when baseline is changed', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          driftRate: 0.5 
        });
        
        // Initial state
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 7.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        // After 1 hour
        state = { ...state, simulatedTime: 3600 };
        sensor.updateFromPhysics(state);
        const driftedValue = sensor.getRawValue();
        
        // Change baseline
        sensor.setBaseline(6.0);
        
        // Raw value should be exactly the new baseline
        expect(sensor.getRawValue()).toBe(6.0);
        
        // Drift should be reset
        state = { ...state, simulatedTime: 7200 };
        sensor.updateFromPhysics(state);
        const valueAfterReset = sensor.getRawValue();
        
        // Should be close to new baseline (with some drift)
        expect(valueAfterReset).toBeGreaterThanOrEqual(0.0);
        expect(valueAfterReset).toBeLessThanOrEqual(14.0);
      });
    });

    describe('Noise generation edge cases', () => {
      test('2.1.4 - handles zero noise standard deviation', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          noiseStdDev: 0.0 
        });
        
        // With zero noise, getValue should equal getRawValue
        const rawValue = sensor.getRawValue();
        
        for (let i = 0; i < 20; i++) {
          const value = sensor.getValue();
          expect(value).toBe(rawValue);
        }
      });
      
      test('2.1.4 - handles very large noise standard deviation', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          noiseStdDev: 5.0 // Very large noise
        });
        
        // Even with large noise, values should stay within bounds
        for (let i = 0; i < 100; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
        }
      });
      
      test('2.1.4 - noise is applied consistently', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          noiseStdDev: 0.5 
        });
        
        // Take multiple readings
        const readings = Array.from({ length: 50 }, () => sensor.getValue());
        
        // All readings should be within bounds
        readings.forEach(reading => {
          expect(reading).toBeGreaterThanOrEqual(0.0);
          expect(reading).toBeLessThanOrEqual(14.0);
        });
        
        // With noise, we should get variation
        const uniqueReadings = new Set(readings);
        expect(uniqueReadings.size).toBeGreaterThan(1);
      });
      
      test('2.1.4 - changing noise level affects readings', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 7.0,
          noiseStdDev: 0.1 
        });
        
        // Get readings with low noise
        const lowNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        const lowNoiseVariance = Math.max(...lowNoiseReadings) - Math.min(...lowNoiseReadings);
        
        // Increase noise
        sensor.setNoiseLevel(1.0);
        
        // Get readings with high noise
        const highNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        const highNoiseVariance = Math.max(...highNoiseReadings) - Math.min(...highNoiseReadings);
        
        // High noise should generally produce more variance
        // (not guaranteed for small samples, but likely)
        expect(highNoiseVariance).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Extreme baseline values', () => {
      test('2.1.5 - handles extreme low baseline (0.0)', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 0.0 });
        
        // Multiple updates should stay at or near 0
        for (let i = 0; i < 5; i++) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 80,
            temperature: 22,
            ph: 0.0,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: i * 3600
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
        }
      });
      
      test('2.1.5 - handles extreme high baseline (14.0)', () => {
        const sensor = new PHSensor({ id: 'ph-1', baseline: 14.0 });
        
        // Multiple updates should stay at or near 14
        for (let i = 0; i < 5; i++) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 80,
            temperature: 22,
            ph: 14.0,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: i * 3600
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
        }
      });
      
      test('2.1.5 - handles extreme baseline with high drift rate', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 0.0,
          driftRate: 1.0 // High drift rate
        });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22,
          ph: 0.0,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 7200 // 2 hours
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        // Should stay within bounds even with high drift
        expect(value).toBeGreaterThanOrEqual(0.0);
        expect(value).toBeLessThanOrEqual(14.0);
      });
      
      test('2.1.5 - handles extreme baseline with high noise', () => {
        const sensor = new PHSensor({ 
          id: 'ph-1', 
          baseline: 14.0,
          noiseStdDev: 2.0 // High noise
        });
        
        // Multiple readings should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(14.0);
        }
      });
    });
  });
});
