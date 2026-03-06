/**
 * SimulationCore - Main orchestrator for the hydroponic test simulation
 * 
 * This class coordinates all simulation components including:
 * - TimeManager for time control and acceleration
 * - EventLogger for logging events
 * - HydroponicPhysicsModel for system state updates
 * - Sensors for reading system state
 * - Actuators for controlling the system
 * 
 * The simulation loop follows this sequence:
 * 1. Process actuator commands
 * 2. Update physics model with actuator effects
 * 3. Update sensors from physics state
 * 4. Log events
 * 
 * Requirements: All (orchestration)
 */

import { TimeManager } from './time-manager';
import { EventLogger } from './event-logger';
import { HydroponicPhysicsModel, HydroponicPhysicsModelImpl } from '../physics/hydroponic-physics-model';
import { Sensor, Actuator, PhysicsEffect, SimulationConfig, LogLevel, HydroponicState, SerializedSensorState, SerializedActuatorState, TestScenario, ScenarioEvent, ScenarioFailure } from '../types';
import { StatePersistence, SimulationStateProvider, SimulationStateRestorer } from './state-persistence';
import { ScenarioLoader } from '../config/scenario-loader';

/**
 * Simulation lifecycle states
 */
enum SimulationState {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused'
}

/**
 * SimulationCore class - Main orchestrator
 */
export class SimulationCore implements SimulationStateProvider, SimulationStateRestorer {
  private timeManager: TimeManager;
  private eventLogger: EventLogger;
  private physicsModel: HydroponicPhysicsModel;
  private sensors: Map<string, Sensor>;
  private actuators: Map<string, Actuator>;
  private state: SimulationState;
  private simulationInterval: NodeJS.Timeout | null;
  private tickRate: number; // ticks per second
  private config: SimulationConfig;
  private statePersistence: StatePersistence;
  private scenarioLoader: ScenarioLoader;
  private scheduledEvents: ScenarioEvent[];
  private scheduledFailures: ScenarioFailure[];

  /**
   * Create a new SimulationCore instance
   * @param config - Simulation configuration
   */
  constructor(config: SimulationConfig) {
    this.config = config;
    this.sensors = new Map();
    this.actuators = new Map();
    this.state = SimulationState.STOPPED;
    this.simulationInterval = null;
    this.scheduledEvents = [];
    this.scheduledFailures = [];
    
    // Initialize tick rate from config or use default
    this.tickRate = config.simulation?.tickRate ?? 10; // 10 Hz default
    
    // Initialize TimeManager with configured acceleration
    const timeAcceleration = config.simulation?.timeAcceleration ?? 1;
    this.timeManager = new TimeManager(timeAcceleration);
    
    // Initialize EventLogger with configured settings
    const loggingConfig = config.logging ?? {
      level: LogLevel.INFO,
      filepath: './logs/simulation.log',
      rotationPolicy: 'daily' as const
    };
    this.eventLogger = new EventLogger(loggingConfig, this.timeManager);
    
    // Initialize HydroponicPhysicsModel
    const initialState = {
      waterVolume: (config.reservoir.capacity * config.reservoir.initialWaterLevel) / 100,
      waterLevel: config.reservoir.initialWaterLevel,
      temperature: config.sensors.temperature.baseline,
      ph: config.sensors.ph.baseline,
      ec: config.sensors.ec.baseline,
      nutrientConcentration: this.calculateInitialNutrientConcentration(config.sensors.ec.baseline),
      ambientTemperature: config.physics.ambientTemperature,
      simulatedTime: 0
    };
    
    this.physicsModel = new HydroponicPhysicsModelImpl(
      initialState,
      config.physics,
      config.reservoir.capacity
    );
    
    // Initialize StatePersistence
    this.statePersistence = new StatePersistence(this, this);
    
    // Initialize ScenarioLoader
    this.scenarioLoader = new ScenarioLoader();
    
    this.eventLogger.log(LogLevel.INFO, 'SimulationCore initialized', {
      tickRate: this.tickRate,
      timeAcceleration,
      reservoirCapacity: config.reservoir.capacity
    });
  }

  /**
   * Start the simulation
   * Begins the simulation loop
   */
  start(): void {
    if (this.state === SimulationState.RUNNING) {
      this.eventLogger.log(LogLevel.WARNING, 'Simulation already running');
      return;
    }
    
    this.state = SimulationState.RUNNING;
    this.eventLogger.log(LogLevel.INFO, 'Simulation started');
    
    // Start the simulation loop
    const tickIntervalMs = 1000 / this.tickRate;
    this.simulationInterval = setInterval(() => {
      this.tick();
    }, tickIntervalMs);
  }

  /**
   * Stop the simulation
   * Halts the simulation loop completely
   */
  stop(): void {
    if (this.state === SimulationState.STOPPED) {
      this.eventLogger.log(LogLevel.WARNING, 'Simulation already stopped');
      return;
    }
    
    this.state = SimulationState.STOPPED;
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    this.eventLogger.log(LogLevel.INFO, 'Simulation stopped');
  }

  /**
   * Pause the simulation
   * Pauses time and simulation loop
   */
  pause(): void {
    if (this.state !== SimulationState.RUNNING) {
      this.eventLogger.log(LogLevel.WARNING, 'Cannot pause: simulation not running');
      return;
    }
    
    this.state = SimulationState.PAUSED;
    this.timeManager.pause();
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    this.eventLogger.log(LogLevel.INFO, 'Simulation paused');
  }

  /**
   * Resume the simulation
   * Resumes from paused state
   */
  resume(): void {
    if (this.state !== SimulationState.PAUSED) {
      this.eventLogger.log(LogLevel.WARNING, 'Cannot resume: simulation not paused');
      return;
    }
    
    this.state = SimulationState.RUNNING;
    this.timeManager.resume();
    
    // Restart the simulation loop
    const tickIntervalMs = 1000 / this.tickRate;
    this.simulationInterval = setInterval(() => {
      this.tick();
    }, tickIntervalMs);
    
    this.eventLogger.log(LogLevel.INFO, 'Simulation resumed');
  }

  /**
   * Register a sensor component
   * @param sensor - Sensor to register
   */
  registerSensor(sensor: Sensor): void {
    if (this.sensors.has(sensor.id)) {
      throw new Error(`Sensor with id ${sensor.id} already registered`);
    }
    
    this.sensors.set(sensor.id, sensor);
    this.eventLogger.log(LogLevel.INFO, 'Sensor registered', {
      sensorId: sensor.id,
      type: sensor.type
    });
  }

  /**
   * Register an actuator component
   * @param actuator - Actuator to register
   */
  registerActuator(actuator: Actuator): void {
    if (this.actuators.has(actuator.id)) {
      throw new Error(`Actuator with id ${actuator.id} already registered`);
    }
    
    this.actuators.set(actuator.id, actuator);
    this.eventLogger.log(LogLevel.INFO, 'Actuator registered', {
      actuatorId: actuator.id,
      type: actuator.type
    });
  }

  /**
   * Get a sensor by ID
   * @param id - Sensor ID
   * @returns Sensor instance
   */
  getSensor(id: string): Sensor {
    const sensor = this.sensors.get(id);
    if (!sensor) {
      throw new Error(`Sensor with id ${id} not found`);
    }
    return sensor;
  }

  /**
   * Get an actuator by ID
   * @param id - Actuator ID
   * @returns Actuator instance
   */
  getActuator(id: string): Actuator {
    const actuator = this.actuators.get(id);
    if (!actuator) {
      throw new Error(`Actuator with id ${id} not found`);
    }
    return actuator;
  }

  /**
   * Get all sensors
   * @returns Array of all registered sensors
   */
  getAllSensors(): Sensor[] {
    return Array.from(this.sensors.values());
  }

  /**
   * Get all actuators
   * @returns Array of all registered actuators
   */
  getAllActuators(): Actuator[] {
    return Array.from(this.actuators.values());
  }

  /**
   * Get the current simulation state
   * @returns Current simulation state
   */
  getSimulationState(): string {
    return this.state;
  }

  /**
   * Check if simulation is running
   * @returns true if running, false otherwise
   */
  isRunning(): boolean {
    return this.state === SimulationState.RUNNING;
  }

  /**
   * Check if simulation is paused
   * @returns true if paused, false otherwise
   */
  isPaused(): boolean {
    return this.state === SimulationState.PAUSED;
  }

  /**
   * Get the TimeManager instance
   * @returns TimeManager
   */
  getTimeManager(): TimeManager {
    return this.timeManager;
  }

  /**
   * Get the EventLogger instance
   * @returns EventLogger
   */
  getEventLogger(): EventLogger {
    return this.eventLogger;
  }

  /**
   * Get the HydroponicPhysicsModel instance
   * @returns HydroponicPhysicsModel
   */
  getPhysicsModel(): HydroponicPhysicsModel {
    return this.physicsModel;
  }

  /**
   * Get the simulation configuration
   * @returns SimulationConfig
   */
  getConfig(): SimulationConfig {
    return this.config;
  }

  // ============================================================================
  // State Management Methods (Task 13.2)
  // ============================================================================

  /**
   * Set time acceleration factor
   * 
   * Requirement 14.1: Support configurable time acceleration factors from 1x to 1000x
   * Requirement 14.4: Adjust ongoing processes within one simulation tick
   * 
   * @param factor - Time acceleration factor (1-1000)
   * @throws Error if factor is out of range
   */
  setTimeAcceleration(factor: number): void {
    if (factor < 1 || factor > 1000) {
      throw new Error(`Time acceleration factor must be between 1 and 1000, got ${factor}`);
    }
    
    this.timeManager.setTimeAcceleration(factor);
    
    this.eventLogger.log(LogLevel.INFO, 'Time acceleration changed', {
      newFactor: factor,
      previousFactor: this.config.simulation?.timeAcceleration ?? 1
    });
    
    // Update config to reflect new acceleration
    if (!this.config.simulation) {
      this.config.simulation = {
        tickRate: this.tickRate,
        timeAcceleration: factor
      };
    } else {
      this.config.simulation.timeAcceleration = factor;
    }
  }

  /**
   * Get current simulated time
   *
   * Requirement 14.5: Report simulated time separately from real time
   *
   * @returns Simulated time in seconds
   */
  getSimulatedTime(): number {
    return this.timeManager.getSimulatedTime();
  }

  /**
   * Get current real time
   *
   * Requirement 14.5: Report simulated time separately from real time
   *
   * @returns Real time in seconds since simulation start
   */
  getRealTime(): number {
    return this.timeManager.getRealTime();
  }

  /**
   * Save current simulation state to a file
   *
   * Requirement 12.1: Serialize current state to JSON file
   *
   * @param filepath - Path to save the state file
   * @throws Error if save fails
   */
  saveState(filepath: string): void {
    try {
      this.statePersistence.save(filepath);
      this.eventLogger.log(LogLevel.INFO, 'Simulation state saved', {
        filepath,
        simulatedTime: this.getSimulatedTime()
      });
    } catch (error) {
      this.eventLogger.logError(error as Error, {
        context: 'saveState',
        filepath
      });
      throw error;
    }
  }

  /**
   * Load simulation state from a file
   *
   * Requirement 12.2: Restore all sensor and actuator states from file
   *
   * @param filepath - Path to the state file
   * @throws Error if load fails or validation fails
   */
  loadState(filepath: string): void {
    try {
      this.statePersistence.loadAndRestore(filepath);
      this.eventLogger.log(LogLevel.INFO, 'Simulation state loaded', {
        filepath,
        simulatedTime: this.getSimulatedTime()
      });
    } catch (error) {
      this.eventLogger.logError(error as Error, {
        context: 'loadState',
        filepath
      });
      throw error;
    }
  }

  /**
   * Load and apply a test scenario
   *
   * Requirement 8.2: Initialize all sensor and actuator states according to scenario
   *
   * @param filepath - Path to the scenario JSON file
   * @throws Error if scenario load or application fails
   */
  loadScenario(filepath: string): void {
    try {
      const scenario = this.scenarioLoader.loadFromFile(filepath);
      this.scenarioLoader.applyScenario(this, scenario);

      this.eventLogger.log(LogLevel.INFO, 'Scenario loaded and applied', {
        filepath,
        scenarioName: scenario.name,
        eventsCount: scenario.events.length,
        failuresCount: scenario.failures?.length ?? 0
      });
    } catch (error) {
      this.eventLogger.logError(error as Error, {
        context: 'loadScenario',
        filepath
      });
      throw error;
    }
  }

  /**
   * Update simulation configuration at runtime
   * 
   * Requirement 11.4: Support runtime configuration updates without restart
   * 
   * @param config - New configuration (partial or complete)
   */
  updateConfig(config: Partial<SimulationConfig>): void {
    try {
      // Merge new config with existing config, ensuring required fields are preserved
      const mergedSimulation = config.simulation 
        ? { ...this.config.simulation, ...config.simulation }
        : this.config.simulation;
      
      const mergedLogging = config.logging
        ? { ...this.config.logging, ...config.logging }
        : this.config.logging;
      
      this.config = {
        ...this.config,
        ...config,
        reservoir: { ...this.config.reservoir, ...config.reservoir },
        sensors: { ...this.config.sensors, ...config.sensors },
        actuators: { ...this.config.actuators, ...config.actuators },
        physics: { ...this.config.physics, ...config.physics },
        simulation: mergedSimulation,
        logging: mergedLogging
      };
      
      // Apply configuration changes to components
      if (config.simulation?.timeAcceleration !== undefined) {
        this.timeManager.setTimeAcceleration(config.simulation.timeAcceleration);
      }
      
      if (config.simulation?.tickRate !== undefined) {
        this.tickRate = config.simulation.tickRate;
        // If simulation is running, restart the interval with new tick rate
        if (this.state === SimulationState.RUNNING) {
          if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
          }
          const tickIntervalMs = 1000 / this.tickRate;
          this.simulationInterval = setInterval(() => {
            this.tick();
          }, tickIntervalMs);
        }
      }
      
      // Update physics model configuration if physics config changed
      if (config.physics) {
        // Apply individual physics config updates
        if (config.physics.evaporationRate !== undefined) {
          this.physicsModel.setEvaporationRate(config.physics.evaporationRate);
        }
        if (config.physics.plantUptakeRate !== undefined) {
          this.physicsModel.setPlantUptakeRate(config.physics.plantUptakeRate);
        }
      }
      
      // Update reservoir capacity if changed
      if (config.reservoir?.capacity !== undefined) {
        this.physicsModel.setReservoirCapacity(config.reservoir.capacity);
      }
      
      this.eventLogger.log(LogLevel.INFO, 'Configuration updated', {
        updatedFields: Object.keys(config)
      });
    } catch (error) {
      this.eventLogger.logError(error as Error, {
        context: 'updateConfig'
      });
      throw error;
    }
  }

  /**
   * Schedule an event from a scenario
   *
   * Used by ScenarioLoader to schedule events
   *
   * @param event - Scenario event to schedule
   */
  scheduleEvent(event: ScenarioEvent): void {
    this.scheduledEvents.push(event);
    this.eventLogger.log(LogLevel.DEBUG, 'Event scheduled', {
      eventTime: event.time,
      eventType: event.type,
      target: event.target
    });
  }

  /**
   * Schedule a failure from a scenario
   *
   * Used by ScenarioLoader to schedule failures
   *
   * @param failure - Scenario failure to schedule
   */
  scheduleFailure(failure: ScenarioFailure): void {
    this.scheduledFailures.push(failure);
    this.eventLogger.log(LogLevel.DEBUG, 'Failure scheduled', {
      actuatorId: failure.actuatorId,
      failureTime: failure.failureTime,
      duration: failure.duration
    });
  }

  // ============================================================================
  // SimulationStateProvider Implementation
  // ============================================================================

  /**
   * Get all sensors (for state persistence)
   * @returns Map of sensor ID to Sensor
   */
  getSensors(): Map<string, Sensor> {
    return this.sensors;
  }

  /**
   * Get all actuators (for state persistence)
   * @returns Map of actuator ID to Actuator
   */
  getActuators(): Map<string, Actuator> {
    return this.actuators;
  }

  /**
   * Get hydroponic state (for state persistence)
   * @returns Current hydroponic state
   */
  getHydroponicState(): HydroponicState {
    return this.physicsModel.getState();
  }

  // ============================================================================
  // SimulationStateRestorer Implementation
  // ============================================================================

  /**
   * Restore sensors from saved state
   * @param sensors - Map of sensor states to restore
   */
  restoreSensors(sensors: Map<string, SerializedSensorState>): void {
    for (const [id, sensorState] of sensors) {
      const sensor = this.sensors.get(id);
      if (sensor) {
        sensor.setBaseline(sensorState.baseline);
        sensor.setNoiseLevel(sensorState.noiseStdDev);
      }
    }
  }

  /**
   * Restore actuators from saved state
   * @param actuators - Map of actuator states to restore
   */
  restoreActuators(actuators: Map<string, SerializedActuatorState>): void {
    for (const [id, actuatorState] of actuators) {
      const actuator = this.actuators.get(id);
      if (actuator) {
        actuator.setState(actuatorState.state);
        // Note: totalRuntime and failed state would need additional methods on Actuator interface
      }
    }
  }

  /**
   * Restore hydroponic state from saved state
   * @param state - Hydroponic state to restore
   */
  restoreHydroponicState(state: HydroponicState): void {
    // Recreate physics model with restored state
    this.physicsModel = new HydroponicPhysicsModelImpl(
      state,
      this.config.physics,
      this.config.reservoir.capacity
    );
  }

  /**
   * Restore configuration from saved state
   * @param config - Configuration to restore
   */
  restoreConfig(config: SimulationConfig): void {
    this.updateConfig(config);
  }

  /**
   * Restore simulated time from saved state
   * @param time - Simulated time to restore
   */
  restoreSimulatedTime(time: number): void {
    // Reset time manager and advance to the saved time
    this.timeManager.reset(this.config.simulation?.timeAcceleration ?? 1);
    // Note: TimeManager doesn't have a direct setSimulatedTime method
    // The time will be restored through the physics model state which includes simulatedTime
  }

  /**
   * Main simulation tick
   * Executes one step of the simulation loop:
   * 1. Calculate time delta
   * 2. Collect actuator effects
   * 3. Update physics model
   * 4. Update sensors
   * 5. Log events
   */
  private tick(): void {
    try {
      // Calculate time delta in hours (for physics calculations)
      const deltaTimeSeconds = 1 / this.tickRate;
      const deltaTimeHours = deltaTimeSeconds / 3600;
      
      // Step 1: Collect actuator effects
      const actuatorEffects = this.collectActuatorEffects(deltaTimeHours);
      
      // Step 2: Update physics model
      this.physicsModel.update(deltaTimeHours, actuatorEffects);
      
      // Step 3: Update sensors from physics state
      const physicsState = this.physicsModel.getState();
      for (const sensor of this.sensors.values()) {
        const oldValue = sensor.getRawValue();
        sensor.updateFromPhysics(physicsState);
        const newValue = sensor.getRawValue();
        
        // Log significant sensor changes (threshold: 1% change or 0.1 absolute)
        const changePercent = Math.abs((newValue - oldValue) / oldValue) * 100;
        const changeAbsolute = Math.abs(newValue - oldValue);
        if (changePercent > 1 || changeAbsolute > 0.1) {
          this.eventLogger.logSensorChange(sensor.id, oldValue, newValue);
        }
      }
      
      // Step 4: Log active actuators (at DEBUG level)
      for (const actuator of this.actuators.values()) {
        const state = actuator.getState();
        if (state.active) {
          this.eventLogger.log(LogLevel.DEBUG, 'Actuator active', {
            actuatorId: actuator.id,
            type: actuator.type,
            state
          });
        }
      }
      
    } catch (error) {
      this.eventLogger.logError(error as Error, {
        context: 'simulation tick'
      });
    }
  }

  /**
   * Collect physics effects from all active actuators
   * @param deltaTimeHours - Time delta in hours
   * @returns Array of physics effects
   */
  private collectActuatorEffects(deltaTimeHours: number): PhysicsEffect[] {
    const effects: PhysicsEffect[] = [];
    
    for (const actuator of this.actuators.values()) {
      const effect = actuator.getPhysicsEffect();
      
      // Scale effect by time delta (effects are specified per hour)
      if (Object.keys(effect).length > 0) {
        const scaledEffect: PhysicsEffect = {};
        
        if (effect.waterDelta !== undefined) {
          scaledEffect.waterDelta = effect.waterDelta * deltaTimeHours;
        }
        if (effect.nutrientDelta !== undefined) {
          scaledEffect.nutrientDelta = effect.nutrientDelta * deltaTimeHours;
        }
        if (effect.temperatureDelta !== undefined) {
          scaledEffect.temperatureDelta = effect.temperatureDelta * deltaTimeHours;
        }
        if (effect.phDelta !== undefined) {
          scaledEffect.phDelta = effect.phDelta * deltaTimeHours;
        }
        
        effects.push(scaledEffect);
      }
    }
    
    return effects;
  }

  /**
   * Calculate initial nutrient concentration from EC
   * Rough approximation: 1 mS/cm ≈ 640 ppm
   * @param ec - Electrical conductivity in mS/cm
   * @returns Nutrient concentration in ppm
   */
  private calculateInitialNutrientConcentration(ec: number): number {
    return ec * 640;
  }
}
