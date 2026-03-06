/**
 * Property-Based Tests for Chemistry Model
 * 
 * Tests universal properties of chemistry calculations including pH buffering,
 * temperature-pH coupling, nutrient lockout, and EC relationships.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 10.1, 10.3, 10.4, 2.3, 2.4
 */

import * as fc from 'fast-check';
import { ChemistryModelImpl } from '../../src/physics/chemistry-model';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid pH values (0-14)
 */
const arbPH = fc.float({ min: 0.0, max: 14.0, noNaN: true });

/**
 * Generate valid EC values (0-5 mS/cm)
 */
const arbEC = fc.float({ min: 0.0, max: 5.0, noNaN: true });

/**
 * Generate valid temperature values (0-50°C)
 */
const arbTemperature = fc.float({ min: 0.0, max: 50.0, noNaN: true });

/**
 * Generate valid buffer capacity (0-1)
 */
const arbBufferCapacity = fc.float({ min: 0.0, max: 1.0, noNaN: true });

/**
 * Generate valid nutrient amount (positive values)
 */
const arbNutrientAmount = fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true });

/**
 * Generate valid water volume (positive liters)
 */
const arbVolume = fc.float({ min: Math.fround(0.1), max: Math.fround(1000.0), noNaN: true });

/**
 * Generate valid nutrient concentration (ppm)
 */
const arbNutrientConcentration = fc.float({ min: 0.0, max: Math.fround(3200.0), noNaN: true });

// ============================================================================
// Property Tests
// ============================================================================

describe('Chemistry Model Property Tests', () => {
  let chemistryModel: ChemistryModelImpl;
  
  beforeEach(() => {
    chemistryModel = new ChemistryModelImpl();
  });
  
  /**
   * Property 28: pH Chemical Buffering
   * 
   * **Validates: Requirements 10.1**
   * 
   * For any hydroponic system state and any pH-adjusting chemical addition, 
   * the pH change shall follow the expected buffering curve (diminishing effect 
   * as pH approaches target).
   */
  describe('Property 28: pH chemical buffering', () => {
    it('should resist pH drift from neutral with buffering', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbBufferCapacity,
          (ph, bufferCapacity) => {
            const bufferedPH = chemistryModel.applyPHBuffer(ph, bufferCapacity);
            
            // Buffering should move pH toward neutral (7.0)
            const neutralPH = 7.0;
            const originalDistance = Math.abs(ph - neutralPH);
            const bufferedDistance = Math.abs(bufferedPH - neutralPH);
            
            // Buffered pH should be closer to neutral (or equal if already at neutral)
            expect(bufferedDistance).toBeLessThanOrEqual(originalDistance + 0.001);
            
            // Buffered pH should stay within valid range
            expect(bufferedPH).toBeGreaterThanOrEqual(0.0);
            expect(bufferedPH).toBeLessThanOrEqual(14.0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should have stronger buffering effect with higher buffer capacity', () => {
      fc.assert(
        fc.property(
          arbPH.filter(ph => Math.abs(ph - 7.0) > 0.5), // pH away from neutral
          (ph) => {
            const lowBuffer = 0.2;
            const highBuffer = 0.8;
            
            const lowBufferedPH = chemistryModel.applyPHBuffer(ph, lowBuffer);
            const highBufferedPH = chemistryModel.applyPHBuffer(ph, highBuffer);
            
            const neutralPH = 7.0;
            const lowDistance = Math.abs(lowBufferedPH - neutralPH);
            const highDistance = Math.abs(highBufferedPH - neutralPH);
            
            // Higher buffer capacity should move pH closer to neutral
            expect(highDistance).toBeLessThanOrEqual(lowDistance + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should have diminishing effect as pH approaches neutral', () => {
      fc.assert(
        fc.property(
          arbBufferCapacity.filter(cap => cap > 0.1),
          (bufferCapacity) => {
            // Test pH values at different distances from neutral
            const farPH = 10.0; // 3 units from neutral
            const nearPH = 7.5; // 0.5 units from neutral
            
            const farBuffered = chemistryModel.applyPHBuffer(farPH, bufferCapacity);
            const nearBuffered = chemistryModel.applyPHBuffer(nearPH, bufferCapacity);
            
            const farChange = Math.abs(farPH - farBuffered);
            const nearChange = Math.abs(nearPH - nearBuffered);
            
            // Change should be larger when further from neutral
            expect(farChange).toBeGreaterThanOrEqual(nearChange - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve pH when buffer capacity is zero', () => {
      fc.assert(
        fc.property(
          arbPH,
          (ph) => {
            const bufferedPH = chemistryModel.applyPHBuffer(ph, 0);
            
            // Zero buffer capacity should not change pH
            expect(bufferedPH).toBeCloseTo(ph, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 30: Temperature-pH Coupling
   * 
   * **Validates: Requirements 10.3**
   * 
   * For any hydroponic system state, when temperature changes, the pH shall 
   * adjust according to the temperature-pH relationship (approximately -0.01 pH 
   * units per degree Celsius increase).
   */
  describe('Property 30: Temperature-pH coupling', () => {
    it('should decrease pH when temperature increases', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbTemperature,
          (ph, temp) => {
            const referenceTempCelsius = 25.0;
            
            // Only test when temperature is above reference
            fc.pre(temp > referenceTempCelsius);
            
            const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temp);
            
            // pH should decrease when temperature increases
            expect(adjustedPH).toBeLessThanOrEqual(ph + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should increase pH when temperature decreases', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbTemperature,
          (ph, temp) => {
            const referenceTempCelsius = 25.0;
            
            // Only test when temperature is below reference
            fc.pre(temp < referenceTempCelsius);
            
            const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temp);
            
            // pH should increase when temperature decreases
            expect(adjustedPH).toBeGreaterThanOrEqual(ph - 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should follow linear relationship of ~0.01 pH per degree Celsius', () => {
      fc.assert(
        fc.property(
          arbPH,
          arbTemperature,
          (ph, temp) => {
            const referenceTempCelsius = 25.0;
            const phTempCoefficient = 0.01;
            
            const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, temp);
            
            // Calculate expected pH change
            const tempDelta = temp - referenceTempCelsius;
            const expectedPHChange = tempDelta * phTempCoefficient;
            const expectedPH = ph - expectedPHChange;
            
            // Verify the relationship holds
            expect(adjustedPH).toBeCloseTo(expectedPH, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should be composable (applying temperature changes sequentially)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(2.0), max: Math.fround(12.0), noNaN: true }), // Safe pH range
          arbTemperature,
          arbTemperature,
          (ph, temp1, temp2) => {
            // Apply two temperature adjustments
            const phAtTemp1 = chemistryModel.calculatePHFromTemperature(ph, temp1);
            const phAtTemp2 = chemistryModel.calculatePHFromTemperature(ph, temp2);
            
            // Both should be valid pH values
            expect(phAtTemp1).toBeGreaterThanOrEqual(-1.0); // Allow some calculation overflow
            expect(phAtTemp1).toBeLessThanOrEqual(15.0);
            expect(phAtTemp2).toBeGreaterThanOrEqual(-1.0);
            expect(phAtTemp2).toBeLessThanOrEqual(15.0);
            
            // The relationship should be consistent
            const tempDiff = temp2 - temp1;
            const phDiff = phAtTemp2 - phAtTemp1;
            const expectedPhDiff = -tempDiff * 0.01;
            
            expect(phDiff).toBeCloseTo(expectedPhDiff, 6);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve pH at reference temperature (25°C)', () => {
      fc.assert(
        fc.property(
          arbPH,
          (ph) => {
            const referenceTempCelsius = 25.0;
            
            const adjustedPH = chemistryModel.calculatePHFromTemperature(ph, referenceTempCelsius);
            
            // pH should remain unchanged at reference temperature
            expect(adjustedPH).toBeCloseTo(ph, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 31: Nutrient Lockout Simulation
   * 
   * **Validates: Requirements 10.4**
   * 
   * For any hydroponic system state where pH is outside the acceptable range 
   * (5.5-6.5), the system shall simulate reduced nutrient availability through 
   * a lockout factor less than 1.0.
   */
  describe('Property 31: Nutrient lockout simulation', () => {
    it('should detect lockout outside optimal pH range (5.5-6.5)', () => {
      fc.assert(
        fc.property(
          arbPH,
          (ph) => {
            const isLockout = chemistryModel.isNutrientLockout(ph);
            const optimalMin = 5.5;
            const optimalMax = 6.5;
            
            if (ph < optimalMin || ph > optimalMax) {
              // Should detect lockout outside optimal range
              expect(isLockout).toBe(true);
            } else {
              // Should not detect lockout within optimal range
              expect(isLockout).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should return lockout factor less than 1.0 outside optimal range', () => {
      fc.assert(
        fc.property(
          arbPH.filter(ph => ph < 5.5 || ph > 6.5), // Outside optimal range
          (ph) => {
            const lockoutFactor = chemistryModel.getLockoutFactor(ph);
            
            // Lockout factor should be less than 1.0
            expect(lockoutFactor).toBeLessThan(1.0);
            
            // Lockout factor should be positive
            expect(lockoutFactor).toBeGreaterThan(0.0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should return lockout factor of 1.0 within optimal range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(5.5), max: Math.fround(6.5), noNaN: true }), // Within optimal range
          (ph) => {
            const lockoutFactor = chemistryModel.getLockoutFactor(ph);
            
            // Lockout factor should be 1.0 (full nutrient availability)
            expect(lockoutFactor).toBe(1.0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should have more severe lockout further from optimal range', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            // Test specific pH values at different distances from optimal
            const moderateLowPH = 5.2; // Moderate lockout (5.0-5.5)
            const severeLowPH = 4.5;   // Severe lockout (<5.0)
            const moderateHighPH = 6.8; // Moderate lockout (6.5-7.0)
            const severeHighPH = 7.5;   // Severe lockout (>7.0)
            
            const moderateLowFactor = chemistryModel.getLockoutFactor(moderateLowPH);
            const severeLowFactor = chemistryModel.getLockoutFactor(severeLowPH);
            const moderateHighFactor = chemistryModel.getLockoutFactor(moderateHighPH);
            const severeHighFactor = chemistryModel.getLockoutFactor(severeHighPH);
            
            // Severe lockout should have lower factor than moderate
            expect(severeLowFactor).toBeLessThanOrEqual(moderateLowFactor);
            expect(severeHighFactor).toBeLessThanOrEqual(moderateHighFactor);
            
            // Verify expected values
            expect(moderateLowFactor).toBe(0.75);
            expect(severeLowFactor).toBe(0.5);
            expect(moderateHighFactor).toBe(0.75);
            expect(severeHighFactor).toBe(0.5);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should have symmetric lockout behavior above and below optimal range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.5), max: Math.fround(3.0), noNaN: true }), // Distance from optimal center
          (distance) => {
            const optimalCenter = 6.0; // Center of 5.5-6.5 range
            const lowPH = optimalCenter - distance;
            const highPH = optimalCenter + distance;
            
            // Only test valid pH values
            fc.pre(lowPH >= 0.0 && highPH <= 14.0);
            
            const lowFactor = chemistryModel.getLockoutFactor(lowPH);
            const highFactor = chemistryModel.getLockoutFactor(highPH);
            
            // Lockout factors should be symmetric
            expect(lowFactor).toBe(highFactor);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 6: EC Dilution Relationship
   * 
   * **Validates: Requirements 2.3**
   * 
   * For any hydroponic system state with initial EC value and water volume, 
   * when water is added, the new EC value shall equal the initial EC multiplied 
   * by the dilution factor (initial_volume / new_volume).
   */
  describe('Property 6: EC dilution relationship', () => {
    it('should follow dilution formula: EC × (initial_volume / new_volume)', () => {
      fc.assert(
        fc.property(
          arbEC,
          arbVolume,
          arbVolume,
          (initialEC, initialVolume, waterAdded) => {
            const newVolume = initialVolume + waterAdded;
            
            const newEC = chemistryModel.calculateECFromDilution(initialEC, initialVolume, newVolume);
            
            // Calculate expected EC using dilution formula
            const dilutionFactor = initialVolume / newVolume;
            const expectedEC = initialEC * dilutionFactor;
            
            // Verify the relationship (accounting for clamping to 0-5 range)
            if (expectedEC >= 0.0 && expectedEC <= 5.0) {
              expect(newEC).toBeCloseTo(expectedEC, 10);
            } else {
              // EC should be clamped to valid range
              expect(newEC).toBeGreaterThanOrEqual(0.0);
              expect(newEC).toBeLessThanOrEqual(5.0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should decrease EC when water is added', () => {
      fc.assert(
        fc.property(
          arbEC.filter(ec => ec > 0.1), // Non-zero EC
          arbVolume,
          arbVolume.filter(v => v > Math.fround(0.1)), // Positive water added
          (initialEC, initialVolume, waterAdded) => {
            const newVolume = initialVolume + waterAdded;
            
            const newEC = chemistryModel.calculateECFromDilution(initialEC, initialVolume, newVolume);
            
            // EC should decrease (or stay same if already at minimum)
            expect(newEC).toBeLessThanOrEqual(initialEC + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve EC when no water is added', () => {
      fc.assert(
        fc.property(
          arbEC,
          arbVolume,
          (initialEC, volume) => {
            const newEC = chemistryModel.calculateECFromDilution(initialEC, volume, volume);
            
            // EC should remain unchanged
            expect(newEC).toBeCloseTo(initialEC, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should be proportional: doubling volume halves EC', () => {
      fc.assert(
        fc.property(
          arbEC,
          arbVolume,
          (initialEC, initialVolume) => {
            const doubledVolume = initialVolume * 2;
            
            const newEC = chemistryModel.calculateECFromDilution(initialEC, initialVolume, doubledVolume);
            
            const expectedEC = initialEC / 2;
            
            // Verify halving relationship (accounting for clamping)
            if (expectedEC >= 0.0 && expectedEC <= 5.0) {
              expect(newEC).toBeCloseTo(expectedEC, 10);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should stay within valid EC range (0-5 mS/cm)', () => {
      fc.assert(
        fc.property(
          arbEC,
          arbVolume,
          arbVolume,
          (initialEC, initialVolume, waterAdded) => {
            const newVolume = initialVolume + waterAdded;
            
            const newEC = chemistryModel.calculateECFromDilution(initialEC, initialVolume, newVolume);
            
            // EC should stay within valid range
            expect(newEC).toBeGreaterThanOrEqual(0.0);
            expect(newEC).toBeLessThanOrEqual(5.0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 7: EC Concentration Relationship
   * 
   * **Validates: Requirements 2.4**
   * 
   * For any hydroponic system state, when nutrients are added, the EC value 
   * shall increase proportionally to the nutrient concentration added.
   */
  describe('Property 7: EC concentration relationship', () => {
    it('should increase EC with higher nutrient concentration', () => {
      fc.assert(
        fc.property(
          arbNutrientConcentration,
          arbNutrientConcentration,
          (lowConcentration, highConcentration) => {
            // Ensure high is actually higher
            fc.pre(highConcentration > lowConcentration + 10);
            
            const lowEC = chemistryModel.calculateECFromNutrients(lowConcentration);
            const highEC = chemistryModel.calculateECFromNutrients(highConcentration);
            
            // Higher concentration should produce higher EC
            expect(highEC).toBeGreaterThanOrEqual(lowEC);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should be proportional to nutrient concentration', () => {
      fc.assert(
        fc.property(
          arbNutrientConcentration.filter(c => c > 10 && c < Math.fround(1600)), // Avoid edge cases
          (concentration) => {
            const ec1 = chemistryModel.calculateECFromNutrients(concentration);
            const ec2 = chemistryModel.calculateECFromNutrients(concentration * 2);
            
            // Doubling concentration should double EC (within valid range)
            const expectedEC2 = ec1 * 2;
            
            if (expectedEC2 <= 5.0) {
              expect(ec2).toBeCloseTo(expectedEC2, 8);
            } else {
              // Should be clamped at maximum
              expect(ec2).toBe(5.0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should return zero EC for zero nutrient concentration', () => {
      fc.assert(
        fc.property(
          fc.constant(0),
          (concentration) => {
            const ec = chemistryModel.calculateECFromNutrients(concentration);
            
            // Zero concentration should give zero EC
            expect(ec).toBe(0.0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should stay within valid EC range (0-5 mS/cm)', () => {
      fc.assert(
        fc.property(
          arbNutrientConcentration,
          (concentration) => {
            const ec = chemistryModel.calculateECFromNutrients(concentration);
            
            // EC should stay within valid range
            expect(ec).toBeGreaterThanOrEqual(0.0);
            expect(ec).toBeLessThanOrEqual(5.0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should use consistent conversion factor', () => {
      fc.assert(
        fc.property(
          fc.constant(640), // Known conversion factor
          (concentration) => {
            const ec = chemistryModel.calculateECFromNutrients(concentration);
            
            // 640 ppm should give 1.0 mS/cm
            expect(ec).toBeCloseTo(1.0, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
