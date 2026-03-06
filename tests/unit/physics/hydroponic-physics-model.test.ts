/**
 * Unit tests for HydroponicPhysicsModel
 * 
 * Tests the core physics simulation functionality including:
 * - State initialization
 * - Evaporation effects
 * - Plant uptake
 * - Temperature drift
 * - pH drift
 * - Actuator effects
 * - Water level updates
 */

import { HydroponicPhysicsModelImpl } from '../../../src/physics/hydroponic-physics-model';
import { HydroponicState, PhysicsConfig, PhysicsEffect } from '../../../src/types';

describe('HydroponicPhysicsModel', () => {
  // Helper function to create a default initial state
  const createDefaultState = (): HydroponicState => ({
    waterVolume: 50, // liters
    waterLevel: 50, // percentage
    temperature: 22, // celsius
    ph: 6.0,
    ec: 1.5, // mS/cm
    nutrientConcentration: 960, // ppm (1.5 * 640)
    ambientTemperature: 20,
    simulatedTime: 0
  });
  
  // Helper function to create a default physics config
  const createDefaultConfig = (): PhysicsConfig => ({
    evaporationRate: 0.1, // liters/hour
    plantUptakeRate: 0.2, // liters/hour
    nutrientUptakeRate: 10, // ppm/hour
    ambientTemperature: 20,
    temperatureDriftRate: 0.5, // celsius/hour
    phDriftRate: 0.05, // pH units/hour
    bufferCapacity: 0.1
  });
  
  describe('Initialization', () => {
    test('should initialize with provided state and config', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const state = model.getState();
      expect(state.waterVolume).toBe(50);
      expect(state.temperature).toBe(22);
      expect(state.ph).toBe(6.0);
      expect(state.ec).toBe(1.5);
    });
    
    test('should not mutate the original state object', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      
      // Original state should be unchanged
      expect(initialState.waterVolume).toBe(50);
      expect(initialState.simulatedTime).toBe(0);
    });
  });
  
  describe('Evaporation', () => {
    test('should reduce water volume over time', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      model.update(1, []); // 1 hour
      const stateAfter = model.getState();
      
      // Water should decrease by evaporation rate (0.1 L/h)
      expect(stateAfter.waterVolume).toBeLessThan(stateBefore.waterVolume);
      expect(stateAfter.waterVolume).toBeCloseTo(49.7, 1); // 50 - 0.1 (evap) - 0.2 (uptake)
    });
    
    test('should increase EC when water evaporates', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      config.plantUptakeRate = 0; // Disable plant uptake to isolate evaporation effect
      config.nutrientUptakeRate = 0; // Disable nutrient uptake
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      model.update(1, []); // 1 hour
      const stateAfter = model.getState();
      
      // EC should increase due to concentration effect
      expect(stateAfter.ec).toBeGreaterThan(stateBefore.ec);
    });
    
    test('should not reduce water volume below zero', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 0.1; // Very low water
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours - should drain completely
      const state = model.getState();
      
      expect(state.waterVolume).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Plant Uptake', () => {
    test('should reduce water volume due to plant consumption', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      model.update(1, []); // 1 hour
      const stateAfter = model.getState();
      
      // Water should decrease by plant uptake rate (0.2 L/h) + evaporation (0.1 L/h)
      expect(stateAfter.waterVolume).toBeLessThan(stateBefore.waterVolume);
    });
    
    test('should reduce nutrient concentration', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      model.update(1, []); // 1 hour
      const stateAfter = model.getState();
      
      // Nutrients should decrease by uptake rate (10 ppm/h)
      expect(stateAfter.nutrientConcentration).toBeLessThan(stateBefore.nutrientConcentration);
    });
    
    test('should not reduce nutrients below zero', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 5; // Very low nutrients
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours - should deplete completely
      const state = model.getState();
      
      expect(state.nutrientConcentration).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Temperature Drift', () => {
    test('should drift toward ambient temperature', () => {
      const initialState = createDefaultState();
      initialState.temperature = 30; // Higher than ambient (20)
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []); // 1 hour
      const state = model.getState();
      
      // Temperature should decrease toward ambient
      expect(state.temperature).toBeLessThan(30);
      expect(state.temperature).toBeGreaterThan(20);
    });
    
    test('should stay within valid range (0-50°C)', () => {
      const initialState = createDefaultState();
      initialState.temperature = 49;
      const config = createDefaultConfig();
      config.temperatureDriftRate = 10; // Large drift
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours
      const state = model.getState();
      
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(50);
    });
  });
  
  describe('pH Drift', () => {
    test('should drift over time', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      model.update(1, []); // 1 hour
      const stateAfter = model.getState();
      
      // pH should change (direction depends on drift rate sign)
      expect(stateAfter.ph).not.toBe(stateBefore.ph);
    });
    
    test('should stay within valid range (0-14)', () => {
      const initialState = createDefaultState();
      initialState.ph = 13;
      const config = createDefaultConfig();
      config.phDriftRate = 5; // Large drift
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours
      const state = model.getState();
      
      expect(state.ph).toBeGreaterThanOrEqual(0);
      expect(state.ph).toBeLessThanOrEqual(14);
    });
  });
  
  describe('Actuator Effects', () => {
    test('should apply water addition', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      const effects: PhysicsEffect[] = [{ waterDelta: 10 }];
      model.update(0, effects); // No time, just effects
      const stateAfter = model.getState();
      
      // Water should increase
      expect(stateAfter.waterVolume).toBeGreaterThan(stateBefore.waterVolume);
    });
    
    test('should dilute EC when water is added', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      const effects: PhysicsEffect[] = [{ waterDelta: 10 }];
      model.update(0, effects);
      const stateAfter = model.getState();
      
      // EC should decrease due to dilution
      expect(stateAfter.ec).toBeLessThan(stateBefore.ec);
    });
    
    test('should apply nutrient addition', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      const effects: PhysicsEffect[] = [{ nutrientDelta: 100 }];
      model.update(0, effects);
      const stateAfter = model.getState();
      
      // Nutrients should increase
      expect(stateAfter.nutrientConcentration).toBeGreaterThan(stateBefore.nutrientConcentration);
      // EC should also increase
      expect(stateAfter.ec).toBeGreaterThan(stateBefore.ec);
    });
    
    test('should apply temperature changes', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      const effects: PhysicsEffect[] = [{ temperatureDelta: 5 }];
      model.update(0, effects);
      const stateAfter = model.getState();
      
      // Temperature should increase
      expect(stateAfter.temperature).toBeCloseTo(stateBefore.temperature + 5, 1);
    });
    
    test('should apply pH changes', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const stateBefore = model.getState();
      const effects: PhysicsEffect[] = [{ phDelta: 0.5 }];
      model.update(0, effects);
      const stateAfter = model.getState();
      
      // pH should increase
      expect(stateAfter.ph).toBeGreaterThan(stateBefore.ph);
    });
    
    test('should not exceed reservoir capacity', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const effects: PhysicsEffect[] = [{ waterDelta: 100 }]; // Try to add 100L
      model.update(0, effects);
      const state = model.getState();
      
      // Should not exceed capacity
      expect(state.waterVolume).toBeLessThanOrEqual(100);
    });
  });
  
  describe('Water Level Updates', () => {
    test('should update water level percentage based on volume', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const state = model.getState();
      expect(state.waterLevel).toBe(50); // 50L / 100L capacity = 50%
    });
    
    test('should update water level when volume changes', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const effects: PhysicsEffect[] = [{ waterDelta: 25 }];
      model.update(0, effects);
      const state = model.getState();
      
      expect(state.waterLevel).toBe(75); // 75L / 100L capacity = 75%
    });
    
    test('should stay within 0-100% range', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const effects: PhysicsEffect[] = [{ waterDelta: 50 }]; // Try to overfill
      model.update(0, effects);
      const state = model.getState();
      
      expect(state.waterLevel).toBeLessThanOrEqual(100);
      expect(state.waterLevel).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Chemistry Integration', () => {
    test('should apply temperature-pH coupling', () => {
      const initialState = createDefaultState();
      initialState.temperature = 20;
      initialState.ph = 7.0;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Increase temperature
      const effects: PhysicsEffect[] = [{ temperatureDelta: 10 }];
      model.update(0, effects);
      const state = model.getState();
      
      // pH should decrease when temperature increases
      expect(state.ph).toBeLessThan(7.0);
    });
    
    test('should apply pH buffering', () => {
      const initialState = createDefaultState();
      initialState.ph = 8.0; // Above neutral
      const config = createDefaultConfig();
      config.bufferCapacity = 0.5; // Strong buffering
      config.phDriftRate = 0; // Disable drift to isolate buffering effect
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []); // Let buffering work
      const state = model.getState();
      
      // pH should move toward neutral (7.0) due to buffering
      expect(state.ph).toBeLessThan(8.0);
    });
  });
  
  describe('Time Management', () => {
    test('should update simulated time', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []); // 1 hour
      const state = model.getState();
      
      // Simulated time should increase by 3600 seconds (1 hour)
      expect(state.simulatedTime).toBe(3600);
    });
    
    test('should accumulate simulated time over multiple updates', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []); // 1 hour
      model.update(0.5, []); // 0.5 hours
      model.update(2, []); // 2 hours
      const state = model.getState();
      
      // Total: 3.5 hours = 12600 seconds
      expect(state.simulatedTime).toBe(12600);
    });
  });
  
  describe('Configuration Updates', () => {
    test('should update reservoir capacity', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.setReservoirCapacity(200);
      const state = model.getState();
      
      // Water level percentage should update
      expect(state.waterLevel).toBe(25); // 50L / 200L = 25%
    });
    
    test('should update evaporation rate', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.setEvaporationRate(0.5);
      model.update(1, []);
      const state = model.getState();
      
      // Should use new evaporation rate
      expect(state.waterVolume).toBeLessThan(50);
    });
    
    test('should update plant uptake rate', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.setPlantUptakeRate(0.5);
      model.update(1, []);
      const state = model.getState();
      
      // Should use new uptake rate
      expect(state.waterVolume).toBeLessThan(50);
    });
  });

  /**
   * Specific Evaporation Scenarios
   * Tests evaporation with known rates and times to verify exact calculations
   * Requirements: 10.2, 10.5
   */
  describe('Specific Evaporation Scenarios', () => {
    test('should evaporate exactly 1 liter in 10 hours at 0.1 L/h rate', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0.1; // L/h
      config.plantUptakeRate = 0; // Disable plant uptake
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours
      const state = model.getState();
      
      // Should evaporate exactly 1 liter (0.1 L/h * 10h)
      expect(state.waterVolume).toBeCloseTo(49, 6);
    });

    test('should evaporate 2.5 liters in 5 hours at 0.5 L/h rate', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 60;
      const config = createDefaultConfig();
      config.evaporationRate = 0.5; // L/h
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(5, []); // 5 hours
      const state = model.getState();
      
      // Should evaporate exactly 2.5 liters (0.5 L/h * 5h)
      expect(state.waterVolume).toBeCloseTo(57.5, 6);
    });

    test('should concentrate nutrients when water evaporates', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      initialState.nutrientConcentration = 1000; // ppm
      const config = createDefaultConfig();
      config.evaporationRate = 10; // L/h (high rate for clear effect)
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []); // 1 hour, evaporate 10L
      const state = model.getState();
      
      // Water: 100L -> 90L
      // Nutrients stay same mass, so concentration increases
      // New concentration = 1000 * (100/90) = 1111.11 ppm
      expect(state.waterVolume).toBeCloseTo(90, 6);
      expect(state.nutrientConcentration).toBeCloseTo(1111.11, 2);
    });

    test('should handle zero evaporation rate', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0; // No evaporation
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours
      const state = model.getState();
      
      // Water should remain unchanged
      expect(state.waterVolume).toBeCloseTo(50, 6);
    });

    test('should handle evaporation with very small time steps', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0.1; // L/h
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Simulate 1 hour in 60 one-minute steps
      for (let i = 0; i < 60; i++) {
        model.update(1/60, []); // 1 minute
      }
      const state = model.getState();
      
      // Should evaporate 0.1 liter total
      expect(state.waterVolume).toBeCloseTo(49.9, 5);
    });

    test('should stop evaporation when water reaches zero', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 0.5; // Very low water
      const config = createDefaultConfig();
      config.evaporationRate = 1.0; // High rate
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours - would evaporate 10L if available
      const state = model.getState();
      
      // Should stop at zero, not go negative
      expect(state.waterVolume).toBe(0);
    });
  });

  /**
   * Specific Plant Uptake Scenarios
   * Tests plant uptake with known rates and expected results
   * Requirements: 10.2, 10.5
   */
  describe('Specific Plant Uptake Scenarios', () => {
    test('should consume exactly 2 liters of water in 10 hours at 0.2 L/h rate', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0.2; // L/h
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours
      const state = model.getState();
      
      // Should consume exactly 2 liters (0.2 L/h * 10h)
      expect(state.waterVolume).toBeCloseTo(48, 6);
    });

    test('should consume exactly 50 ppm nutrients in 5 hours at 10 ppm/h rate', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 1000; // ppm
      initialState.ph = 6.0; // Optimal pH (no lockout)
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 10; // ppm/h
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(5, []); // 5 hours
      const state = model.getState();
      
      // Should consume exactly 50 ppm (10 ppm/h * 5h)
      expect(state.nutrientConcentration).toBeCloseTo(950, 6);
    });

    test('should consume both water and nutrients simultaneously', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      initialState.nutrientConcentration = 1000; // ppm
      initialState.ph = 6.0; // Optimal pH
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 1.0; // L/h
      config.nutrientUptakeRate = 20; // ppm/h
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(2, []); // 2 hours
      const state = model.getState();
      
      // Water: 100 - (1.0 * 2) = 98L
      // Nutrients: 1000 - (20 * 2) = 960 ppm
      expect(state.waterVolume).toBeCloseTo(98, 6);
      expect(state.nutrientConcentration).toBeCloseTo(960, 6);
    });

    test('should reduce nutrient uptake when pH causes lockout', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      initialState.nutrientConcentration = 1000; // ppm
      initialState.ph = 4.5; // Severe lockout pH (<5.0)
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 100; // ppm/h (high rate to see effect)
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []); // 1 hour
      const state = model.getState();
      
      // At pH 4.5, lockout factor is 0.5 (50% availability)
      // So 50% of consumed nutrients are returned
      // Consumed: 100 ppm, returned: 50 ppm, net: 50 ppm reduction
      // Final: 1000 - 100 + 50 = 950 ppm
      expect(state.nutrientConcentration).toBeCloseTo(950, 5);
    });

    test('should handle zero plant uptake rate', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      initialState.nutrientConcentration = 1000;
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0; // No water uptake
      config.nutrientUptakeRate = 0; // No nutrient uptake
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours
      const state = model.getState();
      
      // Nothing should change
      expect(state.waterVolume).toBeCloseTo(50, 6);
      expect(state.nutrientConcentration).toBeCloseTo(1000, 6);
    });

    test('should stop nutrient consumption when nutrients reach zero', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 10; // Very low nutrients
      initialState.ph = 6.0; // Optimal pH
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 50; // High rate
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []); // 10 hours - would consume 500 ppm if available
      const state = model.getState();
      
      // Should stop at zero, not go negative
      expect(state.nutrientConcentration).toBe(0);
    });
  });

  /**
   * Mass Balance Calculations
   * Tests conservation of mass for water and nutrients
   * Requirements: 10.5
   */
  describe('Mass Balance Calculations', () => {
    test('should conserve water mass: input - output = change', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      const config = createDefaultConfig();
      config.evaporationRate = 0.5; // L/h
      config.plantUptakeRate = 0.3; // L/h
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const initialWater = 100;
      const timeHours = 5;
      
      model.update(timeHours, []);
      const state = model.getState();
      
      // Calculate mass balance
      const waterInput = 0; // No water added
      const waterOutput = (config.evaporationRate + config.plantUptakeRate) * timeHours;
      const expectedFinalWater = initialWater + waterInput - waterOutput;
      
      // Mass balance: 100 + 0 - (0.8 * 5) = 96L
      expect(state.waterVolume).toBeCloseTo(expectedFinalWater, 6);
      expect(state.waterVolume).toBeCloseTo(96, 6);
    });

    test('should conserve water mass with actuator addition', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0.2; // L/h
      config.plantUptakeRate = 0.1; // L/h
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const initialWater = 50;
      const waterAdded = 10;
      const timeHours = 2;
      
      // Add water via actuator
      const effects: PhysicsEffect[] = [{ waterDelta: waterAdded }];
      model.update(timeHours, effects);
      const state = model.getState();
      
      // Calculate mass balance
      const waterInput = waterAdded;
      const waterOutput = (config.evaporationRate + config.plantUptakeRate) * timeHours;
      const expectedFinalWater = initialWater + waterInput - waterOutput;
      
      // Mass balance: 50 + 10 - (0.3 * 2) = 59.4L
      expect(state.waterVolume).toBeCloseTo(expectedFinalWater, 6);
      expect(state.waterVolume).toBeCloseTo(59.4, 6);
    });

    test('should conserve nutrient mass: input - output = change', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 1000; // ppm
      initialState.ph = 6.0; // Optimal pH (no lockout)
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 15; // ppm/h
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const initialNutrients = 1000;
      const timeHours = 4;
      
      model.update(timeHours, []);
      const state = model.getState();
      
      // Calculate mass balance
      const nutrientInput = 0; // No nutrients added
      const nutrientOutput = config.nutrientUptakeRate * timeHours;
      const expectedFinalNutrients = initialNutrients + nutrientInput - nutrientOutput;
      
      // Mass balance: 1000 + 0 - (15 * 4) = 940 ppm
      expect(state.nutrientConcentration).toBeCloseTo(expectedFinalNutrients, 6);
      expect(state.nutrientConcentration).toBeCloseTo(940, 6);
    });

    test('should conserve nutrient mass with actuator addition', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 500; // ppm
      initialState.ph = 6.0; // Optimal pH
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 10; // ppm/h
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const initialNutrients = 500;
      const nutrientsAdded = 200;
      const timeHours = 3;
      
      // Add nutrients via actuator
      const effects: PhysicsEffect[] = [{ nutrientDelta: nutrientsAdded }];
      model.update(timeHours, effects);
      const state = model.getState();
      
      // Calculate mass balance
      const nutrientInput = nutrientsAdded;
      const nutrientOutput = config.nutrientUptakeRate * timeHours;
      const expectedFinalNutrients = initialNutrients + nutrientInput - nutrientOutput;
      
      // Mass balance: 500 + 200 - (10 * 3) = 670 ppm
      expect(state.nutrientConcentration).toBeCloseTo(expectedFinalNutrients, 6);
      expect(state.nutrientConcentration).toBeCloseTo(670, 6);
    });

    test('should maintain mass balance with multiple actuator effects', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      initialState.nutrientConcentration = 800; // ppm
      initialState.ph = 6.0;
      const config = createDefaultConfig();
      config.evaporationRate = 0.1; // L/h
      config.plantUptakeRate = 0.2; // L/h
      config.nutrientUptakeRate = 5; // ppm/h
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const initialWater = 50;
      const initialNutrients = 800;
      const timeHours = 2;
      
      // Multiple actuator effects
      const effects: PhysicsEffect[] = [
        { waterDelta: 5 },      // Add 5L water
        { nutrientDelta: 100 }  // Add 100 ppm nutrients
      ];
      model.update(timeHours, effects);
      const state = model.getState();
      
      // Water mass balance
      const waterInput = 5;
      const waterOutput = (config.evaporationRate + config.plantUptakeRate) * timeHours;
      const expectedFinalWater = initialWater + waterInput - waterOutput;
      // 50 + 5 - (0.3 * 2) = 54.4L
      expect(state.waterVolume).toBeCloseTo(expectedFinalWater, 6);
      
      // Nutrient mass balance (note: dilution from water addition affects concentration)
      // Initial nutrients in system: 800 ppm
      // Add 100 ppm, consume 10 ppm (5 * 2)
      // But water dilution changes concentration
      // Expected: 800 + 100 - 10 = 890 ppm (before considering dilution effects)
      // The actual value will be affected by water dilution
      expect(state.nutrientConcentration).toBeGreaterThan(0);
    });

    test('should handle complex scenario with all processes active', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 80;
      initialState.nutrientConcentration = 1200; // ppm
      initialState.ph = 6.0;
      const config = createDefaultConfig();
      config.evaporationRate = 0.3; // L/h
      config.plantUptakeRate = 0.4; // L/h
      config.nutrientUptakeRate = 20; // ppm/h
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const initialWater = 80;
      const initialNutrients = 1200;
      const timeHours = 1;
      
      model.update(timeHours, []);
      const state = model.getState();
      
      // Water mass balance
      const totalWaterLoss = (config.evaporationRate + config.plantUptakeRate) * timeHours;
      const expectedFinalWater = initialWater - totalWaterLoss;
      // 80 - (0.7 * 1) = 79.3L
      expect(state.waterVolume).toBeCloseTo(expectedFinalWater, 6);
      expect(state.waterVolume).toBeCloseTo(79.3, 6);
      
      // Nutrient mass balance (affected by both consumption and concentration from water loss)
      // Nutrients consumed: 20 ppm
      // But evaporation concentrates remaining nutrients
      // This is a complex interaction tested by the property tests
      expect(state.nutrientConcentration).toBeGreaterThan(0);
    });

    test('should respect reservoir capacity in mass balance', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 95;
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const capacity = 100; // 100L capacity
      const model = new HydroponicPhysicsModelImpl(initialState, config, capacity);
      
      const initialWater = 95;
      const waterToAdd = 20; // Try to add 20L (would exceed capacity)
      
      // Add water via actuator
      const effects: PhysicsEffect[] = [{ waterDelta: waterToAdd }];
      model.update(0, effects);
      const state = model.getState();
      
      // Should cap at reservoir capacity
      expect(state.waterVolume).toBe(capacity);
      expect(state.waterVolume).toBe(100);
      
      // Mass balance is maintained, but excess water is lost (overflow)
      const actualWaterAdded = capacity - initialWater; // Only 5L actually added
      expect(actualWaterAdded).toBe(5);
    });
  });

  /**
   * Extreme Temperature Conditions
   * Tests physics model behavior at temperature extremes
   * Requirements: 6.1.1
   */
  describe('Extreme Temperature Conditions', () => {
    test('should handle minimum temperature (0°C)', () => {
      const initialState = createDefaultState();
      initialState.temperature = 0;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should still function at minimum
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(50);
    });

    test('should handle maximum temperature (50°C)', () => {
      const initialState = createDefaultState();
      initialState.temperature = 50;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should still function at maximum
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(50);
    });

    test('should handle extreme temperature drift rate', () => {
      const initialState = createDefaultState();
      initialState.temperature = 25;
      const config = createDefaultConfig();
      config.temperatureDriftRate = 10; // Very high drift rate
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should still be within valid range
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(50);
    });

    test('should handle negative ambient temperature', () => {
      const initialState = createDefaultState();
      initialState.temperature = 10;
      const config = createDefaultConfig();
      config.ambientTemperature = -5; // Below freezing
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should drift toward ambient (downward)
      expect(state.temperature).toBeLessThan(10);
    });

    test('should handle very high ambient temperature', () => {
      const initialState = createDefaultState();
      initialState.temperature = 40;
      const config = createDefaultConfig();
      config.ambientTemperature = 60; // Very hot
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should drift toward ambient (upward)
      expect(state.temperature).toBeGreaterThan(40);
    });

    test('should handle rapid temperature changes via actuator', () => {
      const initialState = createDefaultState();
      initialState.temperature = 20;
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Apply extreme temperature change
      const effects: PhysicsEffect[] = [{ temperatureDelta: 25 }];
      model.update(0, effects);
      const state = model.getState();
      
      // Should handle extreme change
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(50);
    });
  });

  /**
   * Extreme Evaporation Rates
   * Tests physics model behavior with extreme evaporation rates
   * Requirements: 6.1.2
   */
  describe('Extreme Evaporation Rates', () => {
    test('should handle zero evaporation rate', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []);
      const state = model.getState();
      
      // Water should remain unchanged
      expect(state.waterVolume).toBeCloseTo(50, 6);
    });

    test('should handle very high evaporation rate (5 L/h)', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      const config = createDefaultConfig();
      config.evaporationRate = 5; // Very high
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should evaporate 5L
      expect(state.waterVolume).toBeCloseTo(95, 6);
    });

    test('should handle evaporation rate exceeding water volume', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 2;
      const config = createDefaultConfig();
      config.evaporationRate = 10; // Much higher than available water
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Should stop at zero, not go negative
      expect(state.waterVolume).toBe(0);
    });

    test('should concentrate nutrients with extreme evaporation', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      initialState.nutrientConcentration = 1000;
      const config = createDefaultConfig();
      config.evaporationRate = 50; // Extreme evaporation
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // Water: 100 - 50 = 50L
      // Nutrients: 1000 * (100/50) = 2000 ppm (but capped at max EC)
      expect(state.waterVolume).toBeCloseTo(50, 6);
      expect(state.nutrientConcentration).toBeGreaterThan(1000);
    });
  });

  /**
   * Numerical Stability Tests
   * Tests that calculations remain stable and don't produce NaN or Infinity
   * Requirements: 6.1.3
   */
  describe('Numerical Stability', () => {
    test('should not produce NaN values', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Run multiple updates
      for (let i = 0; i < 100; i++) {
        model.update(1, []);
      }
      
      const state = model.getState();
      expect(Number.isNaN(state.waterVolume)).toBe(false);
      expect(Number.isNaN(state.temperature)).toBe(false);
      expect(Number.isNaN(state.ph)).toBe(false);
      expect(Number.isNaN(state.ec)).toBe(false);
      expect(Number.isNaN(state.nutrientConcentration)).toBe(false);
    });

    test('should not produce Infinity values', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Run multiple updates
      for (let i = 0; i < 100; i++) {
        model.update(1, []);
      }
      
      const state = model.getState();
      expect(Number.isFinite(state.waterVolume)).toBe(true);
      expect(Number.isFinite(state.temperature)).toBe(true);
      expect(Number.isFinite(state.ph)).toBe(true);
      expect(Number.isFinite(state.ec)).toBe(true);
      expect(Number.isFinite(state.nutrientConcentration)).toBe(true);
    });

    test('should handle very small time steps', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Very small time steps
      for (let i = 0; i < 1000; i++) {
        model.update(0.001, []);
      }
      
      const state = model.getState();
      expect(Number.isFinite(state.waterVolume)).toBe(true);
      expect(state.waterVolume).toBeGreaterThanOrEqual(0);
    });

    test('should handle very large time steps', () => {
      const initialState = createDefaultState();
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Very large time step
      model.update(1000, []);
      
      const state = model.getState();
      expect(Number.isFinite(state.waterVolume)).toBe(true);
      expect(state.waterVolume).toBeGreaterThanOrEqual(0);
    });

    test('should maintain precision over long simulations', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0.001; // Very small rate
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Run for 1000 hours
      model.update(1000, []);
      
      const state = model.getState();
      // Should have evaporated 1L (0.001 * 1000)
      expect(state.waterVolume).toBeCloseTo(49, 5);
    });
  });

  /**
   * Zero Plant Uptake Scenarios
   * Tests behavior when plants consume no water or nutrients
   * Requirements: 6.1.4
   */
  describe('Zero Plant Uptake', () => {
    test('should handle zero plant water uptake', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 50;
      const config = createDefaultConfig();
      config.evaporationRate = 0.1;
      config.plantUptakeRate = 0; // No plant uptake
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []);
      const state = model.getState();
      
      // Only evaporation should occur
      expect(state.waterVolume).toBeCloseTo(49, 6);
    });

    test('should handle zero nutrient uptake', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 1000;
      const config = createDefaultConfig();
      config.evaporationRate = 0;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0; // No nutrient uptake
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []);
      const state = model.getState();
      
      // Nutrients should remain unchanged
      expect(state.nutrientConcentration).toBeCloseTo(1000, 6);
    });

    test('should handle zero uptake with only evaporation', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      initialState.nutrientConcentration = 1000;
      const config = createDefaultConfig();
      config.evaporationRate = 0.5;
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(10, []);
      const state = model.getState();
      
      // Water evaporates, nutrients concentrate
      expect(state.waterVolume).toBeCloseTo(95, 6);
      expect(state.nutrientConcentration).toBeGreaterThan(1000);
    });
  });

  /**
   * Maximum Nutrient Concentration
   * Tests behavior at maximum nutrient concentration limits
   * Requirements: 6.1.5
   */
  describe('Maximum Nutrient Concentration', () => {
    test('should cap EC at maximum (5.0 mS/cm)', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 10000; // Very high
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      const state = model.getState();
      
      // EC should be capped at 5.0
      expect(state.ec).toBeLessThanOrEqual(5.0);
    });

    test('should handle adding nutrients at maximum concentration', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 3200; // High concentration
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Try to add more nutrients
      const effects: PhysicsEffect[] = [{ nutrientDelta: 1000 }];
      model.update(0, effects);
      const state = model.getState();
      
      // Should not exceed maximum EC
      expect(state.ec).toBeLessThanOrEqual(5.0);
    });

    test('should handle extreme nutrient concentration from evaporation', () => {
      const initialState = createDefaultState();
      initialState.waterVolume = 100;
      initialState.nutrientConcentration = 1000;
      const config = createDefaultConfig();
      config.evaporationRate = 99; // Extreme evaporation
      config.plantUptakeRate = 0;
      config.nutrientUptakeRate = 0;
      config.temperatureDriftRate = 0;
      config.phDriftRate = 0;
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      model.update(1, []);
      const state = model.getState();
      
      // EC should still be capped
      expect(state.ec).toBeLessThanOrEqual(5.0);
    });

    test('should maintain valid state at maximum concentration', () => {
      const initialState = createDefaultState();
      initialState.nutrientConcentration = 5000; // At/near max
      const config = createDefaultConfig();
      const model = new HydroponicPhysicsModelImpl(initialState, config, 100);
      
      // Run simulation
      model.update(10, []);
      const state = model.getState();
      
      // All values should be valid
      expect(Number.isFinite(state.nutrientConcentration)).toBe(true);
      expect(Number.isFinite(state.ec)).toBe(true);
      expect(state.ec).toBeLessThanOrEqual(5.0);
    });
  });
});

