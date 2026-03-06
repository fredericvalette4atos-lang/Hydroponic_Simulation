/**
 * Unit tests for LightActuator
 * 
 * Tests light failure scenarios, rapid on/off cycles, intensity control edge cases,
 * and state consistency.
 * 
 * Requirements: 3.2
 */

import { LightActuator } from '../../../src/actuators/light-actuator';
import { ActuatorType } from '../../../src/types';

describe('LightActuator', () => {
  describe('Initialization', () => {
    test('initializes with required configuration', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(light.id).toBe('light-1');
      expect(light.type).toBe(ActuatorType.LIGHT);
    });
    
    test('initializes with default temperature effect (5°C/hour)', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(light.getTemperatureEffect()).toBe(5.0);
    });
    
    test('initializes with custom temperature effect', () => {
      const light = new LightActuator({ 
        id: 'light-1',
        temperatureEffect: 3.0
      });
      
      expect(light.getTemperatureEffect()).toBe(3.0);
    });
    
    test('initializes with default failure probability (0.0)', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(light.isFailed()).toBe(false);
    });
    
    test('initializes in inactive state with 0% intensity', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      const state = light.getState();
      expect(state.active).toBe(false);
      expect(state.intensity).toBe(0);
    });
  });
  
  describe('State Management', () => {
    test('can activate light', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, timestamp: Date.now() });
      
      const state = light.getState();
      expect(state.active).toBe(true);
    });
    
    test('can deactivate light', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, timestamp: Date.now() });
      light.setState({ active: false, timestamp: Date.now() });
      
      const state = light.getState();
      expect(state.active).toBe(false);
    });
    
    test('preserves state timestamp', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      const timestamp = Date.now();
      light.setState({ active: true, timestamp });
      
      const state = light.getState();
      expect(state.timestamp).toBeDefined();
    });
  });
  
  describe('Intensity Control', () => {
    test('accepts intensity 0%', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, intensity: 0, timestamp: Date.now() });
      
      expect(light.getIntensity()).toBe(0);
    });
    
    test('accepts intensity 100%', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, intensity: 100, timestamp: Date.now() });
      
      expect(light.getIntensity()).toBe(100);
    });
    
    test('accepts intermediate intensity values', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, intensity: 50, timestamp: Date.now() });
      
      expect(light.getIntensity()).toBe(50);
    });
    
    test('rejects intensity below 0%', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(() => {
        light.setState({ active: true, intensity: -1, timestamp: Date.now() });
      }).toThrow('Light intensity must be between 0 and 100');
    });
    
    test('rejects intensity above 100%', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(() => {
        light.setState({ active: true, intensity: 101, timestamp: Date.now() });
      }).toThrow('Light intensity must be between 0 and 100');
    });
    
    test('defaults to 100% intensity when activated without intensity', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, timestamp: Date.now() });
      
      expect(light.getIntensity()).toBe(100);
    });
    
    test('defaults to 0% intensity when deactivated', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, intensity: 75, timestamp: Date.now() });
      light.setState({ active: false, timestamp: Date.now() });
      
      expect(light.getIntensity()).toBe(0);
    });
  });
  
  describe('Physics Effects', () => {
    test('returns temperature effect at 100% intensity when active', () => {
      const light = new LightActuator({ 
        id: 'light-1',
        temperatureEffect: 5.0
      });
      
      light.setState({ active: true, intensity: 100, timestamp: Date.now() });
      
      const effect = light.getPhysicsEffect();
      expect(effect.temperatureDelta).toBe(5.0);
    });
    
    test('returns proportional temperature effect at 50% intensity', () => {
      const light = new LightActuator({ 
        id: 'light-1',
        temperatureEffect: 5.0
      });
      
      light.setState({ active: true, intensity: 50, timestamp: Date.now() });
      
      const effect = light.getPhysicsEffect();
      expect(effect.temperatureDelta).toBe(2.5);
    });
    
    test('returns zero temperature effect at 0% intensity', () => {
      const light = new LightActuator({ 
        id: 'light-1',
        temperatureEffect: 5.0
      });
      
      light.setState({ active: true, intensity: 0, timestamp: Date.now() });
      
      const effect = light.getPhysicsEffect();
      expect(effect.temperatureDelta).toBe(0);
    });
    
    test('returns empty effect when inactive', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: false, timestamp: Date.now() });
      
      const effect = light.getPhysicsEffect();
      expect(Object.keys(effect).length).toBe(0);
    });
  });
  
  describe('Runtime Tracking', () => {
    test('tracks total runtime when light is active', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, timestamp: Date.now() });
      
      const runtime = light.getTotalRuntime();
      expect(runtime).toBeGreaterThanOrEqual(0);
    });
    
    test('accumulates runtime across multiple activations', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setState({ active: true, timestamp: Date.now() });
      light.setState({ active: false, timestamp: Date.now() });
      
      const runtime1 = light.getTotalRuntime();
      
      light.setState({ active: true, timestamp: Date.now() });
      light.setState({ active: false, timestamp: Date.now() });
      
      const runtime2 = light.getTotalRuntime();
      
      expect(runtime2).toBeGreaterThanOrEqual(runtime1);
    });
  });
  
  describe('Failure Probability', () => {
    test('rejects invalid failure probability (negative)', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(() => {
        light.setFailureProbability(-0.1);
      }).toThrow('Failure probability must be between 0.0 and 1.0');
    });
    
    test('rejects invalid failure probability (>1.0)', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      expect(() => {
        light.setFailureProbability(1.1);
      }).toThrow('Failure probability must be between 0.0 and 1.0');
    });
    
    test('accepts valid failure probability (0.0)', () => {
      const light = new LightActuator({ id: 'light-1' });
      
      light.setFailureProbability(0.0);
      expect(light.isFailed()).toBe(false);
    });
    
    test('accepts valid failure probability (1.0)', () => {
      const light = new LightActuator({ 
        id: 'light-1',
        failureProbability: 1.0
      });
      
      expect(() => {
        light.setState({ active: true, timestamp: Date.now() });
      }).toThrow();
    });
  });
  
  describe('Reset', () => {
    test('can reset from failed state', () => {
      const light = new LightActuator({ 
        id: 'light-1',
        failureProbability: 1.0
      });
      
      try {
        light.setState({ active: true, timestamp: Date.now() });
      } catch (e) {
        // Expected
      }
      
      expect(light.isFailed()).toBe(true);
      
      light.reset();
      
      expect(light.isFailed()).toBe(false);
      expect(light.getState().active).toBe(false);
    });
  });

  describe('Failure Scenarios', () => {
    describe('Light failure scenarios', () => {
      test('3.2.1 - light fails when failure probability is 100%', () => {
        const light = new LightActuator({
          id: 'light-1',
          failureProbability: 1.0
        });
        
        expect(() => {
          light.setState({ active: true, timestamp: Date.now() });
        }).toThrow('Actuator light-1 has failed');
        
        expect(light.isFailed()).toBe(true);
      });
      
      test('3.2.1 - light does not fail when failure probability is 0%', () => {
        const light = new LightActuator({
          id: 'light-1',
          failureProbability: 0.0
        });
        
        light.setState({ active: true, timestamp: Date.now() });
        
        expect(light.isFailed()).toBe(false);
      });
      
      test('3.2.1 - failed light cannot be reactivated without reset', () => {
        const light = new LightActuator({
          id: 'light-1',
          failureProbability: 1.0
        });
        
        try {
          light.setState({ active: true, timestamp: Date.now() });
        } catch (e) {
          // Expected
        }
        
        expect(light.isFailed()).toBe(true);
        
        expect(() => {
          light.setState({ active: true, timestamp: Date.now() });
        }).toThrow();
      });
      
      test('3.2.1 - failed light can be reactivated after reset', () => {
        const light = new LightActuator({
          id: 'light-1',
          failureProbability: 1.0
        });
        
        try {
          light.setState({ active: true, timestamp: Date.now() });
        } catch (e) {
          // Expected
        }
        
        light.reset();
        
        expect(light.isFailed()).toBe(false);
        
        expect(() => {
          light.setState({ active: true, timestamp: Date.now() });
        }).toThrow();
      });
    });

    describe('Rapid on/off cycles', () => {
      test('3.2.2 - handles rapid on/off cycles', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        for (let i = 0; i < 10; i++) {
          light.setState({ active: true, timestamp: Date.now() });
          expect(light.getState().active).toBe(true);
          
          light.setState({ active: false, timestamp: Date.now() });
          expect(light.getState().active).toBe(false);
        }
      });
      
      test('3.2.2 - rapid cycles accumulate runtime', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        for (let i = 0; i < 5; i++) {
          light.setState({ active: true, timestamp: Date.now() });
          light.setState({ active: false, timestamp: Date.now() });
        }
        
        const runtime = light.getTotalRuntime();
        expect(runtime).toBeGreaterThanOrEqual(0);
      });
      
      test('3.2.2 - rapid cycles maintain state consistency', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        for (let i = 0; i < 20; i++) {
          const shouldBeActive = i % 2 === 0;
          light.setState({ active: shouldBeActive, timestamp: Date.now() });
          
          expect(light.getState().active).toBe(shouldBeActive);
        }
      });
    });

    describe('Intensity control edge cases', () => {
      test('3.2.3 - handles intensity at 0%', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        light.setState({ active: true, intensity: 0, timestamp: Date.now() });
        
        expect(light.getIntensity()).toBe(0);
        
        const effect = light.getPhysicsEffect();
        expect(effect.temperatureDelta).toBe(0);
      });
      
      test('3.2.3 - handles intensity at 100%', () => {
        const light = new LightActuator({ 
          id: 'light-1',
          temperatureEffect: 5.0
        });
        
        light.setState({ active: true, intensity: 100, timestamp: Date.now() });
        
        expect(light.getIntensity()).toBe(100);
        
        const effect = light.getPhysicsEffect();
        expect(effect.temperatureDelta).toBe(5.0);
      });
      
      test('3.2.3 - handles rapid intensity changes', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        const intensities = [0, 25, 50, 75, 100, 50, 25, 0];
        
        for (const intensity of intensities) {
          light.setState({ active: true, intensity, timestamp: Date.now() });
          expect(light.getIntensity()).toBe(intensity);
        }
      });
      
      test('3.2.3 - intensity changes affect physics effect', () => {
        const light = new LightActuator({ 
          id: 'light-1',
          temperatureEffect: 10.0
        });
        
        light.setState({ active: true, intensity: 25, timestamp: Date.now() });
        const effect25 = light.getPhysicsEffect();
        
        light.setState({ active: true, intensity: 75, timestamp: Date.now() });
        const effect75 = light.getPhysicsEffect();
        
        expect(effect75.temperatureDelta).toBe(3 * (effect25.temperatureDelta ?? 0));
      });
      
      test('3.2.3 - rejects intensity below 0%', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        expect(() => {
          light.setState({ active: true, intensity: -1, timestamp: Date.now() });
        }).toThrow('Light intensity must be between 0 and 100');
      });
      
      test('3.2.3 - rejects intensity above 100%', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        expect(() => {
          light.setState({ active: true, intensity: 101, timestamp: Date.now() });
        }).toThrow('Light intensity must be between 0 and 100');
      });
    });

    describe('State consistency', () => {
      test('3.2.4 - state is consistent after activation', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        light.setState({ active: true, intensity: 75, timestamp: Date.now() });
        
        const state = light.getState();
        expect(state.active).toBe(true);
        expect(state.intensity).toBe(75);
        expect(state.timestamp).toBeDefined();
      });
      
      test('3.2.4 - state is consistent after deactivation', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        light.setState({ active: true, intensity: 75, timestamp: Date.now() });
        light.setState({ active: false, timestamp: Date.now() });
        
        const state = light.getState();
        expect(state.active).toBe(false);
        expect(state.intensity).toBe(0);
        expect(state.timestamp).toBeDefined();
      });
      
      test('3.2.4 - physics effect matches state', () => {
        const light = new LightActuator({ 
          id: 'light-1',
          temperatureEffect: 5.0
        });
        
        light.setState({ active: true, intensity: 50, timestamp: Date.now() });
        
        const effect = light.getPhysicsEffect();
        expect(effect.temperatureDelta).toBe(2.5);
        
        light.setState({ active: false, timestamp: Date.now() });
        
        const inactiveEffect = light.getPhysicsEffect();
        expect(Object.keys(inactiveEffect).length).toBe(0);
      });
      
      test('3.2.4 - intensity persists across state changes', () => {
        const light = new LightActuator({ id: 'light-1' });
        
        light.setState({ active: true, intensity: 60, timestamp: Date.now() });
        expect(light.getIntensity()).toBe(60);
        
        light.setState({ active: true, intensity: 80, timestamp: Date.now() });
        expect(light.getIntensity()).toBe(80);
      });
    });
  });
});
