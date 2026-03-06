#!/usr/bin/env node
/**
 * Main application entry point for the Hydroponic Test Simulation system
 * 
 * This module initializes and starts the complete simulation system including:
 * - Configuration loading
 * - Sensor and actuator initialization
 * - SimulationCore orchestration
 * - Gladys integration adapter
 * - REST API server
 * - Graceful shutdown handling
 * 
 * Requirements: All (application entry)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SimulationCore } from './core/simulation-core';
import { ConfigurationLoader } from './config/configuration-loader';
import { RestAPIServer } from './api/rest-api-server';
import { GladysIntegrationAdapter } from './integration/gladys-integration-adapter';
import { PHSensor } from './sensors/ph-sensor';
import { ECSensor } from './sensors/ec-sensor';
import { TemperatureSensor } from './sensors/temperature-sensor';
import { WaterLevelSensor } from './sensors/water-level-sensor';
import { PumpActuator } from './actuators/pump-actuator';
import { LightActuator } from './actuators/light-actuator';
import { ValveActuator, ValveType } from './actuators/valve-actuator';
import { SimulationConfig, LogLevel, PumpType } from './types';

/**
 * Default configuration file path
 */
const DEFAULT_CONFIG_PATH = './examples/default-config.json';

/**
 * Default API port
 */
const DEFAULT_API_PORT = 3000;

/**
 * Main application class
 */
class HydroponicSimulatorApp {
  private simCore: SimulationCore | null = null;
  private apiServer: RestAPIServer | null = null;
  private gladysAdapter: GladysIntegrationAdapter | null = null;
  private isShuttingDown = false;

  /**
   * Initialize the application
   * 
   * @param configPath - Path to configuration file (optional)
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(configPath?: string): Promise<void> {
    try {
      console.log('🌱 Hydroponic Test Simulation System');
      console.log('=====================================\n');

      // Step 1: Load configuration
      console.log('📋 Loading configuration...');
      const config = this.loadConfiguration(configPath);
      console.log(`✓ Configuration loaded from: ${configPath || DEFAULT_CONFIG_PATH}\n`);

      // Step 2: Initialize SimulationCore
      console.log('🔧 Initializing simulation core...');
      this.simCore = new SimulationCore(config);
      console.log('✓ Simulation core initialized\n');

      // Step 3: Initialize sensors
      console.log('📡 Initializing sensors...');
      this.initializeSensors(config);
      console.log(`✓ Initialized ${this.simCore.getAllSensors().length} sensors\n`);

      // Step 4: Initialize actuators
      console.log('⚙️  Initializing actuators...');
      this.initializeActuators(config);
      console.log(`✓ Initialized ${this.simCore.getAllActuators().length} actuators\n`);

      // Step 5: Initialize Gladys integration
      console.log('🏠 Initializing Gladys integration...');
      this.gladysAdapter = new GladysIntegrationAdapter(this.simCore);
      const devices = this.gladysAdapter.discoverDevices();
      console.log(`✓ Gladys integration ready (${devices.length} devices discovered)\n`);

      // Step 6: Initialize REST API server
      console.log('🌐 Initializing REST API server...');
      this.apiServer = new RestAPIServer(this.simCore);
      console.log('✓ REST API server initialized\n');

      // Step 7: Set up graceful shutdown handlers
      this.setupShutdownHandlers();
      console.log('✓ Shutdown handlers configured\n');

      console.log('✅ Initialization complete!\n');
    } catch (error) {
      console.error('❌ Initialization failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Start the application
   * 
   * @param port - API server port (optional, defaults to 3000)
   * @returns Promise that resolves when the application is running
   */
  async start(port: number = DEFAULT_API_PORT): Promise<void> {
    if (!this.simCore || !this.apiServer) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    try {
      // Start the REST API server
      console.log(`🚀 Starting REST API server on port ${port}...`);
      await this.apiServer.start(port);
      console.log(`✓ REST API server listening on http://localhost:${port}\n`);

      // Start the simulation
      console.log('▶️  Starting simulation...');
      this.simCore.start();
      console.log('✓ Simulation running\n');

      // Display status information
      this.displayStatus(port);

      console.log('\n💡 Press Ctrl+C to stop the simulation\n');
    } catch (error) {
      console.error('❌ Failed to start application:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Stop the application gracefully
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('\n\n🛑 Shutting down gracefully...');

    try {
      // Stop the simulation
      if (this.simCore) {
        console.log('⏸️  Stopping simulation...');
        this.simCore.stop();
        console.log('✓ Simulation stopped');
      }

      // Stop the API server
      if (this.apiServer) {
        console.log('🌐 Stopping REST API server...');
        await this.apiServer.stop();
        console.log('✓ REST API server stopped');
      }

      console.log('\n✅ Shutdown complete. Goodbye! 👋\n');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * Load configuration from file or use defaults
   * 
   * @param configPath - Optional path to configuration file
   * @returns Loaded and validated configuration
   */
  private loadConfiguration(configPath?: string): SimulationConfig {
    const loader = new ConfigurationLoader();
    const path = configPath || DEFAULT_CONFIG_PATH;

    // Check if file exists
    if (!existsSync(path)) {
      throw new Error(
        `Configuration file not found: ${path}\n` +
        `Please create a configuration file or use the default: ${DEFAULT_CONFIG_PATH}`
      );
    }

    return loader.loadFromFile(path);
  }

  /**
   * Initialize all sensors based on configuration
   * 
   * @param config - Simulation configuration
   */
  private initializeSensors(config: SimulationConfig): void {
    if (!this.simCore) {
      throw new Error('SimulationCore not initialized');
    }

    // Initialize pH sensor
    const phSensor = new PHSensor({
      id: config.sensors.ph.id,
      baseline: config.sensors.ph.baseline,
      noiseStdDev: config.sensors.ph.noiseStdDev,
      driftRate: config.sensors.ph.driftRate
    });
    this.simCore.registerSensor(phSensor);

    // Initialize EC sensor
    const ecSensor = new ECSensor({
      id: config.sensors.ec.id,
      baseline: config.sensors.ec.baseline,
      noiseStdDev: config.sensors.ec.noiseStdDev
    });
    this.simCore.registerSensor(ecSensor);

    // Initialize temperature sensor
    const tempSensor = new TemperatureSensor({
      id: config.sensors.temperature.id,
      baseline: config.sensors.temperature.baseline,
      noiseStdDev: config.sensors.temperature.noiseStdDev,
      driftRate: config.sensors.temperature.driftRate
    });
    this.simCore.registerSensor(tempSensor);

    // Initialize water level sensor
    const waterLevelSensor = new WaterLevelSensor({
      id: config.sensors.waterLevel.id,
      baseline: config.sensors.waterLevel.baseline,
      noiseStdDev: config.sensors.waterLevel.noiseStdDev
    });
    this.simCore.registerSensor(waterLevelSensor);
  }

  /**
   * Initialize all actuators based on configuration
   * 
   * @param config - Simulation configuration
   */
  private initializeActuators(config: SimulationConfig): void {
    if (!this.simCore) {
      throw new Error('SimulationCore not initialized');
    }

    // Initialize pumps
    for (const pumpConfig of config.actuators.pumps) {
      const pumpType = this.parsePumpType(pumpConfig.type);
      const pump = new PumpActuator({
        id: pumpConfig.id,
        pumpType,
        flowRate: pumpConfig.flowRate || 1.0,
        failureProbability: pumpConfig.failureProbability
      });
      this.simCore.registerActuator(pump);
    }

    // Initialize lights
    for (const lightConfig of config.actuators.lights) {
      const light = new LightActuator({
        id: lightConfig.id,
        failureProbability: lightConfig.failureProbability
      });
      this.simCore.registerActuator(light);
    }

    // Initialize valves
    for (const valveConfig of config.actuators.valves) {
      const valveType = this.parseValveType(valveConfig.type);
      const valve = new ValveActuator({
        id: valveConfig.id,
        valveType,
        flowRate: valveConfig.flowRate || 1.0,
        failureProbability: valveConfig.failureProbability
      });
      this.simCore.registerActuator(valve);
    }
  }

  /**
   * Parse pump type string to PumpType enum
   * 
   * @param typeStr - Pump type string from configuration
   * @returns PumpType enum value
   */
  private parsePumpType(typeStr: string): PumpType {
    const typeMap: { [key: string]: PumpType } = {
      'water': PumpType.WATER,
      'nutrient': PumpType.NUTRIENT,
      'ph_up': PumpType.PH_UP,
      'ph_down': PumpType.PH_DOWN
    };

    const pumpType = typeMap[typeStr.toLowerCase()];
    if (!pumpType) {
      throw new Error(`Invalid pump type: ${typeStr}. Valid types: water, nutrient, ph_up, ph_down`);
    }

    return pumpType;
  }

  /**
   * Parse valve type string to ValveType enum
   * 
   * @param typeStr - Valve type string from configuration
   * @returns ValveType enum value
   */
  private parseValveType(typeStr: string): ValveType {
    const typeMap: { [key: string]: ValveType } = {
      'inlet': ValveType.INLET,
      'outlet': ValveType.OUTLET,
      'drain': ValveType.OUTLET, // 'drain' is an alias for 'outlet'
      'irrigation': ValveType.OUTLET // 'irrigation' is also an outlet type
    };

    const valveType = typeMap[typeStr.toLowerCase()];
    if (!valveType) {
      throw new Error(`Invalid valve type: ${typeStr}. Valid types: inlet, outlet, drain, irrigation`);
    }

    return valveType;
  }

  /**
   * Set up graceful shutdown handlers for SIGINT and SIGTERM
   */
  private setupShutdownHandlers(): void {
    // Handle Ctrl+C (SIGINT)
    process.on('SIGINT', async () => {
      await this.stop();
    });

    // Handle termination signal (SIGTERM)
    process.on('SIGTERM', async () => {
      await this.stop();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('\n❌ Uncaught exception:', error);
      this.stop();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n❌ Unhandled promise rejection:', reason);
      this.stop();
    });
  }

  /**
   * Display current status information
   * 
   * @param port - API server port
   */
  private displayStatus(port: number): void {
    if (!this.simCore) return;

    const config = this.simCore.getConfig();
    const sensors = this.simCore.getAllSensors();
    const actuators = this.simCore.getAllActuators();

    console.log('📊 System Status');
    console.log('================');
    console.log(`Reservoir Capacity: ${config.reservoir.capacity}L`);
    console.log(`Initial Water Level: ${config.reservoir.initialWaterLevel}%`);
    console.log(`Time Acceleration: ${config.simulation?.timeAcceleration || 1}x`);
    console.log(`Tick Rate: ${config.simulation?.tickRate || 10} Hz`);
    console.log(`\nSensors: ${sensors.length}`);
    sensors.forEach(s => console.log(`  - ${s.id} (${s.type})`));
    console.log(`\nActuators: ${actuators.length}`);
    actuators.forEach(a => console.log(`  - ${a.id} (${a.type})`));
    
    console.log(`\n🔗 Quick Links:`);
    console.log(`  🏠 Welcome Page (all links):`);
    console.log(`     http://localhost:${port}`);
    console.log(`  📊 Dashboard (Monitoring & Control):`);
    console.log(`     http://localhost:${port}/dashboard`);
    console.log(`  📚 API Documentation (Swagger UI):`);
    console.log(`     http://localhost:${port}/api-docs`);
    
    console.log(`\n🌐 API Endpoints:`);
    console.log(`  - GET  http://localhost:${port}/api/sensors`);
    console.log(`  - GET  http://localhost:${port}/api/sensors/:id`);
    console.log(`  - GET  http://localhost:${port}/api/actuators`);
    console.log(`  - POST http://localhost:${port}/api/actuators/:id`);
    console.log(`  - GET  http://localhost:${port}/api/simulation/status`);
    console.log(`  - POST http://localhost:${port}/api/simulation/start`);
    console.log(`  - POST http://localhost:${port}/api/simulation/stop`);
    console.log(`  - POST http://localhost:${port}/api/simulation/pause`);
    console.log(`  - POST http://localhost:${port}/api/simulation/resume`);
  }

  /**
   * Get the Gladys integration adapter
   * 
   * @returns GladysIntegrationAdapter instance
   */
  getGladysAdapter(): GladysIntegrationAdapter | null {
    return this.gladysAdapter;
  }

  /**
   * Get the simulation core
   * 
   * @returns SimulationCore instance
   */
  getSimulationCore(): SimulationCore | null {
    return this.simCore;
  }

  /**
   * Get the REST API server
   * 
   * @returns RestAPIServer instance
   */
  getAPIServer(): RestAPIServer | null {
    return this.apiServer;
  }
}

/**
 * Main entry point
 * 
 * Parses command line arguments and starts the application
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  let port = DEFAULT_API_PORT;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--config' || arg === '-c') {
      configPath = args[++i];
    } else if (arg === '--port' || arg === '-p') {
      port = parseInt(args[++i], 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('❌ Invalid port number. Must be between 1 and 65535.');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      displayHelp();
      process.exit(0);
    } else {
      console.error(`❌ Unknown argument: ${arg}`);
      displayHelp();
      process.exit(1);
    }
  }

  // Create and start the application
  const app = new HydroponicSimulatorApp();
  
  try {
    await app.initialize(configPath);
    await app.start(port);
  } catch (error) {
    console.error('\n❌ Application failed to start:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Hydroponic Test Simulation System
==================================

Usage: node dist/main.js [options]

Options:
  -c, --config <path>   Path to configuration file (default: ${DEFAULT_CONFIG_PATH})
  -p, --port <number>   API server port (default: ${DEFAULT_API_PORT})
  -h, --help            Display this help message

Examples:
  node dist/main.js
  node dist/main.js --config ./my-config.json
  node dist/main.js --port 8080
  node dist/main.js --config ./my-config.json --port 8080

API Documentation:
  See README.md for complete API documentation and usage examples.
`);
}

// Export for testing
export { HydroponicSimulatorApp };

// Run main if this is the entry point
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
