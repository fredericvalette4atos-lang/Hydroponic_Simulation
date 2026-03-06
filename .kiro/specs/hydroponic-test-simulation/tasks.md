# Implementation Plan: Hydroponic Test Simulation

## Overview

This implementation plan breaks down the hydroponic test simulation system into discrete coding tasks. The system will be built in TypeScript with Node.js, using fast-check for property-based testing. The implementation follows a bottom-up approach: core data structures and models first, then components, then integration layers, and finally the API and orchestration.

The plan includes 53 property-based tests corresponding to each correctness property in the design document, with a minimum of 100 iterations per test. Testing tasks are marked as optional with `*` to allow for faster MVP delivery.

## Tasks

- [x] 1. Project setup and dependencies
  - Initialize Node.js/TypeScript project with tsconfig.json
  - Install dependencies: express, fast-check, jest, ajv (JSON schema validation)
  - Set up project structure with src/ and tests/ directories
  - Configure Jest for TypeScript with coverage reporting
  - Create package.json scripts for build, test, and dev
  - _Requirements: All (foundational)_

- [x] 2. Core data models and type definitions
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define SensorType, ActuatorType, LogLevel enums
    - Define Sensor, Actuator, SensorReading, ActuatorState interfaces
    - Define HydroponicState, PhysicsEffect, TimeState interfaces
    - Define SimulationConfig, TestScenario, SimulationState interfaces
    - Define GladysDevice, GladysFeature, ActuatorCommand interfaces
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 11.1, 12.1, 14.1, 15.1_
  
  - [x] 2.2 Write property test for data model serialization
    - **Property 20: Scenario parsing round-trip**
    - **Property 33: Configuration parsing round-trip**
    - **Property 37: State persistence round-trip**
    - **Validates: Requirements 8.1, 11.1, 12.1, 12.5**

- [x] 3. JSON schema definitions and validation
  - [x] 3.1 Create JSON schemas for configuration, scenarios, and state
    - Define configuration schema with reservoir, sensors, actuators, physics sections
    - Define scenario schema with initialState and events
    - Define state persistence schema
    - Implement schema validation using ajv library
    - _Requirements: 8.3, 11.2, 12.3_
  
  - [x] 3.2 Write property tests for schema validation
    - **Property 22: Scenario validation**
    - **Property 34: Configuration validation**
    - **Property 38: State validation**
    - **Validates: Requirements 8.3, 8.4, 11.2, 11.3, 12.3, 12.4_

- [x] 4. Chemistry model implementation
  - [x] 4.1 Implement ChemistryModel class
    - Implement calculatePHFromTemperature method (temperature-pH coupling)
    - Implement applyPHBuffer method (buffering curves)
    - Implement calculatePHFromNutrientAddition method
    - Implement calculateECFromNutrients and calculateECFromDilution methods
    - Implement isNutrientLockout and getLockoutFactor methods
    - _Requirements: 10.1, 10.3, 10.4, 2.3, 2.4_
  
  - [x] 4.2 Write property tests for chemistry model
    - **Property 28: pH chemical buffering**
    - **Property 30: Temperature-pH coupling**
    - **Property 31: Nutrient lockout simulation**
    - **Property 6: EC dilution relationship**
    - **Property 7: EC concentration relationship**
    - **Validates: Requirements 10.1, 10.3, 10.4, 2.3, 2.4**
  
  - [x] 4.3 Write unit tests for chemistry model
    - Test edge cases: extreme pH values, zero temperature, zero concentration
    - Test specific examples with known chemical relationships
    - _Requirements: 10.1, 10.3, 10.4_

- [x] 5. Hydroponic physics model implementation
  - [x] 5.1 Implement HydroponicPhysicsModel class
    - Implement update method with time-stepping logic
    - Implement applyEvaporation method (water loss over time)
    - Implement applyPlantUptake method (water and nutrient consumption)
    - Implement applyTemperatureDrift method (ambient temperature effects)
    - Implement applyPHDrift method (natural pH changes)
    - Implement applyActuatorEffects method (process PhysicsEffect objects)
    - Implement updateWaterLevel method (convert volume to percentage)
    - Integrate ChemistryModel for chemical interactions
    - _Requirements: 10.2, 10.5, 4.3, 3.4, 1.3_
  
  - [x] 5.2 Write property tests for physics model
    - **Property 9: Water level evaporation and uptake**
    - **Property 29: Plant nutrient consumption**
    - **Property 32: Mass conservation**
    - **Validates: Requirements 10.2, 10.5, 4.3**
  
  - [x] 5.3 Write unit tests for physics model
    - Test specific evaporation scenarios
    - Test plant uptake with known rates
    - Test mass balance calculations
    - _Requirements: 10.2, 10.5_

- [x] 6. Sensor component implementations
  - [x] 6.1 Implement base Sensor interface and PHSensor class
    - Implement getValue with Gaussian noise generation
    - Implement getRawValue (no noise)
    - Implement setBaseline and setNoiseLevel methods
    - Implement updateFromPhysics to read pH from HydroponicState
    - Implement drift simulation over time
    - Add value bounds validation (0.0-14.0)
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 6.2 Implement ECSensor class
    - Implement getValue with noise (±0.05 mS/cm)
    - Implement updateFromPhysics to read EC from HydroponicState
    - Add value bounds validation (0.0-5.0 mS/cm)
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 6.3 Implement TemperatureSensor class
    - Implement getValue with noise (±0.2°C)
    - Implement updateFromPhysics to read temperature from HydroponicState
    - Implement drift simulation (±2°C/hour)
    - Add value bounds validation (0.0-50.0°C)
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 6.4 Implement WaterLevelSensor class
    - Implement getValue with noise (±1.0%)
    - Implement updateFromPhysics to read water level from HydroponicState
    - Add value bounds validation (0.0-100.0%)
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 6.5 Write property tests for sensor components
    - **Property 1: Sensor value bounds**
    - **Property 2: Sensor baseline initialization**
    - **Property 3: Sensor measurement noise bounds**
    - **Property 4: Sensor drift constraints**
    - **Property 5: pH response to nutrient addition**
    - **Property 8: Temperature response to actuators**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.5**
  
  - [x] 6.6 Write unit tests for sensor components
    - Test each sensor type with specific baseline values
    - Test noise generation distribution
    - Test bounds rejection (values outside valid ranges)
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 7. Actuator component implementations
  - [x] 7.1 Implement base Actuator interface and PumpActuator class
    - Implement setState with response time tracking (<100ms)
    - Implement getState for state persistence
    - Implement failure simulation with configurable probability
    - Implement getTotalRuntime for maintenance tracking
    - Implement getPhysicsEffect for different pump types (water, nutrient, pH_up, pH_down)
    - Support pump types: WATER, NUTRIENT, PH_UP, PH_DOWN
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 7.2 Implement LightActuator class
    - Implement setState with intensity control (0-100%)
    - Implement getPhysicsEffect (temperature increase proportional to intensity)
    - Implement failure simulation
    - Implement runtime tracking
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 7.3 Implement ValveActuator class
    - Implement setState for open/closed control
    - Implement getPhysicsEffect with configurable flow rates
    - Implement failure simulation
    - Support different valve types with different flow rates
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 7.4 Write property tests for actuator components
    - **Property 11: Actuator response time**
    - **Property 12: Actuator state persistence**
    - **Property 13: Pump effect on sensors**
    - **Property 14: Actuator runtime accumulation**
    - **Property 15: Actuator failure probability**
    - **Property 16: Light intensity range**
    - **Property 17: Light effect on temperature**
    - **Property 18: Valve effect on water level**
    - **Property 19: Valve flow rate configuration**
    - **Property 10: Water level response to pump**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 4.4**
  
  - [x] 7.5 Write unit tests for actuator components
    - Test specific pump types with known flow rates
    - Test light intensity edge cases (0%, 100%, invalid values)
    - Test valve state transitions
    - Test failure scenarios
    - _Requirements: 5.1, 6.1, 7.1_

- [x] 8. Time management implementation
  - [x] 8.1 Implement TimeManager class
    - Implement time acceleration with configurable factor (1x-1000x)
    - Implement getSimulatedTime and getRealTime methods
    - Implement setTimeAcceleration with immediate effect
    - Track both real time and simulated time separately
    - Implement pause/resume functionality
    - _Requirements: 14.1, 14.2, 14.4, 14.5_
  
  - [x] 8.2 Write property tests for time management
    - **Property 44: Time acceleration range**
    - **Property 45: Time acceleration proportionality**
    - **Property 46: Relative timing preservation**
    - **Property 47: Time acceleration responsiveness**
    - **Property 48: Dual time reporting**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
  
  - [x] 8.3 Write unit tests for time management
    - Test specific acceleration factors (1x, 10x, 100x, 1000x)
    - Test pause/resume behavior
    - Test time reporting accuracy
    - _Requirements: 14.1, 14.5_

- [x] 9. Event logging implementation
  - [x] 9.1 Implement EventLogger class
    - Implement log method with level filtering
    - Implement logSensorChange method
    - Implement logActuatorCommand method
    - Implement logError method with stack traces
    - Implement file writing with rotation policy (daily or size-based)
    - Include both real time and simulated time in all log entries
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 9.2 Write property tests for event logging
    - **Property 39: Sensor change logging**
    - **Property 40: Actuator command logging**
    - **Property 41: Error logging**
    - **Property 42: Log level filtering**
    - **Property 43: Log file rotation**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**
  
  - [x] 9.3 Write unit tests for event logging
    - Test log level filtering with specific examples
    - Test file rotation triggers
    - Test log entry format
    - _Requirements: 13.4, 13.5_

- [x] 10. Configuration management implementation
  - [x] 10.1 Implement ConfigurationLoader class
    - Implement loadFromFile method with JSON parsing
    - Implement validate method using ajv and JSON schema
    - Implement applyDefaults method for optional parameters
    - Provide descriptive error messages for validation failures
    - Define DEFAULT_CONFIG constant with sensible defaults
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  
  - [x] 10.2 Write property tests for configuration management
    - **Property 35: Runtime configuration updates**
    - **Property 36: Configuration default values**
    - **Validates: Requirements 11.4, 11.5**
  
  - [x] 10.3 Write unit tests for configuration management
    - Test loading valid configuration files
    - Test validation error messages for invalid configs
    - Test default value application
    - _Requirements: 11.2, 11.3, 11.5_

- [x] 11. Test scenario management implementation
  - [x] 11.1 Implement ScenarioLoader class
    - Implement loadFromFile method with JSON parsing
    - Implement validate method using ajv and JSON schema
    - Implement applyScenario method to initialize simulation state
    - Support initial state, event sequences, and failure conditions
    - Provide descriptive error messages for validation failures
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 11.2 Write property tests for scenario management
    - **Property 21: Scenario state initialization**
    - **Property 23: Scenario feature support**
    - **Validates: Requirements 8.2, 8.5**
  
  - [x] 11.3 Write unit tests for scenario management
    - Test loading valid scenario files
    - Test validation error messages for invalid scenarios
    - Test event scheduling
    - Test failure condition setup
    - _Requirements: 8.3, 8.4_

- [x] 12. State persistence implementation
  - [x] 12.1 Implement StatePersistence class
    - Implement save method to serialize state to JSON file
    - Implement load method to deserialize state from JSON file
    - Implement validate method using ajv and JSON schema
    - Implement serializeSensors and serializeActuators helper methods
    - Implement restoreState method to apply loaded state
    - Include version, timestamp, and simulated time in state files
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 12.2 Write unit tests for state persistence
    - Test save/load round-trip with specific states
    - Test validation error messages for invalid state files
    - Test state restoration accuracy
    - _Requirements: 12.3, 12.4_

- [x] 13. Simulation core implementation
  - [x] 13.1 Implement SimulationCore class
    - Implement start, stop, pause, resume lifecycle methods
    - Implement main simulation loop with time-stepping
    - Implement component registration (sensors and actuators)
    - Implement getSensor and getActuator accessor methods
    - Integrate TimeManager for time control
    - Integrate EventLogger for logging
    - Integrate HydroponicPhysicsModel for state updates
    - Implement simulation tick: actuator processing → physics update → sensor update → logging
    - _Requirements: All (orchestration)_
  
  - [x] 13.2 Implement simulation state management in SimulationCore
    - Implement setTimeAcceleration method
    - Implement getSimulatedTime and getRealTime methods
    - Implement saveState and loadState methods (delegate to StatePersistence)
    - Implement loadScenario method (delegate to ScenarioLoader)
    - Implement updateConfig method for runtime configuration changes
    - _Requirements: 11.4, 12.1, 12.2, 14.1, 8.2_
  
  - [x] 13.3 Write unit tests for simulation core
    - Test lifecycle transitions (start → pause → resume → stop)
    - Test component registration and retrieval
    - Test simulation tick execution order
    - Test integration between all subsystems
    - _Requirements: All (integration)_

- [x] 14. Checkpoint - Core simulation engine complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Gladys integration adapter implementation
  - [x] 15.1 Implement GladysIntegrationAdapter class
    - Implement discoverDevices method to expose all sensors and actuators
    - Implement createGladysDevice helper to convert simulator components to Gladys devices
    - Implement getSensorValue method with <50ms response time
    - Implement sendActuatorCommand method with <50ms response time
    - Implement registerDevice and unregisterDevice methods
    - Maintain deviceMap for Gladys ID to Simulator ID mapping
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 15.2 Write property tests for Gladys integration
    - **Property 24: Gladys sensor registration**
    - **Property 25: Gladys actuator command handling**
    - **Property 26: Gladys API response time**
    - **Property 27: Gladys discovery protocol compliance**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
  
  - [x] 15.3 Write unit tests for Gladys integration
    - Test device discovery with specific sensor/actuator configurations
    - Test Gladys device format compliance
    - Test command forwarding accuracy
    - Test response time measurements
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 16. REST API implementation
  - [x] 16.1 Implement REST API server with Express
    - Set up Express server with JSON body parsing
    - Implement GET /api/sensors endpoint (list all sensors)
    - Implement GET /api/sensors/:id endpoint (get sensor value)
    - Implement GET /api/actuators endpoint (list all actuators)
    - Implement POST /api/actuators/:id endpoint (send actuator command)
    - Implement POST /api/scenario endpoint (load test scenario)
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 16.2 Implement simulation control endpoints
    - Implement POST /api/simulation/start endpoint
    - Implement POST /api/simulation/stop endpoint
    - Implement POST /api/simulation/pause endpoint
    - Implement POST /api/simulation/resume endpoint
    - Implement GET /api/simulation/status endpoint
    - Implement POST /api/simulation/time-acceleration endpoint
    - _Requirements: 15.4_
  
  - [x] 16.3 Implement state persistence endpoints
    - Implement POST /api/state/save endpoint
    - Implement POST /api/state/load endpoint
    - _Requirements: 12.1, 12.2_
  
  - [x] 16.4 Implement API error handling and response formatting
    - Implement APIResponse wrapper with success, data, error, timestamp, simulatedTime
    - Implement HTTP 400 error responses for malformed requests
    - Implement request validation for all endpoints
    - Add descriptive error messages for all error conditions
    - _Requirements: 15.5_
  
  - [x] 16.5 Write property tests for REST API
    - **Property 49: REST API sensor query**
    - **Property 50: REST API actuator command**
    - **Property 51: REST API scenario loading**
    - **Property 52: REST API simulation control**
    - **Property 53: REST API error handling**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
  
  - [x] 16.6 Write unit tests for REST API
    - Test each endpoint with valid requests
    - Test error responses for invalid requests
    - Test response format compliance
    - Test HTTP status codes
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 17. Custom generators for property-based testing
  - [x] 17.1 Create fast-check arbitrary generators
    - Implement arbPH (0.0-14.0)
    - Implement arbEC (0.0-5.0 mS/cm)
    - Implement arbTemperature (0.0-50.0°C)
    - Implement arbWaterLevel (0.0-100.0%)
    - Implement arbSensorReading with all fields
    - Implement arbHydroponicState with all fields
    - Implement arbActuatorCommand with all fields
    - Implement arbSimulationConfig with nested structures
    - Implement arbTestScenario with events and failures
    - _Requirements: All (testing infrastructure)_

- [x] 18. Integration and wiring
  - [x] 18.1 Create main application entry point
    - Implement main function to initialize SimulationCore
    - Load configuration from file or use defaults
    - Initialize all sensors and actuators based on configuration
    - Initialize GladysIntegrationAdapter
    - Initialize and start REST API server
    - Set up graceful shutdown handlers
    - _Requirements: All (application entry)_
  
  - [x] 18.2 Create example configuration files
    - Create default-config.json with sensible defaults
    - Create example-scenario.json with sample test scenario
    - Create README.md with usage instructions
    - _Requirements: 11.1, 8.1_
  
  - [x] 18.3 Write end-to-end integration tests
    - Test complete workflow: start simulation → load scenario → query sensors → send commands → save state → load state
    - Test Gladys integration workflow
    - Test REST API workflow
    - Test time acceleration with long-running scenarios
    - _Requirements: All (end-to-end validation)_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests use fast-check with minimum 100 iterations per test
- All 53 correctness properties from the design document are covered in property test tasks
- Unit tests complement property tests by covering specific examples and edge cases
- Checkpoints ensure incremental validation at major milestones
- The implementation follows a bottom-up approach: models → components → integration → API
- TypeScript provides type safety and better IDE support
- Jest provides comprehensive testing framework with coverage reporting
