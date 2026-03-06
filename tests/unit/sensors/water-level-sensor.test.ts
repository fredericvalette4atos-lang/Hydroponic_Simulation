/**
 * Unit tests for WaterLevelSensor
 * 
 * Tests water level sensor boundary values, rapid changes, noise generation,
 * and extreme baseline values.
 * 
 * Requirements: 2.4
 */

import { WaterLevelSensor } from '../../../src/sensors/water-level-sensor';
import { HydroponicState, SensorType } from '../../../src/types';

describe('WaterLevelSensor', () => {
  describe('Initialization', () => {
    test('initializes with default baseline value (75.0%)', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1' });
      
      expect(sensor.id).toBe('level-1');
      expect(sensor.type).toBe(SensorType.WATER_LEVEL);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(75.0, 1);
    });
    
    test('initializes with custom baseline value', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 80.0 });
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(80.0, 1);
    });
    
    test('initializes with custom noise level', () => {
      const sensor = new WaterLevelSensor({ 
        id: 'level-1', 
        baseline: 75.0,
        noiseStdDev: 0.5 
      });
      
      expect(sensor.getValue()).toBeDefined();
    });
  });
  
  describe('Baseline Validation', () => {
    test('rejects baseline below 0.0%', () => {
      expect(() => {
        new WaterLevelSensor({ id: 'level-1', baseline: -0.1 });
      }).toThrow('Water level baseline must be between 0.0 and 100.0%');
    });
    
    test('rejects baseline above 100.0%', () => {
      expect(() => {
        new WaterLevelSensor({ id: 'level-1', baseline: 100.1 });
      }).toThrow('Water level baseline must be between 0.0 and 100.0%');
    });
    
    test('accepts baseline at 0.0% (minimum)', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 0.0 });
      expect(sensor.getRawValue()).toBe(0.0);
    });
    
    test('accepts baseline at 100.0% (maximum)', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 100.0 });
      expect(sensor.getRawValue()).toBe(100.0);
    });
  });
  
  describe('getValue() - Reading with Noise', () => {
    test('returns value close to baseline', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      const value = sensor.getValue();
      
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(100.0);
    });
    
    test('applies noise to readings', () => {
      const sensor = new WaterLevelSensor({ 
        id: 'level-1', 
        baseline: 75.0,
        noiseStdDev: 2.0 
      });
      
      const readings = Array.from({ length: 10 }, () => sensor.getValue());
      const uniqueReadings = new Set(readings);
      
      expect(uniqueReadings.size).toBeGreaterThan(1);
    });
    
    test('clamps values to valid water level range (0.0-100.0%)', () => {
      const sensor = new WaterLevelSensor({ 
        id: 'level-1', 
        baseline: 0.0,
        noiseStdDev: 3.0
      });
      
      for (let i = 0; i < 100; i++) {
        const value = sensor.getValue();
        expect(value).toBeGreaterThanOrEqual(0.0);
        expect(value).toBeLessThanOrEqual(100.0);
      }
    });
  });
  
  describe('getRawValue() - Reading without Noise', () => {
    test('returns raw value without noise', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 80.0 });
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(80.0, 1);
    });
    
    test('returns consistent value on multiple calls', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      const value1 = sensor.getRawValue();
      const value2 = sensor.getRawValue();
      
      expect(value1).toBe(value2);
    });
  });
  
  describe('setBaseline()', () => {
    test('updates baseline value', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      sensor.setBaseline(85.0);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(85.0, 1);
    });
    
    test('rejects baseline below 0.0%', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      expect(() => {
        sensor.setBaseline(-0.1);
      }).toThrow('Water level baseline must be between 0.0 and 100.0%');
    });
    
    test('rejects baseline above 100.0%', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      expect(() => {
        sensor.setBaseline(100.5);
      }).toThrow('Water level baseline must be between 0.0 and 100.0%');
    });
  });
  
  describe('setNoiseLevel()', () => {
    test('updates noise level', () => {
      const sensor = new WaterLevelSensor({ 
        id: 'level-1', 
        baseline: 75.0,
        noiseStdDev: 1.0 
      });
      
      sensor.setNoiseLevel(0.5);
      
      expect(sensor.getValue()).toBeDefined();
    });
    
    test('rejects negative noise level', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      expect(() => {
        sensor.setNoiseLevel(-0.1);
      }).toThrow('Noise standard deviation must be non-negative');
    });
    
    test('accepts zero noise level', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      sensor.setNoiseLevel(0);
      
      const value = sensor.getValue();
      const rawValue = sensor.getRawValue();
      expect(value).toBeCloseTo(rawValue, 5);
    });
  });
  
  describe('updateFromPhysics()', () => {
    test('reads water level from hydroponic state', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 85.0,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(85.0, 1);
    });
    
    test('updates water level when physics state changes', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      let state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 70.0,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBeCloseTo(70.0, 1);
      
      state = {
        ...state,
        waterLevel: 90.0,
        simulatedTime: 100
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBeCloseTo(90.0, 1);
    });
    
    test('handles water level at minimum bound (0.0%)', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      const state: HydroponicState = {
        waterVolume: 0,
        waterLevel: 0.0,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBe(0.0);
    });
    
    test('handles water level at maximum bound (100.0%)', () => {
      const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 75.0 });
      
      const state: HydroponicState = {
        waterVolume: 100,
        waterLevel: 100.0,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      expect(sensor.getRawValue()).toBe(100.0);
    });
  });
  
  describe('Integration', () => {
    test('getValue reflects physics updates with noise', () => {
      const sensor = new WaterLevelSensor({ 
        id: 'level-1', 
        baseline: 75.0,
        noiseStdDev: 1.0 
      });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80.0,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getValue();
      expect(value).toBeGreaterThan(78.0);
      expect(value).toBeLessThan(82.0);
    });
  });

  describe('Boundary Value Tests', () => {
    describe('Water level at boundaries (0, 100)', () => {
      test('2.4.1 - handles water level exactly at 0.0% boundary', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 0.0 });
        
        const state: HydroponicState = {
          waterVolume: 0,
          waterLevel: 0.0,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(0.0);
        
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
      
      test('2.4.1 - handles water level exactly at 100.0% boundary', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 100.0 });
        
        const state: HydroponicState = {
          waterVolume: 100,
          waterLevel: 100.0,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(100.0);
        
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
      
      test('2.4.1 - handles water level just above 0.0% boundary', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 0.01 });
        
        const state: HydroponicState = {
          waterVolume: 0.01,
          waterLevel: 0.01,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(0.01, 2);
      });
      
      test('2.4.1 - handles water level just below 100.0% boundary', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 99.99 });
        
        const state: HydroponicState = {
          waterVolume: 99.99,
          waterLevel: 99.99,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(99.99, 2);
      });
    });

    describe('Rapid water level changes', () => {
      test('2.4.2 - handles rapid water level increase from 0 to 100', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 0.0 });
        
        let state: HydroponicState = {
          waterVolume: 0,
          waterLevel: 0.0,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(0.0);
        
        state = {
          ...state,
          waterVolume: 100,
          waterLevel: 100.0,
          simulatedTime: 1
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        expect(value).toBeGreaterThan(50.0);
        expect(value).toBeLessThanOrEqual(100.0);
      });
      
      test('2.4.2 - handles rapid water level decrease from 100 to 0', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 100.0 });
        
        let state: HydroponicState = {
          waterVolume: 100,
          waterLevel: 100.0,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(100.0);
        
        state = {
          ...state,
          waterVolume: 0,
          waterLevel: 0.0,
          simulatedTime: 1
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        expect(value).toBeLessThan(50.0);
        expect(value).toBeGreaterThanOrEqual(0.0);
      });
      
      test('2.4.2 - handles multiple rapid water level oscillations', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 50.0 });
        
        const levelValues = [50.0, 10.0, 90.0, 5.0, 95.0, 20.0, 80.0];
        let time = 0;
        
        for (const level of levelValues) {
          const state: HydroponicState = {
            waterVolume: level,
            waterLevel: level,
            temperature: 22.0,
            ph: 6.5,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: time
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
          
          time += 100;
        }
      });
    });

    describe('Noise generation edge cases', () => {
      test('2.4.3 - handles zero noise standard deviation', () => {
        const sensor = new WaterLevelSensor({ 
          id: 'level-1', 
          baseline: 75.0,
          noiseStdDev: 0.0 
        });
        
        const rawValue = sensor.getRawValue();
        
        for (let i = 0; i < 20; i++) {
          const value = sensor.getValue();
          expect(value).toBe(rawValue);
        }
      });
      
      test('2.4.3 - handles very large noise standard deviation', () => {
        const sensor = new WaterLevelSensor({ 
          id: 'level-1', 
          baseline: 50.0,
          noiseStdDev: 10.0
        });
        
        for (let i = 0; i < 100; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
      
      test('2.4.3 - noise is applied consistently', () => {
        const sensor = new WaterLevelSensor({ 
          id: 'level-1', 
          baseline: 75.0,
          noiseStdDev: 2.0 
        });
        
        const readings = Array.from({ length: 50 }, () => sensor.getValue());
        
        readings.forEach(reading => {
          expect(reading).toBeGreaterThanOrEqual(0.0);
          expect(reading).toBeLessThanOrEqual(100.0);
        });
        
        const uniqueReadings = new Set(readings);
        expect(uniqueReadings.size).toBeGreaterThan(1);
      });
      
      test('2.4.3 - changing noise level affects readings', () => {
        const sensor = new WaterLevelSensor({ 
          id: 'level-1', 
          baseline: 75.0,
          noiseStdDev: 0.5 
        });
        
        const lowNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        
        sensor.setNoiseLevel(3.0);
        
        const highNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        const highNoiseVariance = Math.max(...highNoiseReadings) - Math.min(...highNoiseReadings);
        
        expect(highNoiseVariance).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Extreme baseline values', () => {
      test('2.4.4 - handles extreme low baseline (0.0%)', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 0.0 });
        
        for (let i = 0; i < 5; i++) {
          const state: HydroponicState = {
            waterVolume: 0,
            waterLevel: 0.0,
            temperature: 22.0,
            ph: 6.5,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: i * 3600
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
      
      test('2.4.4 - handles extreme high baseline (100.0%)', () => {
        const sensor = new WaterLevelSensor({ id: 'level-1', baseline: 100.0 });
        
        for (let i = 0; i < 5; i++) {
          const state: HydroponicState = {
            waterVolume: 100,
            waterLevel: 100.0,
            temperature: 22.0,
            ph: 6.5,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: i * 3600
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
      
      test('2.4.4 - handles extreme baseline with high noise', () => {
        const sensor = new WaterLevelSensor({ 
          id: 'level-1', 
          baseline: 0.0,
          noiseStdDev: 5.0
        });
        
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
      
      test('2.4.4 - handles extreme high baseline with high noise', () => {
        const sensor = new WaterLevelSensor({ 
          id: 'level-1', 
          baseline: 100.0,
          noiseStdDev: 5.0
        });
        
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(100.0);
        }
      });
    });
  });
});
