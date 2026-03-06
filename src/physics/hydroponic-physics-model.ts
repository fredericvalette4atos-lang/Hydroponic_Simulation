/**
 * Hydroponic Physics Model for Test Simulation
 * 
 * Models the physical and chemical behavior of the hydroponic system including:
 * - Water evaporation and plant uptake
 * - Temperature drift and effects
 * - pH drift and chemical interactions
 * - Actuator effects on system state
 * - Mass conservation
 * 
 * Requirements: 10.2, 10.5, 4.3, 3.4, 1.3
 */

import { ChemistryModel, ChemistryModelImpl } from './chemistry-model';
import { HydroponicState, PhysicsEffect, PhysicsConfig } from '../types';

/**
 * Interface for the hydroponic physics model
 */
export interface HydroponicPhysicsModel {
  /**
   * Update the system state based on time and actuator effects
   * 
   * @param deltaTime - Time step in hours
   * @param actuatorEffects - Array of effects from active actuators
   */
  update(deltaTime: number, actuatorEffects: PhysicsEffect[]): void;
  
  /**
   * Get the current system state
   */
  getState(): HydroponicState;
  
  /**
   * Set the reservoir capacity
   * 
   * @param liters - Capacity in liters
   */
  setReservoirCapacity(liters: number): void;
  
  /**
   * Set the evaporation rate
   * 
   * @param litersPerHour - Evaporation rate in liters per hour
   */
  setEvaporationRate(litersPerHour: number): void;
  
  /**
   * Set the plant uptake rate
   * 
   * @param litersPerHour - Plant water uptake rate in liters per hour
   */
  setPlantUptakeRate(litersPerHour: number): void;
}

/**
 * Implementation of the hydroponic physics model
 */
export class HydroponicPhysicsModelImpl implements HydroponicPhysicsModel {
  private state: HydroponicState;
  private config: PhysicsConfig;
  private chemistryModel: ChemistryModel;
  private reservoirCapacity: number;
  
  /**
   * Create a new hydroponic physics model
   * 
   * @param initialState - Initial system state
   * @param config - Physics configuration parameters
   * @param reservoirCapacity - Reservoir capacity in liters
   */
  constructor(
    initialState: HydroponicState,
    config: PhysicsConfig,
    reservoirCapacity: number
  ) {
    this.state = { ...initialState };
    this.config = { ...config };
    this.reservoirCapacity = reservoirCapacity;
    this.chemistryModel = new ChemistryModelImpl();
  }
  
  /**
   * Update the system state based on time and actuator effects
   */
  update(deltaTime: number, actuatorEffects: PhysicsEffect[]): void {
    // Apply actuator effects first
    this.applyActuatorEffects(actuatorEffects);
    
    // Apply natural processes
    this.applyEvaporation(deltaTime);
    this.applyPlantUptake(deltaTime);
    this.applyTemperatureDrift(deltaTime);
    this.applyPHDrift(deltaTime);
    
    // Apply chemistry interactions
    // Temperature-pH coupling
    this.state.ph = this.chemistryModel.calculatePHFromTemperature(
      this.state.ph,
      this.state.temperature
    );
    
    // Apply pH buffering if configured (after drift and temperature effects)
    if (this.config.bufferCapacity !== undefined) {
      this.state.ph = this.chemistryModel.applyPHBuffer(
        this.state.ph,
        this.config.bufferCapacity
      );
    }
    
    // Ensure pH stays in valid range after all modifications
    this.state.ph = Math.max(0, Math.min(14, this.state.ph));
    
    // Update EC based on nutrient concentration
    this.state.ec = this.chemistryModel.calculateECFromNutrients(
      this.state.nutrientConcentration
    );
    
    // Update water level percentage
    this.updateWaterLevel();
    
    // Update simulated time
    this.state.simulatedTime += deltaTime * 3600; // Convert hours to seconds
  }
  
  /**
   * Get the current system state
   */
  getState(): HydroponicState {
    return { ...this.state };
  }
  
  /**
   * Set the reservoir capacity
   */
  setReservoirCapacity(liters: number): void {
    this.reservoirCapacity = liters;
    this.updateWaterLevel();
  }
  
  /**
   * Set the evaporation rate
   */
  setEvaporationRate(litersPerHour: number): void {
    this.config.evaporationRate = litersPerHour;
  }
  
  /**
   * Set the plant uptake rate
   */
  setPlantUptakeRate(litersPerHour: number): void {
    this.config.plantUptakeRate = litersPerHour;
  }
  
  /**
   * Apply evaporation effects
   * Water evaporates over time, increasing EC (concentration effect)
   */
  private applyEvaporation(deltaTime: number): void {
    const volumeBefore = this.state.waterVolume;
    const evaporated = this.config.evaporationRate * deltaTime;
    
    // Reduce water volume
    this.state.waterVolume = Math.max(0, this.state.waterVolume - evaporated);
    
    // Nutrients become more concentrated as water evaporates
    // Only apply if there's still water in the system
    if (this.state.waterVolume > 0 && volumeBefore > 0) {
      // Concentration increases inversely with volume
      this.state.nutrientConcentration *= (volumeBefore / this.state.waterVolume);
    }
  }
  
  /**
   * Apply plant uptake effects
   * Plants consume water and nutrients over time
   */
  private applyPlantUptake(deltaTime: number): void {
    const volumeBefore = this.state.waterVolume;
    const waterConsumed = this.config.plantUptakeRate * deltaTime;
    
    // Reduce water volume
    this.state.waterVolume = Math.max(0, this.state.waterVolume - waterConsumed);
    
    // Plants consume nutrients
    const nutrientConsumed = this.config.nutrientUptakeRate * deltaTime;
    this.state.nutrientConcentration = Math.max(
      0,
      this.state.nutrientConcentration - nutrientConsumed
    );
    
    // Apply nutrient lockout factor if pH is out of range
    const lockoutFactor = this.chemistryModel.getLockoutFactor(this.state.ph);
    if (lockoutFactor < 1.0) {
      // Reduce nutrient consumption when lockout occurs
      const reducedConsumption = nutrientConsumed * (1 - lockoutFactor);
      this.state.nutrientConcentration += reducedConsumption;
    }
    
    // Update EC based on new nutrient concentration
    this.state.ec = this.chemistryModel.calculateECFromNutrients(
      this.state.nutrientConcentration
    );
  }
  
  /**
   * Apply temperature drift effects
   * Temperature drifts toward ambient temperature
   */
  private applyTemperatureDrift(deltaTime: number): void {
    // Temperature drifts toward ambient temperature
    const tempDifference = this.config.ambientTemperature - this.state.temperature;
    const driftAmount = this.config.temperatureDriftRate * deltaTime;
    
    // Apply drift (move toward ambient temperature)
    if (Math.abs(tempDifference) > driftAmount) {
      this.state.temperature += Math.sign(tempDifference) * driftAmount;
    } else {
      this.state.temperature = this.config.ambientTemperature;
    }
    
    // Ensure temperature stays in valid range (0-50°C)
    this.state.temperature = Math.max(0, Math.min(50, this.state.temperature));
  }
  
  /**
   * Apply pH drift effects
   * pH naturally drifts over time
   */
  private applyPHDrift(deltaTime: number): void {
    // Natural pH drift (can be positive or negative)
    const drift = this.config.phDriftRate * deltaTime;
    this.state.ph += drift;
    
    // Ensure pH stays in valid range (0-14)
    this.state.ph = Math.max(0, Math.min(14, this.state.ph));
  }
  
  /**
   * Apply effects from actuators
   * Process all actuator effects and update system state
   */
  private applyActuatorEffects(effects: PhysicsEffect[]): void {
    for (const effect of effects) {
      // Apply water changes
      if (effect.waterDelta !== undefined) {
        const volumeBefore = this.state.waterVolume;
        this.state.waterVolume += effect.waterDelta;
        
        // Ensure water volume doesn't exceed capacity or go negative
        this.state.waterVolume = Math.max(
          0,
          Math.min(this.reservoirCapacity, this.state.waterVolume)
        );
        
        // If water was added, dilute nutrient concentration
        if (effect.waterDelta > 0 && volumeBefore > 0 && this.state.waterVolume > volumeBefore) {
          // Dilution: concentration decreases proportionally
          this.state.nutrientConcentration *= (volumeBefore / this.state.waterVolume);
        }
      }
      
      // Apply nutrient changes
      if (effect.nutrientDelta !== undefined) {
        this.state.nutrientConcentration += effect.nutrientDelta;
        this.state.nutrientConcentration = Math.max(0, this.state.nutrientConcentration);
      }
      
      // Apply temperature changes
      if (effect.temperatureDelta !== undefined) {
        this.state.temperature += effect.temperatureDelta;
        
        // Ensure temperature stays in valid range (0-50°C)
        this.state.temperature = Math.max(0, Math.min(50, this.state.temperature));
      }
      
      // Apply pH changes
      if (effect.phDelta !== undefined) {
        this.state.ph += effect.phDelta;
        
        // Ensure pH stays in valid range (0-14)
        this.state.ph = Math.max(0, Math.min(14, this.state.ph));
      }
    }
  }
  
  /**
   * Update water level percentage based on current volume
   * Converts absolute volume to percentage of capacity
   */
  private updateWaterLevel(): void {
    if (this.reservoirCapacity > 0) {
      this.state.waterLevel = (this.state.waterVolume / this.reservoirCapacity) * 100;
      
      // Ensure water level stays in valid range (0-100%)
      this.state.waterLevel = Math.max(0, Math.min(100, this.state.waterLevel));
    } else {
      this.state.waterLevel = 0;
    }
  }
}
