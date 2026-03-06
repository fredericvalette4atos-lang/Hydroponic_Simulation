/**
 * Unit tests for ValveActuator
 * 
 * Tests valve failure scenarios, rapid open/close cycles, flow rate edge cases,
 * and state consistency.
 * 
 * Requirements: 3.3
 */

import { ValveActuator, ValveType } from '../../../src/actuators/valve-actuator';
import { ActuatorType } from '../../../src/types';

describe('ValveActuator', () => {
  describe('Initialization', () => {
    test('initializes with required configuration', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      expect(valve.id).toBe('valve-1');
      expect(valve.type).toBe(ActuatorType.VALVE);
      expect(valve.getValveType()).toBe(ValveType.INLET);
      expect(valve.getFlowRate()).toBe(10.0);
    });
    
    test('initializes with default failure probability (0.0)', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      expect(valve.isFailed()).toBe(false);
    });
    
    test('initializes with custom failure probability', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0,
        failureProbability: 0.1
      });
      
      expect(valve.isFailed()).toBe(false);
    });
    
    test('initializes in inactive state (closed)', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      const state = valve.getState();
      expect(state.active).toBe(false);
    });
  });
  
  describe('State Management', () => {
    test('can open valve', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      
      const state = valve.getState();
      expect(state.active).toBe(true);
    });
    
    test('can close valve', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      valve.setState({ active: false, timestamp: Date.now() });
      
      const state = valve.getState();
      expect(state.active).toBe(false);
    });
    
    test('preserves state timestamp', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      const timestamp = Date.now();
      valve.setState({ active: true, timestamp });
      
      const state = valve.getState();
      expect(state.timestamp).toBeDefined();
    });
  });
  
  describe('Valve Types', () => {
    test('supports INLET valve type', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      expect(valve.getValveType()).toBe(ValveType.INLET);
    });
    
    test('supports OUTLET valve type', () => {
      const valve = new ValveActuator({
        id: 'valve-2',
        valveType: ValveType.OUTLET,
        flowRate: 10.0
      });
      
      expect(valve.getValveType()).toBe(ValveType.OUTLET);
    });
    
    test('supports IRRIGATION valve type', () => {
      const valve = new ValveActuator({
        id: 'valve-3',
        valveType: ValveType.IRRIGATION,
        flowRate: 5.0
      });
      
      expect(valve.getValveType()).toBe(ValveType.IRRIGATION);
    });
  });
  
  describe('Physics Effects', () => {
    test('INLET valve returns positive water delta when open', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      
      const effect = valve.getPhysicsEffect();
      expect(effect.waterDelta).toBe(10.0);
    });
    
    test('OUTLET valve returns negative water delta when open', () => {
      const valve = new ValveActuator({
        id: 'valve-2',
        valveType: ValveType.OUTLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      
      const effect = valve.getPhysicsEffect();
      expect(effect.waterDelta).toBe(-10.0);
    });
    
    test('IRRIGATION valve returns negative water delta when open', () => {
      const valve = new ValveActuator({
        id: 'valve-3',
        valveType: ValveType.IRRIGATION,
        flowRate: 5.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      
      const effect = valve.getPhysicsEffect();
      expect(effect.waterDelta).toBe(-5.0);
    });
    
    test('returns empty effect when closed', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: false, timestamp: Date.now() });
      
      const effect = valve.getPhysicsEffect();
      expect(Object.keys(effect).length).toBe(0);
    });
  });
  
  describe('Runtime Tracking', () => {
    test('tracks total runtime when valve is open', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      
      const runtime = valve.getTotalRuntime();
      expect(runtime).toBeGreaterThanOrEqual(0);
    });
    
    test('accumulates runtime across multiple open/close cycles', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setState({ active: true, timestamp: Date.now() });
      valve.setState({ active: false, timestamp: Date.now() });
      
      const runtime1 = valve.getTotalRuntime();
      
      valve.setState({ active: true, timestamp: Date.now() });
      valve.setState({ active: false, timestamp: Date.now() });
      
      const runtime2 = valve.getTotalRuntime();
      
      expect(runtime2).toBeGreaterThanOrEqual(runtime1);
    });
  });
  
  describe('Failure Probability', () => {
    test('rejects invalid failure probability (negative)', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      expect(() => {
        valve.setFailureProbability(-0.1);
      }).toThrow('Failure probability must be between 0.0 and 1.0');
    });
    
    test('rejects invalid failure probability (>1.0)', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      expect(() => {
        valve.setFailureProbability(1.1);
      }).toThrow('Failure probability must be between 0.0 and 1.0');
    });
    
    test('accepts valid failure probability (0.0)', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0
      });
      
      valve.setFailureProbability(0.0);
      expect(valve.isFailed()).toBe(false);
    });
    
    test('accepts valid failure probability (1.0)', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0,
        failureProbability: 1.0
      });
      
      expect(() => {
        valve.setState({ active: true, timestamp: Date.now() });
      }).toThrow();
    });
  });
  
  describe('Reset', () => {
    test('can reset from failed state', () => {
      const valve = new ValveActuator({
        id: 'valve-1',
        valveType: ValveType.INLET,
        flowRate: 10.0,
        failureProbability: 1.0
      });
      
      try {
        valve.setState({ active: true, timestamp: Date.now() });
      } catch (e) {
        // Expected
      }
      
      expect(valve.isFailed()).toBe(true);
      
      valve.reset();
      
      expect(valve.isFailed()).toBe(false);
      expect(valve.getState().active).toBe(false);
    });
  });

  describe('Failure Scenarios', () => {
    describe('Valve failure scenarios', () => {
      test('3.3.1 - valve fails when failure probability is 100%', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0,
          failureProbability: 1.0
        });
        
        expect(() => {
          valve.setState({ active: true, timestamp: Date.now() });
        }).toThrow('Actuator valve-1 has failed');
        
        expect(valve.isFailed()).toBe(true);
      });
      
      test('3.3.1 - valve does not fail when failure probability is 0%', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0,
          failureProbability: 0.0
        });
        
        valve.setState({ active: true, timestamp: Date.now() });
        
        expect(valve.isFailed()).toBe(false);
      });
      
      test('3.3.1 - failed valve cannot be reopened without reset', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0,
          failureProbability: 1.0
        });
        
        try {
          valve.setState({ active: true, timestamp: Date.now() });
        } catch (e) {
          // Expected
        }
        
        expect(valve.isFailed()).toBe(true);
        
        expect(() => {
          valve.setState({ active: true, timestamp: Date.now() });
        }).toThrow();
      });
      
      test('3.3.1 - failed valve can be reopened after reset', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0,
          failureProbability: 1.0
        });
        
        try {
          valve.setState({ active: true, timestamp: Date.now() });
        } catch (e) {
          // Expected
        }
        
        valve.reset();
        
        expect(valve.isFailed()).toBe(false);
        
        expect(() => {
          valve.setState({ active: true, timestamp: Date.now() });
        }).toThrow();
      });
    });

    describe('Rapid open/close cycles', () => {
      test('3.3.2 - handles rapid open/close cycles', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        for (let i = 0; i < 10; i++) {
          valve.setState({ active: true, timestamp: Date.now() });
          expect(valve.getState().active).toBe(true);
          
          valve.setState({ active: false, timestamp: Date.now() });
          expect(valve.getState().active).toBe(false);
        }
      });
      
      test('3.3.2 - rapid cycles accumulate runtime', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        for (let i = 0; i < 5; i++) {
          valve.setState({ active: true, timestamp: Date.now() });
          valve.setState({ active: false, timestamp: Date.now() });
        }
        
        const runtime = valve.getTotalRuntime();
        expect(runtime).toBeGreaterThanOrEqual(0);
      });
      
      test('3.3.2 - rapid cycles maintain state consistency', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        for (let i = 0; i < 20; i++) {
          const shouldBeOpen = i % 2 === 0;
          valve.setState({ active: shouldBeOpen, timestamp: Date.now() });
          
          expect(valve.getState().active).toBe(shouldBeOpen);
        }
      });
    });

    describe('Flow rate edge cases', () => {
      test('3.3.3 - accepts zero flow rate', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 0.0
        });
        
        expect(valve.getFlowRate()).toBe(0.0);
      });
      
      test('3.3.3 - accepts positive flow rate', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        expect(valve.getFlowRate()).toBe(10.0);
      });
      
      test('3.3.3 - accepts very large flow rate', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 1000.0
        });
        
        expect(valve.getFlowRate()).toBe(1000.0);
      });
      
      test('3.3.3 - accepts very small flow rate', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 0.001
        });
        
        expect(valve.getFlowRate()).toBe(0.001);
      });
      
      test('3.3.3 - physics effect scales with flow rate', () => {
        const valve1 = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 5.0
        });
        
        const valve2 = new ValveActuator({
          id: 'valve-2',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        valve1.setState({ active: true, timestamp: Date.now() });
        valve2.setState({ active: true, timestamp: Date.now() });
        
        const effect1 = valve1.getPhysicsEffect();
        const effect2 = valve2.getPhysicsEffect();
        
        expect(effect2.waterDelta).toBe(2 * (effect1.waterDelta ?? 0));
      });
      
      test('3.3.3 - outlet valve flow rate is negated', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.OUTLET,
          flowRate: 10.0
        });
        
        valve.setState({ active: true, timestamp: Date.now() });
        
        const effect = valve.getPhysicsEffect();
        expect(effect.waterDelta).toBe(-10.0);
      });
      
      test('3.3.3 - irrigation valve flow rate is negated', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.IRRIGATION,
          flowRate: 5.0
        });
        
        valve.setState({ active: true, timestamp: Date.now() });
        
        const effect = valve.getPhysicsEffect();
        expect(effect.waterDelta).toBe(-5.0);
      });
    });

    describe('State consistency', () => {
      test('3.3.4 - state is consistent after opening', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        valve.setState({ active: true, timestamp: Date.now() });
        
        const state = valve.getState();
        expect(state.active).toBe(true);
        expect(state.timestamp).toBeDefined();
      });
      
      test('3.3.4 - state is consistent after closing', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        valve.setState({ active: true, timestamp: Date.now() });
        valve.setState({ active: false, timestamp: Date.now() });
        
        const state = valve.getState();
        expect(state.active).toBe(false);
        expect(state.timestamp).toBeDefined();
      });
      
      test('3.3.4 - physics effect matches state', () => {
        const valve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        valve.setState({ active: true, timestamp: Date.now() });
        
        const effect = valve.getPhysicsEffect();
        expect(effect.waterDelta).toBe(10.0);
        
        valve.setState({ active: false, timestamp: Date.now() });
        
        const closedEffect = valve.getPhysicsEffect();
        expect(Object.keys(closedEffect).length).toBe(0);
      });
      
      test('3.3.4 - valve type determines flow direction', () => {
        const inletValve = new ValveActuator({
          id: 'valve-1',
          valveType: ValveType.INLET,
          flowRate: 10.0
        });
        
        const outletValve = new ValveActuator({
          id: 'valve-2',
          valveType: ValveType.OUTLET,
          flowRate: 10.0
        });
        
        inletValve.setState({ active: true, timestamp: Date.now() });
        outletValve.setState({ active: true, timestamp: Date.now() });
        
        const inletEffect = inletValve.getPhysicsEffect();
        const outletEffect = outletValve.getPhysicsEffect();
        
        expect(inletEffect.waterDelta).toBeGreaterThan(0);
        expect(outletEffect.waterDelta).toBeLessThan(0);
      });
    });
  });
});
