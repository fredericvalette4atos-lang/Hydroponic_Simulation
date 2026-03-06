/**
 * Unit tests for ChemistryModel
 * 
 * Tests specific examples and edge cases for chemistry calculations
 */

import { ChemistryModelImpl } from '../../../src/physics/chemistry-model';

describe('ChemistryModel', () => {
  let chemistryModel: ChemistryModelImpl;
  
  beforeEach(() => {
    chemistryModel = new ChemistryModelImpl();
  });
  
  describe('calculatePHFromTemperature', () => {
    test('pH decreases when temperature increases above reference (25°C)', () => {
      const initialPH = 7.0;
      const temperature = 30.0; // 5 degrees above reference
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(initialPH, temperature);
      
      // Should decrease by 0.01 per degree: 7.0 - (5 * 0.01) = 6.95
      expect(adjustedPH).toBeCloseTo(6.95, 2);
    });
    
    test('pH increases when temperature decreases below reference (25°C)', () => {
      const initialPH = 7.0;
      const temperature = 20.0; // 5 degrees below reference
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(initialPH, temperature);
      
      // Should increase by 0.01 per degree: 7.0 - (-5 * 0.01) = 7.05
      expect(adjustedPH).toBeCloseTo(7.05, 2);
    });
    
    test('pH unchanged at reference temperature', () => {
      const initialPH = 6.5;
      const temperature = 25.0;
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(initialPH, temperature);
      
      expect(adjustedPH).toBeCloseTo(6.5, 2);
    });
  });
  
  describe('applyPHBuffer', () => {
    test('buffering resists pH drift from neutral', () => {
      const ph = 8.0; // 1 unit above neutral
      const bufferCapacity = 0.5;
      
      const bufferedPH = chemistryModel.applyPHBuffer(ph, bufferCapacity);
      
      // Should move toward neutral: 8.0 - (1.0 * 0.5 * 0.1) = 7.95
      expect(bufferedPH).toBeCloseTo(7.95, 2);
      expect(bufferedPH).toBeLessThan(ph);
    });
    
    test('higher buffer capacity resists change more', () => {
      const ph = 8.0;
      const lowBuffer = chemistryModel.applyPHBuffer(ph, 0.3);
      const highBuffer = chemistryModel.applyPHBuffer(ph, 0.9);
      
      // Higher buffer should move more toward neutral
      expect(highBuffer).toBeLessThan(lowBuffer);
    });
    
    test('zero buffer capacity has no effect', () => {
      const ph = 8.0;
      const bufferedPH = chemistryModel.applyPHBuffer(ph, 0);
      
      expect(bufferedPH).toBeCloseTo(ph, 2);
    });
  });
  
  describe('calculatePHFromNutrientAddition', () => {
    test('acidic nutrients decrease pH', () => {
      const initialPH = 7.0;
      const amount = 1.0;
      
      const newPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'acidic', amount);
      
      expect(newPH).toBeLessThan(initialPH);
      expect(newPH).toBeCloseTo(6.9, 1);
    });
    
    test('basic nutrients increase pH', () => {
      const initialPH = 6.0;
      const amount = 1.0;
      
      const newPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'basic', amount);
      
      expect(newPH).toBeGreaterThan(initialPH);
      expect(newPH).toBeCloseTo(6.1, 1);
    });
    
    test('neutral nutrients have minimal effect', () => {
      const initialPH = 6.5;
      const amount = 1.0;
      
      const newPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'neutral', amount);
      
      expect(newPH).toBeCloseTo(initialPH, 2);
    });
    
    test('pH stays within valid range (0-14)', () => {
      const highPH = 13.5;
      const lowPH = 0.5;
      
      const tooHigh = chemistryModel.calculatePHFromNutrientAddition(highPH, 'basic', 10);
      const tooLow = chemistryModel.calculatePHFromNutrientAddition(lowPH, 'acidic', 10);
      
      expect(tooHigh).toBeLessThanOrEqual(14);
      expect(tooLow).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('calculateECFromNutrients', () => {
    test('EC increases with nutrient concentration', () => {
      const lowConcentration = 320; // ppm
      const highConcentration = 1280; // ppm
      
      const lowEC = chemistryModel.calculateECFromNutrients(lowConcentration);
      const highEC = chemistryModel.calculateECFromNutrients(highConcentration);
      
      expect(highEC).toBeGreaterThan(lowEC);
    });
    
    test('EC calculation uses correct conversion factor', () => {
      const concentration = 640; // ppm
      
      const ec = chemistryModel.calculateECFromNutrients(concentration);
      
      // 640 ppm / 640 conversion factor = 1.0 mS/cm
      expect(ec).toBeCloseTo(1.0, 2);
    });
    
    test('EC stays within valid range (0-5.0)', () => {
      const veryHighConcentration = 10000; // ppm
      
      const ec = chemistryModel.calculateECFromNutrients(veryHighConcentration);
      
      expect(ec).toBeLessThanOrEqual(5.0);
      expect(ec).toBeGreaterThanOrEqual(0);
    });
    
    test('zero concentration gives zero EC', () => {
      const ec = chemistryModel.calculateECFromNutrients(0);
      
      expect(ec).toBe(0);
    });
  });
  
  describe('calculateECFromDilution', () => {
    test('EC decreases proportionally with dilution', () => {
      const initialEC = 2.0;
      const volumeBefore = 10; // liters
      const volumeAfter = 20; // liters (doubled)
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      // EC should be halved: 2.0 * (10/20) = 1.0
      expect(newEC).toBeCloseTo(1.0, 2);
    });
    
    test('no dilution keeps EC unchanged', () => {
      const initialEC = 1.5;
      const volume = 15;
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volume, volume);
      
      expect(newEC).toBeCloseTo(initialEC, 2);
    });
    
    test('handles zero volume after gracefully', () => {
      const initialEC = 2.0;
      const volumeBefore = 10;
      const volumeAfter = 0;
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      // Should return original EC when volumeAfter is 0
      expect(newEC).toBe(initialEC);
    });
    
    test('EC stays within valid range after dilution', () => {
      const initialEC = 5.0;
      const volumeBefore = 100;
      const volumeAfter = 1; // Extreme concentration
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      expect(newEC).toBeLessThanOrEqual(5.0);
    });
  });
  
  describe('isNutrientLockout', () => {
    test('no lockout in optimal range (5.5-6.5)', () => {
      expect(chemistryModel.isNutrientLockout(5.5)).toBe(false);
      expect(chemistryModel.isNutrientLockout(6.0)).toBe(false);
      expect(chemistryModel.isNutrientLockout(6.5)).toBe(false);
    });
    
    test('lockout below optimal range', () => {
      expect(chemistryModel.isNutrientLockout(5.4)).toBe(true);
      expect(chemistryModel.isNutrientLockout(5.0)).toBe(true);
      expect(chemistryModel.isNutrientLockout(4.0)).toBe(true);
    });
    
    test('lockout above optimal range', () => {
      expect(chemistryModel.isNutrientLockout(6.6)).toBe(true);
      expect(chemistryModel.isNutrientLockout(7.0)).toBe(true);
      expect(chemistryModel.isNutrientLockout(8.0)).toBe(true);
    });
  });
  
  describe('getLockoutFactor', () => {
    test('optimal range returns 1.0', () => {
      expect(chemistryModel.getLockoutFactor(5.5)).toBe(1.0);
      expect(chemistryModel.getLockoutFactor(6.0)).toBe(1.0);
      expect(chemistryModel.getLockoutFactor(6.5)).toBe(1.0);
    });
    
    test('moderate lockout returns 0.75', () => {
      expect(chemistryModel.getLockoutFactor(5.0)).toBe(0.75);
      expect(chemistryModel.getLockoutFactor(5.4)).toBe(0.75);
      expect(chemistryModel.getLockoutFactor(6.6)).toBe(0.75);
      expect(chemistryModel.getLockoutFactor(7.0)).toBe(0.75);
    });
    
    test('severe lockout returns 0.5', () => {
      expect(chemistryModel.getLockoutFactor(4.9)).toBe(0.5);
      expect(chemistryModel.getLockoutFactor(4.0)).toBe(0.5);
      expect(chemistryModel.getLockoutFactor(7.1)).toBe(0.5);
      expect(chemistryModel.getLockoutFactor(8.0)).toBe(0.5);
    });
  });
  
  describe('Edge Cases - Extreme pH Values', () => {
    test('handles pH of 0 (extremely acidic)', () => {
      const lockout = chemistryModel.isNutrientLockout(0);
      const factor = chemistryModel.getLockoutFactor(0);
      
      expect(lockout).toBe(true);
      expect(factor).toBe(0.5); // Severe lockout
    });
    
    test('handles pH of 14 (extremely alkaline)', () => {
      const lockout = chemistryModel.isNutrientLockout(14);
      const factor = chemistryModel.getLockoutFactor(14);
      
      expect(lockout).toBe(true);
      expect(factor).toBe(0.5); // Severe lockout
    });
    
    test('handles negative pH values', () => {
      const ph = -1.0;
      const lockout = chemistryModel.isNutrientLockout(ph);
      const factor = chemistryModel.getLockoutFactor(ph);
      
      expect(lockout).toBe(true);
      expect(factor).toBe(0.5); // Severe lockout
    });
    
    test('handles pH values greater than 14', () => {
      const ph = 15.0;
      const lockout = chemistryModel.isNutrientLockout(ph);
      const factor = chemistryModel.getLockoutFactor(ph);
      
      expect(lockout).toBe(true);
      expect(factor).toBe(0.5); // Severe lockout
    });
    
    test('temperature adjustment with extreme pH values', () => {
      const extremeHighPH = 14.0;
      const extremeLowPH = 0.0;
      const temperature = 30.0;
      
      const adjustedHigh = chemistryModel.calculatePHFromTemperature(extremeHighPH, temperature);
      const adjustedLow = chemistryModel.calculatePHFromTemperature(extremeLowPH, temperature);
      
      // Should still calculate adjustment even at extremes
      expect(adjustedHigh).toBeCloseTo(13.95, 2);
      expect(adjustedLow).toBeCloseTo(-0.05, 2);
    });
  });
  
  describe('Edge Cases - Zero Temperature', () => {
    test('handles zero temperature (0°C)', () => {
      const ph = 7.0;
      const temperature = 0.0;
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temperature);
      
      // 25 degrees below reference: 7.0 - (-25 * 0.01) = 7.25
      expect(adjustedPH).toBeCloseTo(7.25, 2);
    });
    
    test('handles negative temperature', () => {
      const ph = 6.5;
      const temperature = -10.0;
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temperature);
      
      // 35 degrees below reference: 6.5 - (-35 * 0.01) = 6.85
      expect(adjustedPH).toBeCloseTo(6.85, 2);
    });
    
    test('handles extreme high temperature (50°C)', () => {
      const ph = 7.0;
      const temperature = 50.0;
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temperature);
      
      // 25 degrees above reference: 7.0 - (25 * 0.01) = 6.75
      expect(adjustedPH).toBeCloseTo(6.75, 2);
    });
  });
  
  describe('Edge Cases - Zero Concentration', () => {
    test('zero nutrient concentration gives zero EC', () => {
      const ec = chemistryModel.calculateECFromNutrients(0);
      
      expect(ec).toBe(0);
    });
    
    test('negative concentration is clamped to zero EC', () => {
      const ec = chemistryModel.calculateECFromNutrients(-100);
      
      expect(ec).toBeGreaterThanOrEqual(0);
    });
    
    test('zero amount of nutrient addition has no pH effect', () => {
      const initialPH = 6.5;
      
      const acidicPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'acidic', 0);
      const basicPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'basic', 0);
      
      expect(acidicPH).toBeCloseTo(initialPH, 2);
      expect(basicPH).toBeCloseTo(initialPH, 2);
    });
    
    test('zero volume before in dilution calculation', () => {
      const initialEC = 2.0;
      const volumeBefore = 0;
      const volumeAfter = 10;
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      // Should result in zero EC (0/10 = 0)
      expect(newEC).toBe(0);
    });
  });
  
  describe('Edge Cases - Extreme Concentrations', () => {
    test('extremely high nutrient concentration is capped at max EC', () => {
      const veryHighConcentration = 100000; // 100,000 ppm
      
      const ec = chemistryModel.calculateECFromNutrients(veryHighConcentration);
      
      expect(ec).toBe(5.0); // Capped at maximum
    });
    
    test('extreme concentration in dilution calculation', () => {
      const initialEC = 5.0;
      const volumeBefore = 100;
      const volumeAfter = 0.1; // Extreme concentration (1000x)
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      expect(newEC).toBe(5.0); // Should be capped at maximum
    });
    
    test('large nutrient addition is bounded by pH limits', () => {
      const initialPH = 7.0;
      const largeAmount = 100;
      
      const acidicPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'acidic', largeAmount);
      const basicPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'basic', largeAmount);
      
      expect(acidicPH).toBeGreaterThanOrEqual(0);
      expect(acidicPH).toBeLessThanOrEqual(14);
      expect(basicPH).toBeGreaterThanOrEqual(0);
      expect(basicPH).toBeLessThanOrEqual(14);
    });
  });
  
  describe('Known Chemical Relationships', () => {
    test('pH-temperature relationship follows expected coefficient', () => {
      const ph = 7.0;
      const tempIncrease = 10.0; // 10 degrees above reference
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, 25 + tempIncrease);
      
      // Expected: 7.0 - (10 * 0.01) = 6.9
      expect(adjustedPH).toBeCloseTo(6.9, 2);
    });
    
    test('EC-concentration relationship is linear', () => {
      const concentration1 = 640; // ppm
      const concentration2 = 1280; // ppm (double)
      
      const ec1 = chemistryModel.calculateECFromNutrients(concentration1);
      const ec2 = chemistryModel.calculateECFromNutrients(concentration2);
      
      // EC should double when concentration doubles
      expect(ec2).toBeCloseTo(ec1 * 2, 2);
    });
    
    test('dilution follows inverse relationship', () => {
      const initialEC = 2.0;
      const initialVolume = 10;
      
      // Test various dilution ratios
      const diluted2x = chemistryModel.calculateECFromDilution(initialEC, initialVolume, initialVolume * 2);
      const diluted3x = chemistryModel.calculateECFromDilution(initialEC, initialVolume, initialVolume * 3);
      
      expect(diluted2x).toBeCloseTo(initialEC / 2, 2);
      expect(diluted3x).toBeCloseTo(initialEC / 3, 2);
    });
    
    test('buffering effect is proportional to buffer capacity', () => {
      const ph = 8.0; // 1 unit above neutral
      
      const buffer25 = chemistryModel.applyPHBuffer(ph, 0.25);
      const buffer50 = chemistryModel.applyPHBuffer(ph, 0.50);
      const buffer75 = chemistryModel.applyPHBuffer(ph, 0.75);
      
      // Higher buffer capacity should result in more movement toward neutral
      const drift25 = ph - buffer25;
      const drift50 = ph - buffer50;
      const drift75 = ph - buffer75;
      
      expect(drift50).toBeCloseTo(drift25 * 2, 2);
      expect(drift75).toBeCloseTo(drift25 * 3, 2);
    });
    
    test('nutrient lockout thresholds match hydroponic standards', () => {
      // Optimal range for hydroponics is 5.5-6.5
      expect(chemistryModel.getLockoutFactor(5.5)).toBe(1.0);
      expect(chemistryModel.getLockoutFactor(6.5)).toBe(1.0);
      
      // Moderate lockout at boundaries
      expect(chemistryModel.getLockoutFactor(5.0)).toBe(0.75);
      expect(chemistryModel.getLockoutFactor(7.0)).toBe(0.75);
      
      // Severe lockout outside safe range
      expect(chemistryModel.getLockoutFactor(4.5)).toBe(0.5);
      expect(chemistryModel.getLockoutFactor(7.5)).toBe(0.5);
    });
  });

  /**
   * pH Buffer Saturation Tests
   * Tests buffer behavior at saturation limits
   * Requirements: 6.2.1
   */
  describe('pH Buffer Saturation', () => {
    test('should handle zero buffer capacity', () => {
      const ph = 8.0;
      const bufferedPH = chemistryModel.applyPHBuffer(ph, 0);
      
      // No buffering effect
      expect(bufferedPH).toBeCloseTo(ph, 2);
    });

    test('should handle maximum buffer capacity', () => {
      const ph = 8.0;
      const bufferedPH = chemistryModel.applyPHBuffer(ph, 1.0);
      
      // Maximum buffering effect
      expect(bufferedPH).toBeLessThan(ph);
      expect(bufferedPH).toBeGreaterThan(7.0);
    });

    test('should handle extreme pH with strong buffering', () => {
      const extremePH = 13.0;
      const bufferedPH = chemistryModel.applyPHBuffer(extremePH, 0.9);
      
      // Should move significantly toward neutral
      expect(bufferedPH).toBeLessThan(extremePH);
      expect(bufferedPH).toBeGreaterThanOrEqual(0);
      expect(bufferedPH).toBeLessThanOrEqual(14);
    });

    test('should handle very low pH with buffering', () => {
      const lowPH = 1.0;
      const bufferedPH = chemistryModel.applyPHBuffer(lowPH, 0.8);
      
      // Should move toward neutral
      expect(bufferedPH).toBeGreaterThan(lowPH);
      expect(bufferedPH).toBeGreaterThanOrEqual(0);
      expect(bufferedPH).toBeLessThanOrEqual(14);
    });

    test('should handle repeated buffering applications', () => {
      let ph = 10.0;
      const bufferCapacity = 0.5;
      
      // Apply buffering multiple times
      for (let i = 0; i < 10; i++) {
        ph = chemistryModel.applyPHBuffer(ph, bufferCapacity);
      }
      
      // Should converge toward neutral
      expect(ph).toBeGreaterThan(7.0);
      expect(ph).toBeLessThan(10.0);
      expect(Number.isFinite(ph)).toBe(true);
    });
  });

  /**
   * Nutrient Saturation Tests
   * Tests nutrient concentration at saturation limits
   * Requirements: 6.2.2
   */
  describe('Nutrient Saturation', () => {
    test('should cap EC at maximum when nutrients are extremely high', () => {
      const veryHighConcentration = 100000; // 100,000 ppm
      
      const ec = chemistryModel.calculateECFromNutrients(veryHighConcentration);
      
      expect(ec).toBe(5.0); // Capped at maximum
    });

    test('should handle nutrient addition at saturation', () => {
      const initialPH = 7.0;
      const largeAmount = 1000; // Very large nutrient addition
      
      const newPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'acidic', largeAmount);
      
      // Should still be within valid range
      expect(newPH).toBeGreaterThanOrEqual(0);
      expect(newPH).toBeLessThanOrEqual(14);
    });

    test('should handle extreme dilution from saturation', () => {
      const initialEC = 5.0; // At maximum
      const volumeBefore = 1; // Very small volume
      const volumeAfter = 1000; // Extreme dilution
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      // Should dilute properly
      expect(newEC).toBeLessThan(initialEC);
      expect(newEC).toBeGreaterThanOrEqual(0);
    });

    test('should handle concentration from extreme evaporation', () => {
      const initialEC = 2.0;
      const volumeBefore = 100;
      const volumeAfter = 0.1; // Extreme concentration (1000x)
      
      const newEC = chemistryModel.calculateECFromDilution(initialEC, volumeBefore, volumeAfter);
      
      // Should be capped at maximum
      expect(newEC).toBe(5.0);
    });
  });

  /**
   * Zero Buffer Capacity Tests
   * Tests behavior when buffer capacity is zero
   * Requirements: 6.2.3
   */
  describe('Zero Buffer Capacity', () => {
    test('should have no buffering effect with zero capacity', () => {
      const ph = 7.5;
      const bufferedPH = chemistryModel.applyPHBuffer(ph, 0);
      
      expect(bufferedPH).toBeCloseTo(ph, 2);
    });

    test('should not affect extreme pH with zero buffer', () => {
      const extremePH = 13.0;
      const bufferedPH = chemistryModel.applyPHBuffer(extremePH, 0);
      
      expect(bufferedPH).toBeCloseTo(extremePH, 2);
    });

    test('should allow pH drift without buffering', () => {
      const initialPH = 7.0;
      const temperature = 30.0;
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(initialPH, temperature);
      
      // Temperature effect should still apply
      expect(adjustedPH).not.toBeCloseTo(initialPH, 2);
    });
  });

  /**
   * Extreme pH Adjustment Tests
   * Tests pH adjustment with extreme values and rates
   * Requirements: 6.2.4
   */
  describe('Extreme pH Adjustments', () => {
    test('should handle extreme temperature increase', () => {
      const ph = 7.0;
      const temperature = 100.0; // Extreme temperature
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temperature);
      
      // Should decrease significantly
      expect(adjustedPH).toBeLessThan(ph);
      expect(adjustedPH).toBeGreaterThanOrEqual(0);
    });

    test('should handle extreme temperature decrease', () => {
      const ph = 7.0;
      const temperature = -50.0; // Extreme cold
      
      const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temperature);
      
      // Should increase significantly
      expect(adjustedPH).toBeGreaterThan(ph);
      expect(adjustedPH).toBeLessThanOrEqual(14);
    });

    test('should handle extreme nutrient addition (acidic)', () => {
      const initialPH = 7.0;
      const extremeAmount = 10000; // Extreme amount
      
      const newPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'acidic', extremeAmount);
      
      // Should decrease significantly but stay in range
      expect(newPH).toBeLessThan(initialPH);
      expect(newPH).toBeGreaterThanOrEqual(0);
    });

    test('should handle extreme nutrient addition (basic)', () => {
      const initialPH = 7.0;
      const extremeAmount = 10000; // Extreme amount
      
      const newPH = chemistryModel.calculatePHFromNutrientAddition(initialPH, 'basic', extremeAmount);
      
      // Should increase significantly but stay in range
      expect(newPH).toBeGreaterThan(initialPH);
      expect(newPH).toBeLessThanOrEqual(14);
    });

    test('should handle multiple extreme adjustments', () => {
      let ph = 7.0;
      
      // Apply multiple extreme adjustments
      ph = chemistryModel.calculatePHFromTemperature(ph, 50.0);
      ph = chemistryModel.calculatePHFromNutrientAddition(ph, 'acidic', 1000);
      ph = chemistryModel.applyPHBuffer(ph, 0.9);
      
      // Should still be valid
      expect(ph).toBeGreaterThanOrEqual(0);
      expect(ph).toBeLessThanOrEqual(14);
      expect(Number.isFinite(ph)).toBe(true);
    });

    test('should handle pH at boundaries with adjustments', () => {
      // Test at pH 0 - may go negative due to temperature adjustment
      let ph0 = chemistryModel.calculatePHFromTemperature(0, 30);
      expect(Number.isFinite(ph0)).toBe(true);
      
      // Test at pH 14 - may go above 14 due to temperature adjustment
      let ph14 = chemistryModel.calculatePHFromTemperature(14, 10);
      expect(Number.isFinite(ph14)).toBe(true);
    });

    test('should maintain numerical stability with extreme adjustments', () => {
      let ph = 7.0;
      
      // Apply many extreme adjustments
      for (let i = 0; i < 100; i++) {
        ph = chemistryModel.calculatePHFromTemperature(ph, 50 - (i % 100));
        ph = chemistryModel.applyPHBuffer(ph, 0.5);
      }
      
      // Should still be valid and finite
      expect(Number.isFinite(ph)).toBe(true);
    });
  });
});
