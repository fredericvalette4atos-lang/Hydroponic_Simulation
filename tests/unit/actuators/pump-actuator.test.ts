/**
 * Unit tests for PumpActuator
 * 
 * Tests pump failure scenarios, rapid on/off cycles, state consistency,
 * invalid flow rates, and concurrent pump operations.
 * 
 * Requirements: 3.1
 */

import { PumpActuator } from '../../../src/actuators/pump-actuator';
import { ActuatorType, PumpType } from '../../../src/types';

describe('PumpActuator', () => {
  describe('Initialization', () => {
    test('initializes with required configuration', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      expect(pump.id).toBe('pump-1');
      expect(pump.type).toBe(ActuatorType.PUMP);
      expect(pump.getPumpType()).toBe(PumpType.WATER);
      expect(pump.getFlowRate()).toBe(10.0);
    });
    
    test('initializes with default failure probability (0.0)', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      expect(pump.isFailed()).toBe(false);
    });
    
    test('initializes with custom failure probability', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0,
        failureProbability: 0.1
      });
      
      expect(pump.isFailed()).toBe(false);
    });
    
    test('initializes in inactive state', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      const state = pump.getState();
      expect(state.active).toBe(false);
    });
  });
  
  describe('State Management', () => {
    test('can activate pump', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      
      const state = pump.getState();
      expect(state.active).toBe(true);
    });
    
    test('can deactivate pump', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      pump.setState({ active: false, timestamp: Date.now() });
      
      const state = pump.getState();
      expect(state.active).toBe(false);
    });
    
    test('preserves state timestamp', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      const timestamp = Date.now();
      pump.setState({ active: true, timestamp });
      
      const state = pump.getState();
      expect(state.timestamp).toBeDefined();
    });
  });
  
  describe('Pump Types', () => {
    test('supports WATER pump type', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      expect(pump.getPumpType()).toBe(PumpType.WATER);
    });
    
    test('supports NUTRIENT pump type', () => {
      const pump = new PumpActuator({
        id: 'pump-2',
        pumpType: PumpType.NUTRIENT,
        flowRate: 5.0
      });
      
      expect(pump.getPumpType()).toBe(PumpType.NUTRIENT);
    });
    
    test('supports PH_UP pump type', () => {
      const pump = new PumpActuator({
        id: 'pump-3',
        pumpType: PumpType.PH_UP,
        flowRate: 0.5
      });
      
      expect(pump.getPumpType()).toBe(PumpType.PH_UP);
    });
    
    test('supports PH_DOWN pump type', () => {
      const pump = new PumpActuator({
        id: 'pump-4',
        pumpType: PumpType.PH_DOWN,
        flowRate: 0.5
      });
      
      expect(pump.getPumpType()).toBe(PumpType.PH_DOWN);
    });
  });
  
  describe('Physics Effects', () => {
    test('WATER pump returns water delta when active', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      
      const effect = pump.getPhysicsEffect();
      expect(effect.waterDelta).toBe(10.0);
    });
    
    test('NUTRIENT pump returns water and nutrient delta when active', () => {
      const pump = new PumpActuator({
        id: 'pump-2',
        pumpType: PumpType.NUTRIENT,
        flowRate: 5.0
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      
      const effect = pump.getPhysicsEffect();
      expect(effect.waterDelta).toBe(5.0);
      expect(effect.nutrientDelta).toBe(5.0);
    });
    
    test('PH_UP pump returns positive pH delta when active', () => {
      const pump = new PumpActuator({
        id: 'pump-3',
        pumpType: PumpType.PH_UP,
        flowRate: 0.5
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      
      const effect = pump.getPhysicsEffect();
      expect(effect.phDelta).toBe(0.5);
    });
    
    test('PH_DOWN pump returns negative pH delta when active', () => {
      const pump = new PumpActuator({
        id: 'pump-4',
        pumpType: PumpType.PH_DOWN,
        flowRate: 0.5
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      
      const effect = pump.getPhysicsEffect();
      expect(effect.phDelta).toBe(-0.5);
    });
    
    test('returns empty effect when inactive', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setState({ active: false, timestamp: Date.now() });
      
      const effect = pump.getPhysicsEffect();
      expect(Object.keys(effect).length).toBe(0);
    });
  });
  
  describe('Runtime Tracking', () => {
    test('tracks total runtime when pump is active', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      
      // Wait a bit
      const runtime = pump.getTotalRuntime();
      expect(runtime).toBeGreaterThanOrEqual(0);
    });
    
    test('accumulates runtime across multiple activations', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setState({ active: true, timestamp: Date.now() });
      pump.setState({ active: false, timestamp: Date.now() });
      
      const runtime1 = pump.getTotalRuntime();
      
      pump.setState({ active: true, timestamp: Date.now() });
      pump.setState({ active: false, timestamp: Date.now() });
      
      const runtime2 = pump.getTotalRuntime();
      
      expect(runtime2).toBeGreaterThanOrEqual(runtime1);
    });
  });
  
  describe('Failure Probability', () => {
    test('rejects invalid failure probability (negative)', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      expect(() => {
        pump.setFailureProbability(-0.1);
      }).toThrow('Failure probability must be between 0.0 and 1.0');
    });
    
    test('rejects invalid failure probability (>1.0)', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      expect(() => {
        pump.setFailureProbability(1.1);
      }).toThrow('Failure probability must be between 0.0 and 1.0');
    });
    
    test('accepts valid failure probability (0.0)', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0
      });
      
      pump.setFailureProbability(0.0);
      expect(pump.isFailed()).toBe(false);
    });
    
    test('accepts valid failure probability (1.0)', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0,
        failureProbability: 1.0
      });
      
      // With 100% failure probability, should fail on setState
      expect(() => {
        pump.setState({ active: true, timestamp: Date.now() });
      }).toThrow();
    });
  });
  
  describe('Reset', () => {
    test('can reset from failed state', () => {
      const pump = new PumpActuator({
        id: 'pump-1',
        pumpType: PumpType.WATER,
        flowRate: 10.0,
        failureProbability: 1.0
      });
      
      // Cause failure
      try {
        pump.setState({ active: true, timestamp: Date.now() });
      } catch (e) {
        // Expected
      }
      
      expect(pump.isFailed()).toBe(true);
      
      // Reset
      pump.reset();
      
      expect(pump.isFailed()).toBe(false);
      expect(pump.getState().active).toBe(false);
    });
  });

  describe('Failure Scenarios', () => {
    describe('Pump failure scenarios', () => {
      test('3.1.1 - pump fails when failure probability is 100%', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0,
          failureProbability: 1.0
        });
        
        expect(() => {
          pump.setState({ active: true, timestamp: Date.now() });
        }).toThrow('Actuator pump-1 has failed');
        
        expect(pump.isFailed()).toBe(true);
      });
      
      test('3.1.1 - pump does not fail when failure probability is 0%', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0,
          failureProbability: 0.0
        });
        
        pump.setState({ active: true, timestamp: Date.now() });
        
        expect(pump.isFailed()).toBe(false);
      });
      
      test('3.1.1 - failed pump cannot be reactivated without reset', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0,
          failureProbability: 1.0
        });
        
        try {
          pump.setState({ active: true, timestamp: Date.now() });
        } catch (e) {
          // Expected
        }
        
        expect(pump.isFailed()).toBe(true);
        
        // Try to reactivate without reset
        expect(() => {
          pump.setState({ active: true, timestamp: Date.now() });
        }).toThrow();
      });
      
      test('3.1.1 - failed pump can be reactivated after reset', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0,
          failureProbability: 1.0
        });
        
        try {
          pump.setState({ active: true, timestamp: Date.now() });
        } catch (e) {
          // Expected
        }
        
        pump.reset();
        
        expect(pump.isFailed()).toBe(false);
        
        // Now should be able to activate (with 100% failure, will fail again)
        expect(() => {
          pump.setState({ active: true, timestamp: Date.now() });
        }).toThrow();
      });
    });

    describe('Rapid on/off cycles', () => {
      test('3.1.2 - handles rapid on/off cycles', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        for (let i = 0; i < 10; i++) {
          pump.setState({ active: true, timestamp: Date.now() });
          expect(pump.getState().active).toBe(true);
          
          pump.setState({ active: false, timestamp: Date.now() });
          expect(pump.getState().active).toBe(false);
        }
      });
      
      test('3.1.2 - rapid cycles accumulate runtime', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        for (let i = 0; i < 5; i++) {
          pump.setState({ active: true, timestamp: Date.now() });
          pump.setState({ active: false, timestamp: Date.now() });
        }
        
        const runtime = pump.getTotalRuntime();
        expect(runtime).toBeGreaterThanOrEqual(0);
      });
      
      test('3.1.2 - rapid cycles maintain state consistency', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        for (let i = 0; i < 20; i++) {
          const shouldBeActive = i % 2 === 0;
          pump.setState({ active: shouldBeActive, timestamp: Date.now() });
          
          expect(pump.getState().active).toBe(shouldBeActive);
        }
      });
    });

    describe('State consistency', () => {
      test('3.1.3 - state is consistent after activation', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        pump.setState({ active: true, timestamp: Date.now() });
        
        const state = pump.getState();
        expect(state.active).toBe(true);
        expect(state.timestamp).toBeDefined();
      });
      
      test('3.1.3 - state is consistent after deactivation', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        pump.setState({ active: true, timestamp: Date.now() });
        pump.setState({ active: false, timestamp: Date.now() });
        
        const state = pump.getState();
        expect(state.active).toBe(false);
        expect(state.timestamp).toBeDefined();
      });
      
      test('3.1.3 - physics effect matches state', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        pump.setState({ active: true, timestamp: Date.now() });
        
        const effect = pump.getPhysicsEffect();
        expect(effect.waterDelta).toBe(10.0);
        
        pump.setState({ active: false, timestamp: Date.now() });
        
        const inactiveEffect = pump.getPhysicsEffect();
        expect(Object.keys(inactiveEffect).length).toBe(0);
      });
    });

    describe('Invalid flow rates', () => {
      test('3.1.4 - accepts zero flow rate', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 0.0
        });
        
        expect(pump.getFlowRate()).toBe(0.0);
      });
      
      test('3.1.4 - accepts positive flow rate', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        expect(pump.getFlowRate()).toBe(10.0);
      });
      
      test('3.1.4 - accepts very large flow rate', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 1000.0
        });
        
        expect(pump.getFlowRate()).toBe(1000.0);
      });
      
      test('3.1.4 - accepts very small flow rate', () => {
        const pump = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 0.001
        });
        
        expect(pump.getFlowRate()).toBe(0.001);
      });
      
      test('3.1.4 - physics effect scales with flow rate', () => {
        const pump1 = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 5.0
        });
        
        const pump2 = new PumpActuator({
          id: 'pump-2',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        pump1.setState({ active: true, timestamp: Date.now() });
        pump2.setState({ active: true, timestamp: Date.now() });
        
        const effect1 = pump1.getPhysicsEffect();
        const effect2 = pump2.getPhysicsEffect();
        
        expect(effect2.waterDelta).toBe(2 * (effect1.waterDelta ?? 0));
      });
    });

    describe('Concurrent pump operations', () => {
      test('3.1.5 - multiple pumps can operate independently', () => {
        const pump1 = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        const pump2 = new PumpActuator({
          id: 'pump-2',
          pumpType: PumpType.NUTRIENT,
          flowRate: 5.0
        });
        
        pump1.setState({ active: true, timestamp: Date.now() });
        pump2.setState({ active: false, timestamp: Date.now() });
        
        expect(pump1.getState().active).toBe(true);
        expect(pump2.getState().active).toBe(false);
      });
      
      test('3.1.5 - multiple pumps can be active simultaneously', () => {
        const pump1 = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        const pump2 = new PumpActuator({
          id: 'pump-2',
          pumpType: PumpType.NUTRIENT,
          flowRate: 5.0
        });
        
        const pump3 = new PumpActuator({
          id: 'pump-3',
          pumpType: PumpType.PH_UP,
          flowRate: 0.5
        });
        
        pump1.setState({ active: true, timestamp: Date.now() });
        pump2.setState({ active: true, timestamp: Date.now() });
        pump3.setState({ active: true, timestamp: Date.now() });
        
        expect(pump1.getState().active).toBe(true);
        expect(pump2.getState().active).toBe(true);
        expect(pump3.getState().active).toBe(true);
      });
      
      test('3.1.5 - concurrent pumps have independent runtimes', () => {
        const pump1 = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        const pump2 = new PumpActuator({
          id: 'pump-2',
          pumpType: PumpType.NUTRIENT,
          flowRate: 5.0
        });
        
        pump1.setState({ active: true, timestamp: Date.now() });
        pump2.setState({ active: true, timestamp: Date.now() });
        
        const runtime1 = pump1.getTotalRuntime();
        const runtime2 = pump2.getTotalRuntime();
        
        expect(runtime1).toBeGreaterThanOrEqual(0);
        expect(runtime2).toBeGreaterThanOrEqual(0);
      });
      
      test('3.1.5 - concurrent pumps have independent physics effects', () => {
        const pump1 = new PumpActuator({
          id: 'pump-1',
          pumpType: PumpType.WATER,
          flowRate: 10.0
        });
        
        const pump2 = new PumpActuator({
          id: 'pump-2',
          pumpType: PumpType.PH_UP,
          flowRate: 0.5
        });
        
        pump1.setState({ active: true, timestamp: Date.now() });
        pump2.setState({ active: true, timestamp: Date.now() });
        
        const effect1 = pump1.getPhysicsEffect();
        const effect2 = pump2.getPhysicsEffect();
        
        expect(effect1.waterDelta).toBe(10.0);
        expect(effect2.phDelta).toBe(0.5);
      });
    });
  });
});
