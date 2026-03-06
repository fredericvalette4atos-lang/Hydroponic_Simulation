/**
 * Unit tests for noise generation utilities
 */

import { generateGaussianNoise, clamp } from '../../../src/utils/noise-generator';

describe('Noise Generator Utilities', () => {
  describe('generateGaussianNoise()', () => {
    test('generates values around mean', () => {
      const mean = 5.0;
      const stddev = 1.0;
      const samples = 1000;
      
      const values = Array.from({ length: samples }, () => 
        generateGaussianNoise(mean, stddev)
      );
      
      const average = values.reduce((sum, v) => sum + v, 0) / samples;
      
      // Average should be close to mean (within 0.2 for 1000 samples)
      expect(average).toBeGreaterThan(mean - 0.2);
      expect(average).toBeLessThan(mean + 0.2);
    });
    
    test('generates values with correct spread', () => {
      const mean = 0;
      const stddev = 1.0;
      const samples = 1000;
      
      const values = Array.from({ length: samples }, () => 
        generateGaussianNoise(mean, stddev)
      );
      
      // Calculate sample standard deviation
      const avg = values.reduce((sum, v) => sum + v, 0) / samples;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / samples;
      const sampleStdDev = Math.sqrt(variance);
      
      // Sample stddev should be close to target stddev (within 0.15 for 1000 samples)
      expect(sampleStdDev).toBeGreaterThan(stddev - 0.15);
      expect(sampleStdDev).toBeLessThan(stddev + 0.15);
    });
    
    test('generates different values on each call', () => {
      const values = Array.from({ length: 10 }, () => generateGaussianNoise());
      const uniqueValues = new Set(values);
      
      // Should have multiple unique values (very unlikely to get duplicates)
      expect(uniqueValues.size).toBeGreaterThan(5);
    });
    
    test('uses default parameters (mean=0, stddev=1)', () => {
      const samples = 1000;
      const values = Array.from({ length: samples }, () => generateGaussianNoise());
      
      const average = values.reduce((sum, v) => sum + v, 0) / samples;
      
      // Average should be close to 0
      expect(average).toBeGreaterThan(-0.2);
      expect(average).toBeLessThan(0.2);
    });
    
    test('handles zero standard deviation', () => {
      const mean = 5.0;
      const value = generateGaussianNoise(mean, 0);
      
      // With zero stddev, should return exactly the mean
      expect(value).toBe(mean);
    });
    
    test('handles negative mean', () => {
      const mean = -10.0;
      const stddev = 1.0;
      const value = generateGaussianNoise(mean, stddev);
      
      // Should generate values around negative mean
      expect(value).toBeGreaterThan(mean - 5);
      expect(value).toBeLessThan(mean + 5);
    });
  });
  
  describe('clamp()', () => {
    test('returns value when within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
    
    test('clamps to minimum when below', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-0.1, 0, 10)).toBe(0);
    });
    
    test('clamps to maximum when above', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(10.1, 0, 10)).toBe(10);
    });
    
    test('handles negative bounds', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
    
    test('handles floating point values', () => {
      expect(clamp(5.5, 0.0, 10.0)).toBe(5.5);
      expect(clamp(0.1, 0.5, 10.0)).toBe(0.5);
      expect(clamp(9.9, 0.0, 9.5)).toBe(9.5);
    });
    
    test('handles equal min and max', () => {
      expect(clamp(5, 7, 7)).toBe(7);
      expect(clamp(7, 7, 7)).toBe(7);
      expect(clamp(10, 7, 7)).toBe(7);
    });
  });
});
