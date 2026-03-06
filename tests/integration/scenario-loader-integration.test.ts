/**
 * Integration tests for ScenarioLoader with example scenario files
 */

import { ScenarioLoader } from '../../src/config/scenario-loader';
import { join } from 'path';

describe('ScenarioLoader Integration Tests', () => {
  let loader: ScenarioLoader;
  
  beforeEach(() => {
    loader = new ScenarioLoader();
  });

  describe('Example Scenario Files', () => {
    it('should load basic-test.json', () => {
      const filepath = join(__dirname, '../../examples/scenarios/basic-test.json');
      const scenario = loader.loadFromFile(filepath);
      
      expect(scenario.name).toBe('Basic Test Scenario');
      expect(scenario.initialState.ph).toBe(6.5);
      expect(scenario.initialState.ec).toBe(1.5);
      expect(scenario.initialState.temperature).toBe(22);
      expect(scenario.initialState.waterLevel).toBe(80);
      expect(scenario.events).toHaveLength(3);
      expect(scenario.failures).toBeUndefined();
    });

    it('should load failure-test.json', () => {
      const filepath = join(__dirname, '../../examples/scenarios/failure-test.json');
      const scenario = loader.loadFromFile(filepath);
      
      expect(scenario.name).toBe('Actuator Failure Test Scenario');
      expect(scenario.initialState.ph).toBe(6.0);
      expect(scenario.events).toHaveLength(3);
      expect(scenario.failures).toBeDefined();
      expect(scenario.failures).toHaveLength(2);
      expect(scenario.failures![0].actuatorId).toBe('grow-light-1');
      expect(scenario.failures![1].actuatorId).toBe('water-pump-1');
    });

    it('should load ph-adjustment.json', () => {
      const filepath = join(__dirname, '../../examples/scenarios/ph-adjustment.json');
      const scenario = loader.loadFromFile(filepath);
      
      expect(scenario.name).toBe('pH Adjustment Scenario');
      expect(scenario.initialState.ph).toBe(7.5);
      expect(scenario.events).toHaveLength(4);
      
      // Verify event types
      const eventTypes = scenario.events.map(e => e.type);
      expect(eventTypes).toContain('actuator_command');
      expect(eventTypes).toContain('disturbance');
    });

    it('should validate all example scenarios', () => {
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        expect(() => loader.loadFromFile(filepath)).not.toThrow();
      });
    });
  });

  describe('Scenario Content Validation', () => {
    it('should have valid pH ranges in all examples', () => {
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        const scenario = loader.loadFromFile(filepath);
        
        expect(scenario.initialState.ph).toBeGreaterThanOrEqual(0);
        expect(scenario.initialState.ph).toBeLessThanOrEqual(14);
      });
    });

    it('should have valid EC ranges in all examples', () => {
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        const scenario = loader.loadFromFile(filepath);
        
        expect(scenario.initialState.ec).toBeGreaterThanOrEqual(0);
        expect(scenario.initialState.ec).toBeLessThanOrEqual(5);
      });
    });

    it('should have valid temperature ranges in all examples', () => {
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        const scenario = loader.loadFromFile(filepath);
        
        expect(scenario.initialState.temperature).toBeGreaterThanOrEqual(0);
        expect(scenario.initialState.temperature).toBeLessThanOrEqual(50);
      });
    });

    it('should have valid water level ranges in all examples', () => {
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        const scenario = loader.loadFromFile(filepath);
        
        expect(scenario.initialState.waterLevel).toBeGreaterThanOrEqual(0);
        expect(scenario.initialState.waterLevel).toBeLessThanOrEqual(100);
      });
    });

    it('should have non-negative event times', () => {
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        const scenario = loader.loadFromFile(filepath);
        
        scenario.events.forEach(event => {
          expect(event.time).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should have valid event types', () => {
      const validTypes = ['actuator_command', 'parameter_change', 'disturbance'];
      const scenarios = [
        'basic-test.json',
        'failure-test.json',
        'ph-adjustment.json'
      ];
      
      scenarios.forEach(filename => {
        const filepath = join(__dirname, '../../examples/scenarios', filename);
        const scenario = loader.loadFromFile(filepath);
        
        scenario.events.forEach(event => {
          expect(validTypes).toContain(event.type);
        });
      });
    });
  });
});
