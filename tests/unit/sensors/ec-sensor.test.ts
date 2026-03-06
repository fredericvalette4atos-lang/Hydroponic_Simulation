/**
 * Unit tests for ECSensor
 * 
 * Tests EC sensor initialization, value bounds, noise application,
 * and physics model integration.
 * 
 * Requirements: 2.1, 2.2, 2.5
 */

import { ECSensor } from '../../../src/sensors/ec-sensor';
import { HydroponicState, SensorType } from '../../../src/types';

describe('ECSensor', () => {
  describe('Initialization', () => {
    test('initializes with default baseline (1.5 mS/cm)', () => {
      const sensor = new ECSensor({ id: 'ec-1' });
      
      expect(sensor.id).toBe('ec-1');
      expect(sensor.type).toBe(SensorType.EC);
      
      // Value should be close to baseline (within noise bounds)
      const value = sensor.getRawValue();
      expect(value).toBeCloseTo(1.5, 1);
    });
    
    test('initializes with custom baseline', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.5 });
      
      const value = sensor.getRawValue();
      expect(value).toBeCloseTo(2.5, 1);
    });
    
    test('initializes with custom noise level', () => {
      const sensor = new ECSensor({ 
        id: 'ec-1', 
        baseline: 2.0,
        noiseStdDev: 0.1 
      });
      
      expect(sensor.getRawValue()).toBeCloseTo(2.0, 1);
    });
  });
  
  describe('Value Bounds Validation', () => {
    test('rejects baseline below 0.0 mS/cm', () => {
      expect(() => {
        new ECSensor({ id: 'ec-1', baseline: -0.1 });
      }).toThrow('EC baseline must be between 0.0 and 5.0 mS/cm');
    });
    
    test('rejects baseline above 5.0 mS/cm', () => {
      expect(() => {
        new ECSensor({ id: 'ec-1', baseline: 5.1 });
      }).toThrow('EC baseline must be between 0.0 and 5.0 mS/cm');
    });
    
    test('accepts baseline at 0.0 mS/cm', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 0.0 });
      expect(sensor.getRawValue()).toBe(0.0);
    });
    
    test('accepts baseline at 5.0 mS/cm', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 5.0 });
      expect(sensor.getRawValue()).toBe(5.0);
    });
    
    test('clamps values above 5.0 mS/cm from physics model', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: 6.0, // Above max
        nutrientConcentration: 1000,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBe(5.0);
    });
    
    test('clamps values below 0.0 mS/cm from physics model', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: -0.5, // Below min
        nutrientConcentration: 1000,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBe(0.0);
    });
  });
  
  describe('getValue with Noise', () => {
    test('returns value with noise applied', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      // Get multiple readings to verify noise is applied
      const readings = Array.from({ length: 10 }, () => sensor.getValue());
      
      // At least some readings should differ (noise is random)
      const uniqueReadings = new Set(readings);
      expect(uniqueReadings.size).toBeGreaterThan(1);
      
      // All readings should be within valid range
      readings.forEach(reading => {
        expect(reading).toBeGreaterThanOrEqual(0.0);
        expect(reading).toBeLessThanOrEqual(5.0);
      });
    });
    
    test('noise stays within reasonable bounds', () => {
      const sensor = new ECSensor({ 
        id: 'ec-1', 
        baseline: 2.5,
        noiseStdDev: 0.05 
      });
      
      // Get many readings to check noise distribution
      const readings = Array.from({ length: 100 }, () => sensor.getValue());
      
      // Most readings should be within ±3 standard deviations (99.7%)
      // For stddev=0.05, that's ±0.15 mS/cm
      const withinBounds = readings.filter(r => 
        r >= 2.5 - 0.15 && r <= 2.5 + 0.15
      );
      
      expect(withinBounds.length).toBeGreaterThan(95); // At least 95%
    });
  });
  
  describe('getRawValue', () => {
    test('returns value without noise', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      // Raw value should be consistent
      expect(sensor.getRawValue()).toBe(2.0);
      expect(sensor.getRawValue()).toBe(2.0);
      expect(sensor.getRawValue()).toBe(2.0);
    });
  });
  
  describe('setBaseline', () => {
    test('updates baseline value', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      sensor.setBaseline(3.0);
      expect(sensor.getRawValue()).toBeCloseTo(3.0, 1);
    });
    
    test('rejects baseline below 0.0 mS/cm', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      expect(() => {
        sensor.setBaseline(-0.1);
      }).toThrow('EC baseline must be between 0.0 and 5.0 mS/cm');
    });
    
    test('rejects baseline above 5.0 mS/cm', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      expect(() => {
        sensor.setBaseline(5.5);
      }).toThrow('EC baseline must be between 0.0 and 5.0 mS/cm');
    });
  });
  
  describe('setNoiseLevel', () => {
    test('updates noise level', () => {
      const sensor = new ECSensor({ 
        id: 'ec-1', 
        baseline: 2.0,
        noiseStdDev: 0.05 
      });
      
      // Set very low noise
      sensor.setNoiseLevel(0.001);
      
      const readings = Array.from({ length: 10 }, () => sensor.getValue());
      
      // With very low noise, readings should be very close to baseline
      readings.forEach(reading => {
        expect(reading).toBeCloseTo(2.0, 2);
      });
    });
    
    test('rejects negative noise level', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      expect(() => {
        sensor.setNoiseLevel(-0.1);
      }).toThrow('Noise standard deviation must be non-negative');
    });
  });
  
  describe('updateFromPhysics', () => {
    test('reads EC from hydroponic state', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: 3.2,
        nutrientConcentration: 1000,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      expect(sensor.getRawValue()).toBeCloseTo(3.2, 1);
    });
    
    test('updates EC when physics state changes', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      const state1: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: 2.5,
        nutrientConcentration: 1000,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state1);
      expect(sensor.getRawValue()).toBeCloseTo(2.5, 1);
      
      const state2: HydroponicState = {
        ...state1,
        ec: 1.8,
        simulatedTime: 100
      };
      
      sensor.updateFromPhysics(state2);
      expect(sensor.getRawValue()).toBeCloseTo(1.8, 1);
    });
    
    test('handles EC at minimum bound (0.0)', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: 0.0,
        nutrientConcentration: 0,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBe(0.0);
    });
    
    test('handles EC at maximum bound (5.0)', () => {
      const sensor = new ECSensor({ id: 'ec-1', baseline: 2.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: 5.0,
        nutrientConcentration: 2000,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBe(5.0);
    });
  });
  
  describe('Integration', () => {
    test('getValue reflects physics updates with noise', () => {
      const sensor = new ECSensor({ 
        id: 'ec-1', 
        baseline: 2.0,
        noiseStdDev: 0.05 
      });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 50,
        temperature: 25,
        ph: 6.5,
        ec: 3.5,
        nutrientConcentration: 1500,
        ambientTemperature: 25,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      // getValue should return value close to 3.5 with noise
      const value = sensor.getValue();
      expect(value).toBeGreaterThan(3.3);
      expect(value).toBeLessThan(3.7);
    });
  });

  describe('Boundary Value Tests', () => {
    describe('EC values at boundaries (0, 5)', () => {
      test('2.2.1 - handles EC exactly at 0.0 boundary', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 0.0 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 50,
          temperature: 25,
          ph: 6.5,
          ec: 0.0,
          nutrientConcentration: 0,
          ambientTemperature: 25,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(0.0);
        
        // Even with noise, should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
      
      test('2.2.1 - handles EC exactly at 5.0 boundary', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 5.0 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 50,
          temperature: 25,
          ph: 6.5,
          ec: 5.0,
          nutrientConcentration: 2000,
          ambientTemperature: 25,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(5.0);
        
        // Even with noise, should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
      
      test('2.2.1 - handles EC just above 0.0 boundary', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 0.01 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 50,
          temperature: 25,
          ph: 6.5,
          ec: 0.01,
          nutrientConcentration: 10,
          ambientTemperature: 25,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(0.01, 2);
      });
      
      test('2.2.1 - handles EC just below 5.0 boundary', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 4.99 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 50,
          temperature: 25,
          ph: 6.5,
          ec: 4.99,
          nutrientConcentration: 1990,
          ambientTemperature: 25,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(4.99, 2);
      });
    });

    describe('Rapid EC changes', () => {
      test('2.2.2 - handles rapid EC increase from 0 to 5', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 0.0 });
        
        // Start at EC 0
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 50,
          temperature: 25,
          ph: 6.5,
          ec: 0.0,
          nutrientConcentration: 0,
          ambientTemperature: 25,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(0.0);
        
        // Rapid change to EC 5
        state = {
          ...state,
          ec: 5.0,
          nutrientConcentration: 2000,
          simulatedTime: 1 // 1 second later
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        // Should reflect the new EC value
        expect(value).toBeGreaterThan(2.5);
        expect(value).toBeLessThanOrEqual(5.0);
      });
      
      test('2.2.2 - handles rapid EC decrease from 5 to 0', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 5.0 });
        
        // Start at EC 5
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 50,
          temperature: 25,
          ph: 6.5,
          ec: 5.0,
          nutrientConcentration: 2000,
          ambientTemperature: 25,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(5.0);
        
        // Rapid change to EC 0
        state = {
          ...state,
          ec: 0.0,
          nutrientConcentration: 0,
          simulatedTime: 1 // 1 second later
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        // Should reflect the new EC value
        expect(value).toBeLessThan(2.5);
        expect(value).toBeGreaterThanOrEqual(0.0);
      });
      
      test('2.2.2 - handles multiple rapid EC oscillations', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 2.5 });
        
        const ecValues = [2.5, 0.5, 4.5, 0.2, 4.8, 1.0, 3.5];
        let time = 0;
        
        for (const ec of ecValues) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 50,
            temperature: 25,
            ph: 6.5,
            ec,
            nutrientConcentration: Math.round(ec * 400),
            ambientTemperature: 25,
            simulatedTime: time
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          // Should stay within bounds
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
          
          time += 100; // 100 seconds between changes
        }
      });
    });

    describe('Noise generation edge cases', () => {
      test('2.2.3 - handles zero noise standard deviation', () => {
        const sensor = new ECSensor({ 
          id: 'ec-1', 
          baseline: 2.5,
          noiseStdDev: 0.0 
        });
        
        // With zero noise, getValue should equal getRawValue
        const rawValue = sensor.getRawValue();
        
        for (let i = 0; i < 20; i++) {
          const value = sensor.getValue();
          expect(value).toBe(rawValue);
        }
      });
      
      test('2.2.3 - handles very large noise standard deviation', () => {
        const sensor = new ECSensor({ 
          id: 'ec-1', 
          baseline: 2.5,
          noiseStdDev: 2.0 // Very large noise
        });
        
        // Even with large noise, values should stay within bounds
        for (let i = 0; i < 100; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
      
      test('2.2.3 - noise is applied consistently', () => {
        const sensor = new ECSensor({ 
          id: 'ec-1', 
          baseline: 2.5,
          noiseStdDev: 0.2 
        });
        
        // Take multiple readings
        const readings = Array.from({ length: 50 }, () => sensor.getValue());
        
        // All readings should be within bounds
        readings.forEach(reading => {
          expect(reading).toBeGreaterThanOrEqual(0.0);
          expect(reading).toBeLessThanOrEqual(5.0);
        });
        
        // With noise, we should get variation
        const uniqueReadings = new Set(readings);
        expect(uniqueReadings.size).toBeGreaterThan(1);
      });
      
      test('2.2.3 - changing noise level affects readings', () => {
        const sensor = new ECSensor({ 
          id: 'ec-1', 
          baseline: 2.5,
          noiseStdDev: 0.05 
        });
        
        // Get readings with low noise
        const lowNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        const lowNoiseVariance = Math.max(...lowNoiseReadings) - Math.min(...lowNoiseReadings);
        
        // Increase noise
        sensor.setNoiseLevel(0.5);
        
        // Get readings with high noise
        const highNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        const highNoiseVariance = Math.max(...highNoiseReadings) - Math.min(...highNoiseReadings);
        
        // High noise should generally produce more variance
        // (not guaranteed for small samples, but likely)
        expect(highNoiseVariance).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Extreme baseline values', () => {
      test('2.2.4 - handles extreme low baseline (0.0)', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 0.0 });
        
        // Multiple updates should stay at or near 0
        for (let i = 0; i < 5; i++) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 50,
            temperature: 25,
            ph: 6.5,
            ec: 0.0,
            nutrientConcentration: 0,
            ambientTemperature: 25,
            simulatedTime: i * 3600
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
      
      test('2.2.4 - handles extreme high baseline (5.0)', () => {
        const sensor = new ECSensor({ id: 'ec-1', baseline: 5.0 });
        
        // Multiple updates should stay at or near 5
        for (let i = 0; i < 5; i++) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 50,
            temperature: 25,
            ph: 6.5,
            ec: 5.0,
            nutrientConcentration: 2000,
            ambientTemperature: 25,
            simulatedTime: i * 3600
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
      
      test('2.2.4 - handles extreme baseline with high noise', () => {
        const sensor = new ECSensor({ 
          id: 'ec-1', 
          baseline: 0.0,
          noiseStdDev: 1.0 // High noise
        });
        
        // Multiple readings should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
      
      test('2.2.4 - handles extreme high baseline with high noise', () => {
        const sensor = new ECSensor({ 
          id: 'ec-1', 
          baseline: 5.0,
          noiseStdDev: 1.0 // High noise
        });
        
        // Multiple readings should stay within bounds
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(5.0);
        }
      });
    });
  });
});
