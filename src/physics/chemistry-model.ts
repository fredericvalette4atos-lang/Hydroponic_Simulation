/**
 * Chemistry Model for Hydroponic Test Simulation
 * 
 * Handles chemical interactions and relationships in the hydroponic system:
 * - Temperature-pH coupling
 * - pH buffering effects
 * - Nutrient effects on pH and EC
 * - Nutrient lockout conditions
 * 
 * Requirements: 10.1, 10.3, 10.4, 2.3, 2.4
 */

/**
 * Interface for the chemistry model
 */
export interface ChemistryModel {
  /**
   * Calculate pH adjustment based on temperature change
   * pH decreases approximately 0.01 units per degree Celsius increase
   * 
   * @param ph - Current pH value
   * @param temp - Current temperature in Celsius
   * @returns Adjusted pH value
   */
  calculatePHFromTemperature(ph: number, temp: number): number;
  
  /**
   * Apply buffering effect that resists pH changes toward neutral (7.0)
   * 
   * @param ph - Current pH value
   * @param bufferCapacity - Buffer strength (0-1), higher values resist change more
   * @returns Buffered pH value
   */
  applyPHBuffer(ph: number, bufferCapacity: number): number;
  
  /**
   * Calculate pH change from nutrient addition
   * 
   * @param ph - Current pH value
   * @param nutrientType - Type of nutrient ('acidic', 'basic', 'neutral')
   * @param amount - Amount of nutrient added (arbitrary units)
   * @returns New pH value after nutrient addition
   */
  calculatePHFromNutrientAddition(ph: number, nutrientType: string, amount: number): number;
  
  /**
   * Calculate EC from nutrient concentration
   * EC is proportional to dissolved nutrient concentration
   * 
   * @param concentration - Nutrient concentration in ppm
   * @returns EC value in mS/cm
   */
  calculateECFromNutrients(concentration: number): number;
  
  /**
   * Calculate EC after dilution
   * EC decreases proportionally when water is added
   * 
   * @param ec - Current EC value in mS/cm
   * @param volumeBefore - Volume before dilution in liters
   * @param volumeAfter - Volume after dilution in liters
   * @returns New EC value after dilution
   */
  calculateECFromDilution(ec: number, volumeBefore: number, volumeAfter: number): number;
  
  /**
   * Check if pH is in nutrient lockout range
   * Nutrient lockout occurs outside 5.5-6.5 pH range for hydroponics
   * 
   * @param ph - Current pH value
   * @returns True if nutrient lockout is occurring
   */
  isNutrientLockout(ph: number): boolean;
  
  /**
   * Get nutrient availability factor based on pH
   * Returns multiplier for nutrient uptake efficiency
   * 
   * @param ph - Current pH value
   * @returns Lockout factor: 1.0 (optimal 5.5-6.5), 0.75 (moderate), 0.5 (severe <5.0 or >7.0)
   */
  getLockoutFactor(ph: number): number;
}

/**
 * Implementation of the chemistry model
 */
export class ChemistryModelImpl implements ChemistryModel {
  // Reference temperature for pH-temperature calculations (Celsius)
  private readonly REFERENCE_TEMPERATURE = 25.0;
  
  // pH change per degree Celsius
  private readonly PH_TEMP_COEFFICIENT = 0.01;
  
  // Neutral pH value
  private readonly NEUTRAL_PH = 7.0;
  
  // Optimal pH range for hydroponics
  private readonly OPTIMAL_PH_MIN = 5.5;
  private readonly OPTIMAL_PH_MAX = 6.5;
  
  // Severe lockout thresholds
  private readonly SEVERE_LOCKOUT_MIN = 5.0;
  private readonly SEVERE_LOCKOUT_MAX = 7.0;
  
  // EC to nutrient concentration conversion factor (mS/cm per 1000 ppm)
  // Typical conversion: 1 mS/cm ≈ 500-700 ppm, using 640 ppm as average
  private readonly EC_CONVERSION_FACTOR = 640.0;
  
  /**
   * Calculate pH adjustment based on temperature
   * pH decreases ~0.01 units per degree Celsius increase
   */
  calculatePHFromTemperature(ph: number, temp: number): number {
    const tempDelta = temp - this.REFERENCE_TEMPERATURE;
    return ph - (tempDelta * this.PH_TEMP_COEFFICIENT);
  }
  
  /**
   * Apply buffering effect that resists pH changes toward neutral
   * Buffering reduces the drift from neutral pH
   */
  applyPHBuffer(ph: number, bufferCapacity: number): number {
    // Validate buffer capacity
    const capacity = Math.max(0, Math.min(1, bufferCapacity));
    
    // Calculate drift from neutral
    const drift = ph - this.NEUTRAL_PH;
    
    // Apply buffering effect (reduces drift toward neutral)
    // Higher buffer capacity means more resistance to change
    return ph - (drift * capacity * 0.1);
  }
  
  /**
   * Calculate pH change from nutrient addition
   * Different nutrient types affect pH differently
   */
  calculatePHFromNutrientAddition(ph: number, nutrientType: string, amount: number): number {
    // Normalize nutrient type to lowercase for comparison
    const type = nutrientType.toLowerCase();
    
    // pH change per unit of nutrient (scaled by amount)
    let phChange = 0;
    
    switch (type) {
      case 'acidic':
        // Acidic nutrients decrease pH
        phChange = -0.1 * amount;
        break;
      case 'basic':
      case 'alkaline':
        // Basic/alkaline nutrients increase pH
        phChange = 0.1 * amount;
        break;
      case 'neutral':
      default:
        // Neutral nutrients have minimal pH effect
        phChange = 0;
        break;
    }
    
    // Apply change and ensure pH stays in valid range (0-14)
    const newPH = ph + phChange;
    return Math.max(0, Math.min(14, newPH));
  }
  
  /**
   * Calculate EC from nutrient concentration
   * EC is proportional to dissolved nutrient concentration
   */
  calculateECFromNutrients(concentration: number): number {
    // Convert ppm to mS/cm using conversion factor
    // EC = concentration (ppm) / conversion_factor (ppm per mS/cm)
    const ec = concentration / this.EC_CONVERSION_FACTOR;
    
    // Ensure EC stays in valid range (0-5.0 mS/cm)
    return Math.max(0, Math.min(5.0, ec));
  }
  
  /**
   * Calculate EC after dilution
   * EC decreases proportionally when water is added
   */
  calculateECFromDilution(ec: number, volumeBefore: number, volumeAfter: number): number {
    // Prevent division by zero
    if (volumeAfter <= 0) {
      return ec;
    }
    
    // EC is proportional to concentration, which follows dilution formula
    // new_EC = old_EC * (old_volume / new_volume)
    const dilutionFactor = volumeBefore / volumeAfter;
    const newEC = ec * dilutionFactor;
    
    // Ensure EC stays in valid range (0-5.0 mS/cm)
    return Math.max(0, Math.min(5.0, newEC));
  }
  
  /**
   * Check if pH is in nutrient lockout range
   * Nutrient lockout occurs outside 5.5-6.5 pH range
   */
  isNutrientLockout(ph: number): boolean {
    return ph < this.OPTIMAL_PH_MIN || ph > this.OPTIMAL_PH_MAX;
  }
  
  /**
   * Get nutrient availability factor based on pH
   * Returns multiplier for nutrient uptake efficiency
   */
  getLockoutFactor(ph: number): number {
    // Optimal range (5.5-6.5): full nutrient availability
    if (ph >= this.OPTIMAL_PH_MIN && ph <= this.OPTIMAL_PH_MAX) {
      return 1.0;
    }
    
    // Severe lockout (<5.0 or >7.0): 50% nutrient availability
    if (ph < this.SEVERE_LOCKOUT_MIN || ph > this.SEVERE_LOCKOUT_MAX) {
      return 0.5;
    }
    
    // Moderate lockout (5.0-5.5 or 6.5-7.0): 75% nutrient availability
    return 0.75;
  }
}
