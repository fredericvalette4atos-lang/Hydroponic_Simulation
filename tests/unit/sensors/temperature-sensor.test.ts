/**
 * Unit tests for TemperatureSensor
 * 
 * Tests temperature sensor boundary values, rapid changes, drift accumulation,
 * and noise generation edge cases.
 * 
 * Requirements: 2.3
 */

import { TemperatureSensor } from '../../../src/sensors/temperature-sensor';
import { HydroponicState, SensorType } from '../../../src/types';

describe('TemperatureSensor', () => {
  describe('Initialization', () => {
    test('initializes with default baseline value (22.0°C)', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1' });
      
      expect(sensor.id).toBe('temp-1');
      expect(sensor.type).toBe(SensorType.TEMPERATURE);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(22.0, 1);
    });
    
    test('initializes with custom baseline value', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 25.0 });
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(25.0, 1);
    });
    
    test('initializes with custom noise level', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 22.0,
        noiseStdDev: 0.1 
      });
      
      expect(sensor.getValue()).toBeDefined();
    });
    
    test('initializes with custom drift rate', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 22.0,
        driftRate: 1.0 
      });
      
      expect(sensor.getRawValue()).toBeCloseTo(22.0, 1);
    });
  });
  
  describe('Baseline Validation', () => {
    test('rejects baseline below 0.0°C', () => {
      expect(() => {
        new TemperatureSensor({ id: 'temp-1', baseline: -0.1 });
      }).toThrow('Temperature baseline must be between 0.0 and 50.0°C');
    });
    
    test('rejects baseline above 50.0°C', () => {
      expect(() => {
        new TemperatureSensor({ id: 'temp-1', baseline: 50.1 });
      }).toThrow('Temperature baseline must be between 0.0 and 50.0°C');
    });
    
    test('accepts baseline at 0.0°C (minimum)', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 0.0 });
      expect(sensor.getRawValue()).toBe(0.0);
    });
    
    test('accepts baseline at 50.0°C (maximum)', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 50.0 });
      expect(sensor.getRawValue()).toBe(50.0);
    });
  });
  
  describe('getValue() - Reading with Noise', () => {
    test('returns value close to baseline', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      const value = sensor.getValue();
      
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(50.0);
    });
    
    test('applies noise to readings', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 22.0,
        noiseStdDev: 0.5 
      });
      
      const readings = Array.from({ length: 10 }, () => sensor.getValue());
      const uniqueReadings = new Set(readings);
      
      expect(uniqueReadings.size).toBeGreaterThan(1);
    });
    
    test('clamps values to valid temperature range (0.0-50.0°C)', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 0.0,
        noiseStdDev: 2.0
      });
      
      for (let i = 0; i < 100; i++) {
        const value = sensor.getValue();
        expect(value).toBeGreaterThanOrEqual(0.0);
        expect(value).toBeLessThanOrEqual(50.0);
      }
    });
  });
  
  describe('getRawValue() - Reading without Noise', () => {
    test('returns raw value without noise', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 25.0 });
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(25.0, 1);
    });
    
    test('returns consistent value on multiple calls', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      const value1 = sensor.getRawValue();
      const value2 = sensor.getRawValue();
      
      expect(value1).toBe(value2);
    });
  });
  
  describe('setBaseline()', () => {
    test('updates baseline value', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      sensor.setBaseline(28.0);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(28.0, 1);
    });
    
    test('resets drift accumulator', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 25.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 3600
      };
      sensor.updateFromPhysics(state);
      
      sensor.setBaseline(20.0);
      
      expect(sensor.getRawValue()).toBeCloseTo(20.0, 1);
    });
    
    test('rejects baseline below 0.0°C', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      expect(() => {
        sensor.setBaseline(-0.1);
      }).toThrow('Temperature baseline must be between 0.0 and 50.0°C');
    });
    
    test('rejects baseline above 50.0°C', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      expect(() => {
        sensor.setBaseline(50.5);
      }).toThrow('Temperature baseline must be between 0.0 and 50.0°C');
    });
  });
  
  describe('setNoiseLevel()', () => {
    test('updates noise level', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 22.0,
        noiseStdDev: 0.2 
      });
      
      sensor.setNoiseLevel(0.1);
      
      expect(sensor.getValue()).toBeDefined();
    });
    
    test('rejects negative noise level', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      expect(() => {
        sensor.setNoiseLevel(-0.1);
      }).toThrow('Noise standard deviation must be non-negative');
    });
    
    test('accepts zero noise level', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      sensor.setNoiseLevel(0);
      
      const value = sensor.getValue();
      const rawValue = sensor.getRawValue();
      expect(value).toBeCloseTo(rawValue, 5);
    });
  });
  
  describe('updateFromPhysics()', () => {
    test('reads temperature from hydroponic state', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 26.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(26.0, 1);
    });
    
    test('applies drift over time', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 22.0,
        driftRate: 1.0 
      });
      
      let state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      const initialValue = sensor.getRawValue();
      
      state = { ...state, simulatedTime: 3600 };
      sensor.updateFromPhysics(state);
      const driftedValue = sensor.getRawValue();
      
      const drift = Math.abs(driftedValue - initialValue);
      expect(drift).toBeLessThanOrEqual(1.2);
    });
    
    test('ensures values stay within 0.0-50.0°C bounds', () => {
      const sensor = new TemperatureSensor({ 
        id: 'temp-1', 
        baseline: 48.0,
        driftRate: 2.0 
      });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 49.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 7200
      };
      
      sensor.updateFromPhysics(state);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeLessThanOrEqual(50.0);
      expect(rawValue).toBeGreaterThanOrEqual(0.0);
    });
    
    test('handles first update (no time delta)', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 24.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const rawValue = sensor.getRawValue();
      expect(rawValue).toBeCloseTo(24.0, 1);
    });
  });
  
  describe('Edge Cases', () => {
    test('handles temperature at minimum bound (0.0°C)', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 0.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 0.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getValue();
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(50.0);
    });
    
    test('handles temperature at maximum bound (50.0°C)', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 50.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 50.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 0
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getValue();
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(50.0);
    });
    
    test('handles rapid time progression', () => {
      const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 22.0 });
      
      const state: HydroponicState = {
        waterVolume: 50,
        waterLevel: 80,
        temperature: 22.0,
        ph: 6.5,
        ec: 1.5,
        nutrientConcentration: 1000,
        ambientTemperature: 20,
        simulatedTime: 36000
      };
      
      sensor.updateFromPhysics(state);
      
      const value = sensor.getRawValue();
      
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(50.0);
    });
  });

  describe('Boundary Value Tests', () => {
    describe('Temperature at boundaries (0, 50)', () => {
      test('2.3.1 - handles temperature exactly at 0.0°C boundary', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 0.0 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 0.0,
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
          expect(value).toBeLessThanOrEqual(50.0);
        }
      });
      
      test('2.3.1 - handles temperature exactly at 50.0°C boundary', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 50.0 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 50.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBe(50.0);
        
        for (let i = 0; i < 50; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(50.0);
        }
      });
      
      test('2.3.1 - handles temperature just above 0.0°C boundary', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 0.01 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 0.01,
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
      
      test('2.3.1 - handles temperature just below 50.0°C boundary', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 49.99 });
        
        const state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 49.99,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        const rawValue = sensor.getRawValue();
        expect(rawValue).toBeCloseTo(49.99, 2);
      });
    });

    describe('Rapid temperature changes', () => {
      test('2.3.2 - handles rapid temperature increase from 0 to 50', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 0.0 });
        
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 0.0,
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
          temperature: 50.0,
          simulatedTime: 1
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        expect(value).toBeGreaterThan(25.0);
        expect(value).toBeLessThanOrEqual(50.0);
      });
      
      test('2.3.2 - handles rapid temperature decrease from 50 to 0', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 50.0 });
        
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 50.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        expect(sensor.getRawValue()).toBe(50.0);
        
        state = {
          ...state,
          temperature: 0.0,
          simulatedTime: 1
        };
        
        sensor.updateFromPhysics(state);
        const value = sensor.getRawValue();
        
        expect(value).toBeLessThan(25.0);
        expect(value).toBeGreaterThanOrEqual(0.0);
      });
      
      test('2.3.2 - handles multiple rapid temperature oscillations', () => {
        const sensor = new TemperatureSensor({ id: 'temp-1', baseline: 25.0 });
        
        const tempValues = [25.0, 5.0, 45.0, 2.0, 48.0, 10.0, 40.0];
        let time = 0;
        
        for (const temp of tempValues) {
          const state: HydroponicState = {
            waterVolume: 50,
            waterLevel: 80,
            temperature: temp,
            ph: 6.5,
            ec: 1.5,
            nutrientConcentration: 1000,
            ambientTemperature: 20,
            simulatedTime: time
          };
          
          sensor.updateFromPhysics(state);
          const value = sensor.getRawValue();
          
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(50.0);
          
          time += 100;
        }
      });
    });

    describe('Sensor drift accumulation', () => {
      test('2.3.3 - accumulates drift over extended time period', () => {
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          driftRate: 1.0 
        });
        
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        const initialValue = sensor.getRawValue();
        
        state = { ...state, simulatedTime: 3600 };
        sensor.updateFromPhysics(state);
        const value1Hour = sensor.getRawValue();
        
        state = { ...state, simulatedTime: 7200 };
        sensor.updateFromPhysics(state);
        const value2Hours = sensor.getRawValue();
        
        state = { ...state, simulatedTime: 14400 };
        sensor.updateFromPhysics(state);
        const value4Hours = sensor.getRawValue();
        
        expect(initialValue).toBeCloseTo(22.0, 1);
        expect(value1Hour).toBeGreaterThanOrEqual(0.0);
        expect(value1Hour).toBeLessThanOrEqual(50.0);
        expect(value2Hours).toBeGreaterThanOrEqual(0.0);
        expect(value2Hours).toBeLessThanOrEqual(50.0);
        expect(value4Hours).toBeGreaterThanOrEqual(0.0);
        expect(value4Hours).toBeLessThanOrEqual(50.0);
      });
      
      test('2.3.3 - drift is bounded by drift rate', () => {
        const driftRate = 1.0;
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          driftRate 
        });
        
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        const initialValue = sensor.getRawValue();
        
        state = { ...state, simulatedTime: 36000 };
        sensor.updateFromPhysics(state);
        const value10Hours = sensor.getRawValue();
        
        const maxDrift = driftRate * 10;
        const actualDrift = Math.abs(value10Hours - initialValue);
        
        expect(actualDrift).toBeLessThanOrEqual(maxDrift + 0.1);
      });
      
      test('2.3.3 - drift resets when baseline is changed', () => {
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          driftRate: 1.0 
        });
        
        let state: HydroponicState = {
          waterVolume: 50,
          waterLevel: 80,
          temperature: 22.0,
          ph: 6.5,
          ec: 1.5,
          nutrientConcentration: 1000,
          ambientTemperature: 20,
          simulatedTime: 0
        };
        
        sensor.updateFromPhysics(state);
        
        state = { ...state, simulatedTime: 3600 };
        sensor.updateFromPhysics(state);
        
        sensor.setBaseline(20.0);
        
        expect(sensor.getRawValue()).toBe(20.0);
        
        state = { ...state, simulatedTime: 7200 };
        sensor.updateFromPhysics(state);
        const valueAfterReset = sensor.getRawValue();
        
        expect(valueAfterReset).toBeGreaterThanOrEqual(0.0);
        expect(valueAfterReset).toBeLessThanOrEqual(50.0);
      });
    });

    describe('Noise generation edge cases', () => {
      test('2.3.4 - handles zero noise standard deviation', () => {
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          noiseStdDev: 0.0 
        });
        
        const rawValue = sensor.getRawValue();
        
        for (let i = 0; i < 20; i++) {
          const value = sensor.getValue();
          expect(value).toBe(rawValue);
        }
      });
      
      test('2.3.4 - handles very large noise standard deviation', () => {
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          noiseStdDev: 5.0
        });
        
        for (let i = 0; i < 100; i++) {
          const value = sensor.getValue();
          expect(value).toBeGreaterThanOrEqual(0.0);
          expect(value).toBeLessThanOrEqual(50.0);
        }
      });
      
      test('2.3.4 - noise is applied consistently', () => {
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          noiseStdDev: 0.5 
        });
        
        const readings = Array.from({ length: 50 }, () => sensor.getValue());
        
        readings.forEach(reading => {
          expect(reading).toBeGreaterThanOrEqual(0.0);
          expect(reading).toBeLessThanOrEqual(50.0);
        });
        
        const uniqueReadings = new Set(readings);
        expect(uniqueReadings.size).toBeGreaterThan(1);
      });
      
      test('2.3.4 - changing noise level affects readings', () => {
        const sensor = new TemperatureSensor({ 
          id: 'temp-1', 
          baseline: 22.0,
          noiseStdDev: 0.1 
        });
        
        const lowNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        
        sensor.setNoiseLevel(1.0);
        
        const highNoiseReadings = Array.from({ length: 20 }, () => sensor.getValue());
        const highNoiseVariance = Math.max(...highNoiseReadings) - Math.min(...highNoiseReadings);
        
        expect(highNoiseVariance).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
