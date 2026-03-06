# Requirements Document

## Introduction

This document defines requirements for a test simulation system for hydroponic integration within the Gladys open source home automation project. The simulation enables developers to test hydroponic monitoring and control features without requiring physical hydroponic hardware. The system simulates sensors (pH, EC, temperature, water level), actuators (pumps, lights, valves), and realistic hydroponic system behaviors.

## Glossary

- **Simulator**: The test simulation system that emulates hydroponic hardware
- **Sensor_Component**: A simulated sensor that generates realistic measurement data
- **Actuator_Component**: A simulated actuator that responds to control commands
- **Hydroponic_System**: The simulated hydroponic environment being monitored
- **Test_Scenario**: A predefined configuration of initial conditions and events
- **Gladys_Integration**: The interface between the Simulator and Gladys home automation system
- **pH**: Measure of acidity/alkalinity in nutrient solution (scale 0-14)
- **EC**: Electrical Conductivity, measure of nutrient concentration in solution
- **Nutrient_Solution**: The water and dissolved nutrients in the hydroponic system

## Requirements

### Requirement 1: Simulate pH Sensor

**User Story:** As a developer, I want to simulate pH sensors, so that I can test pH monitoring features without physical hardware.

#### Acceptance Criteria

1. THE Sensor_Component SHALL generate pH values between 0.0 and 14.0
2. WHEN the Simulator starts, THE Sensor_Component SHALL initialize with a configurable baseline pH value
3. THE Sensor_Component SHALL apply realistic drift over time within ±0.5 pH units per hour
4. WHEN nutrient addition is simulated, THE Sensor_Component SHALL adjust pH values according to nutrient type
5. THE Sensor_Component SHALL include configurable measurement noise within ±0.1 pH units

### Requirement 2: Simulate EC Sensor

**User Story:** As a developer, I want to simulate electrical conductivity sensors, so that I can test nutrient concentration monitoring.

#### Acceptance Criteria

1. THE Sensor_Component SHALL generate EC values between 0.0 and 5.0 mS/cm
2. WHEN the Simulator starts, THE Sensor_Component SHALL initialize with a configurable baseline EC value
3. WHEN water is added to the Hydroponic_System, THE Sensor_Component SHALL decrease EC proportionally to dilution
4. WHEN nutrients are added to the Hydroponic_System, THE Sensor_Component SHALL increase EC proportionally to concentration
5. THE Sensor_Component SHALL include configurable measurement noise within ±0.05 mS/cm

### Requirement 3: Simulate Temperature Sensor

**User Story:** As a developer, I want to simulate temperature sensors, so that I can test temperature monitoring and control features.

#### Acceptance Criteria

1. THE Sensor_Component SHALL generate temperature values between 0.0 and 50.0 degrees Celsius
2. WHEN the Simulator starts, THE Sensor_Component SHALL initialize with a configurable baseline temperature
3. WHEN heating or cooling actuators operate, THE Sensor_Component SHALL adjust temperature at a configurable rate
4. THE Sensor_Component SHALL simulate ambient temperature drift within ±2 degrees Celsius per hour
5. THE Sensor_Component SHALL include configurable measurement noise within ±0.2 degrees Celsius

### Requirement 4: Simulate Water Level Sensor

**User Story:** As a developer, I want to simulate water level sensors, so that I can test reservoir monitoring and refill automation.

#### Acceptance Criteria

1. THE Sensor_Component SHALL generate water level values between 0.0 and 100.0 percent
2. WHEN the Simulator starts, THE Sensor_Component SHALL initialize with a configurable baseline water level
3. THE Sensor_Component SHALL decrease water level over time to simulate evaporation and plant uptake
4. WHEN water pump actuators operate, THE Sensor_Component SHALL adjust water level proportionally to pump duration
5. THE Sensor_Component SHALL include configurable measurement noise within ±1.0 percent

### Requirement 5: Simulate Pump Actuators

**User Story:** As a developer, I want to simulate pump actuators, so that I can test automated dosing and circulation control.

#### Acceptance Criteria

1. WHEN a pump command is received, THE Actuator_Component SHALL transition to the commanded state within 100 milliseconds
2. THE Actuator_Component SHALL maintain state (on/off) until a new command is received
3. WHEN a pump operates, THE Actuator_Component SHALL affect related Sensor_Component values according to pump type
4. THE Actuator_Component SHALL track total runtime for maintenance simulation
5. WHERE pump failure simulation is enabled, THE Actuator_Component SHALL randomly fail with configurable probability

### Requirement 6: Simulate Light Actuators

**User Story:** As a developer, I want to simulate grow light actuators, so that I can test lighting schedules and photoperiod control.

#### Acceptance Criteria

1. WHEN a light command is received, THE Actuator_Component SHALL transition to the commanded state within 100 milliseconds
2. THE Actuator_Component SHALL support intensity control from 0 to 100 percent
3. WHEN lights operate, THE Actuator_Component SHALL affect temperature Sensor_Component values proportionally to intensity
4. THE Actuator_Component SHALL track total runtime for maintenance simulation
5. WHERE light failure simulation is enabled, THE Actuator_Component SHALL randomly fail with configurable probability

### Requirement 7: Simulate Valve Actuators

**User Story:** As a developer, I want to simulate valve actuators, so that I can test automated irrigation and drainage control.

#### Acceptance Criteria

1. WHEN a valve command is received, THE Actuator_Component SHALL transition to the commanded state within 100 milliseconds
2. THE Actuator_Component SHALL maintain state (open/closed) until a new command is received
3. WHEN a valve opens, THE Actuator_Component SHALL affect water level Sensor_Component values according to flow rate
4. THE Actuator_Component SHALL support configurable flow rates for different valve types
5. WHERE valve failure simulation is enabled, THE Actuator_Component SHALL randomly fail with configurable probability

### Requirement 8: Load Test Scenarios

**User Story:** As a developer, I want to load predefined test scenarios, so that I can reproduce specific testing conditions consistently.

#### Acceptance Criteria

1. THE Simulator SHALL parse Test_Scenario configuration files in JSON format
2. WHEN a Test_Scenario is loaded, THE Simulator SHALL initialize all Sensor_Component and Actuator_Component states according to the scenario
3. THE Simulator SHALL validate Test_Scenario configuration against a defined schema
4. WHEN an invalid Test_Scenario is provided, THE Simulator SHALL return a descriptive error message
5. THE Simulator SHALL support Test_Scenario files that define initial values, event sequences, and failure conditions

### Requirement 9: Integrate with Gladys

**User Story:** As a developer, I want the simulator to integrate with Gladys, so that I can test the complete hydroponic integration workflow.

#### Acceptance Criteria

1. THE Gladys_Integration SHALL expose simulated sensors as Gladys device entities
2. THE Gladys_Integration SHALL accept actuator commands through the Gladys device API
3. WHEN Gladys queries sensor values, THE Gladys_Integration SHALL return current simulated values within 50 milliseconds
4. WHEN Gladys sends actuator commands, THE Gladys_Integration SHALL forward commands to Actuator_Component instances within 50 milliseconds
5. THE Gladys_Integration SHALL support the standard Gladys device discovery protocol

### Requirement 10: Simulate Realistic System Dynamics

**User Story:** As a developer, I want the simulator to exhibit realistic hydroponic system behaviors, so that tests accurately reflect real-world conditions.

#### Acceptance Criteria

1. WHEN pH adjusting chemicals are added, THE Hydroponic_System SHALL adjust pH values according to chemical buffering curves
2. WHEN plants consume nutrients, THE Hydroponic_System SHALL decrease EC and water level proportionally over time
3. WHEN temperature changes occur, THE Hydroponic_System SHALL adjust pH values according to temperature-pH relationships
4. THE Hydroponic_System SHALL simulate nutrient lockout conditions when pH exceeds acceptable ranges
5. THE Hydroponic_System SHALL maintain conservation of mass for water and nutrient calculations

### Requirement 11: Configuration Management

**User Story:** As a developer, I want to configure simulation parameters, so that I can test different hydroponic system types and conditions.

#### Acceptance Criteria

1. THE Simulator SHALL load configuration from a JSON configuration file
2. THE Simulator SHALL validate configuration against a defined schema
3. WHEN invalid configuration is provided, THE Simulator SHALL return descriptive error messages
4. THE Simulator SHALL support runtime configuration updates without restart
5. THE Simulator SHALL provide default configuration values for all optional parameters

### Requirement 12: State Persistence

**User Story:** As a developer, I want to save and restore simulation state, so that I can pause and resume long-running tests.

#### Acceptance Criteria

1. WHEN requested, THE Simulator SHALL serialize current state to a JSON file
2. WHEN a state file is provided, THE Simulator SHALL restore all Sensor_Component and Actuator_Component states
3. THE Simulator SHALL validate state files against a defined schema
4. WHEN an invalid state file is provided, THE Simulator SHALL return a descriptive error message
5. FOR ALL valid state objects, saving then loading then saving SHALL produce equivalent state files (round-trip property)

### Requirement 13: Event Logging

**User Story:** As a developer, I want the simulator to log events, so that I can debug test failures and analyze system behavior.

#### Acceptance Criteria

1. WHEN sensor values change, THE Simulator SHALL log the change with timestamp and component identifier
2. WHEN actuator commands are received, THE Simulator SHALL log the command with timestamp and component identifier
3. WHEN errors occur, THE Simulator SHALL log error details with timestamp and context information
4. THE Simulator SHALL support configurable log levels (debug, info, warning, error)
5. THE Simulator SHALL write logs to a file with configurable rotation policy

### Requirement 14: Time Acceleration

**User Story:** As a developer, I want to accelerate simulation time, so that I can test long-duration scenarios quickly.

#### Acceptance Criteria

1. THE Simulator SHALL support configurable time acceleration factors from 1x to 1000x
2. WHEN time acceleration is active, THE Simulator SHALL scale all time-dependent behaviors proportionally
3. THE Simulator SHALL maintain accurate relative timing between all simulated components
4. WHEN time acceleration changes, THE Simulator SHALL adjust ongoing processes within one simulation tick
5. THE Simulator SHALL report simulated time separately from real time in logs and API responses

### Requirement 15: API for Test Automation

**User Story:** As a developer, I want a programmatic API for the simulator, so that I can automate integration tests.

#### Acceptance Criteria

1. THE Simulator SHALL provide a REST API for querying sensor values
2. THE Simulator SHALL provide a REST API for sending actuator commands
3. THE Simulator SHALL provide a REST API for loading Test_Scenario configurations
4. THE Simulator SHALL provide a REST API for controlling simulation state (start, stop, pause, resume)
5. WHEN API requests are malformed, THE Simulator SHALL return HTTP 400 with descriptive error messages
