/**
 * REST API Server for Hydroponic Test Simulation
 * 
 * Provides programmatic access for test automation through HTTP endpoints.
 * 
 * Endpoints:
 * - GET /api/sensors - List all sensors
 * - GET /api/sensors/:id - Get sensor value
 * - GET /api/actuators - List all actuators
 * - POST /api/actuators/:id - Send actuator command
 * - POST /api/scenario - Load test scenario
 * - POST /api/simulation/start - Start simulation
 * - POST /api/simulation/stop - Stop simulation
 * - POST /api/simulation/pause - Pause simulation
 * - POST /api/simulation/resume - Resume simulation
 * - GET /api/simulation/status - Get simulation status
 * - POST /api/simulation/time-acceleration - Set time acceleration
 * - POST /api/state/save - Save state to file
 * - POST /api/state/load - Load state from file
 * - GET /api/config - Get full configuration
 * - POST /api/config - Update configuration
 * - GET /api/config/reservoir - Get reservoir configuration
 * - POST /api/config/reservoir - Update reservoir configuration
 * - GET /api/config/sensors - Get sensors configuration
 * - POST /api/config/sensors - Update sensors configuration
 * - GET /api/config/actuators - Get actuators configuration
 * - POST /api/config/actuators - Update actuators configuration
 * - GET /api/config/physics - Get physics configuration
 * - POST /api/config/physics - Update physics configuration
 * - GET /api/config/simulation - Get simulation configuration
 * - POST /api/config/simulation - Update simulation configuration
 * - GET /api/config/logging - Get logging configuration
 * - POST /api/config/logging - Update logging configuration
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { join } from 'path';
import { SimulationCore } from '../core/simulation-core';
import { ActuatorState } from '../types';
import { swaggerSpec } from './swagger';

/**
 * Generic API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  simulatedTime: number;
}

/**
 * Sensor value response
 */
export interface SensorValueResponse {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: number;
}

/**
 * Sensor list item
 */
export interface SensorListItem {
  id: string;
  type: string;
  unit: string;
}

/**
 * Actuator list item
 */
export interface ActuatorListItem {
  id: string;
  type: string;
}

/**
 * Actuator command request
 */
export interface ActuatorCommandRequest {
  state: boolean;
  intensity?: number;
}

/**
 * Simulation status response
 */
export interface SimulationStatusResponse {
  running: boolean;
  paused: boolean;
  simulatedTime: number;
  realTime: number;
  timeAcceleration: number;
}

/**
 * Time acceleration request
 */
export interface TimeAccelerationRequest {
  factor: number;
}

/**
 * Scenario load request
 */
export interface ScenarioLoadRequest {
  filepath: string;
}

/**
 * State save/load request
 */
export interface StateFileRequest {
  filepath: string;
}

/**
 * Configuration update request
 */
export interface ConfigUpdateRequest {
  reservoir?: any;
  sensors?: any;
  actuators?: any;
  physics?: any;
  simulation?: any;
  logging?: any;
}

/**
 * REST API Server class
 */
export class RestAPIServer {
  private app: Express;
  private server: any;
  private simCore: SimulationCore;

  constructor(simCore: SimulationCore) {
    this.simCore = simCore;
    this.app = express();
    
    // Middleware
    this.app.use(express.json());
    
    // Error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.handleError(err, res);
    });
    
    // Setup routes
    this.setupRoutes();
  }

  /**
   * Setup all API routes
   */
  private setupRoutes(): void {
    // Serve static files from examples directory
    this.app.use('/examples', express.static(join(__dirname, '../../examples')));
    
    // Swagger UI documentation
    this.app.use('/api-docs', swaggerUi.serve);
    this.app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Hydroponic Simulation API'
    }));
    
    // Swagger JSON endpoint
    this.app.get('/api-docs.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    // Dashboard endpoint
    this.app.get('/dashboard', (req: Request, res: Response) => {
      res.sendFile(join(__dirname, '../../examples/gladys-dashboard-example.html'));
    });
    
    // Root endpoint - show welcome page with links
    this.app.get('/', (req: Request, res: Response) => {
      const port = (req.socket.address() as any)?.port || 3000;
      const welcomeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hydroponic Test Simulation - Welcome</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      padding: 40px;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 32px;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .links-section {
      margin-bottom: 30px;
    }
    .section-title {
      color: #34495e;
      font-weight: 600;
      margin-bottom: 15px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .link-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .link-card {
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      text-decoration: none;
      color: #2c3e50;
      border: 2px solid transparent;
      transition: all 0.3s;
    }
    .link-card:hover {
      border-color: #667eea;
      background: #f0f3ff;
      transform: translateY(-2px);
    }
    .link-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .link-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .link-desc {
      font-size: 12px;
      color: #7f8c8d;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .status {
      background: #d4edda;
      color: #155724;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .status-icon {
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌱 Hydroponic Test Simulation</h1>
    <p class="subtitle">Welcome! Choose where to go:</p>
    
    <div class="status">
      <span class="status-icon">✅</span>
      <strong>System Running</strong> - API server is active on port ${port}
    </div>
    
    <div class="links-section">
      <div class="section-title">📊 Monitoring & Control</div>
      <div class="link-grid">
        <a href="/dashboard" class="link-card">
          <div class="link-icon">📊</div>
          <div class="link-title">Dashboard</div>
          <div class="link-desc">Real-time monitoring & control</div>
        </a>
        <a href="/api-docs" class="link-card">
          <div class="link-icon">📚</div>
          <div class="link-title">API Docs</div>
          <div class="link-desc">Swagger UI documentation</div>
        </a>
      </div>
    </div>
    
    <div class="links-section">
      <div class="section-title">📖 Documentation</div>
      <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-size: 13px; color: #2c3e50; line-height: 1.8;">
        <strong>Local Documentation:</strong><br>
        📖 README.md - Project overview and setup guide<br>
        🏗️ docs/en/architecture.md - System design and components<br>
        🤖 docs/MCP_INTEGRATION.md - AI assistant integration<br>
        📋 TESTING.md - Complete testing guide<br>
        <br>
        <em style="color: #7f8c8d;">View these files in your project directory or IDE</em>
      </div>
    </div>
    
    <div class="links-section">
      <div class="section-title">🔗 Quick API Endpoints</div>
      <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-size: 12px; font-family: monospace; color: #2c3e50; line-height: 1.6;">
        GET  /api/sensors<br>
        GET  /api/sensors/:id<br>
        GET  /api/actuators<br>
        POST /api/actuators/:id<br>
        GET  /api/simulation/status<br>
        POST /api/simulation/start<br>
        POST /api/simulation/stop
      </div>
    </div>
  </div>
</body>
</html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.send(welcomeHtml);
    });
    
    // Sensor endpoints
    this.app.get('/api/sensors', this.listSensors.bind(this));
    this.app.get('/api/sensors/:id', this.getSensorValue.bind(this));
    
    // Actuator endpoints
    this.app.get('/api/actuators', this.listActuators.bind(this));
    this.app.post('/api/actuators/:id', this.sendActuatorCommand.bind(this));
    
    // Scenario endpoint
    this.app.post('/api/scenario', this.loadScenario.bind(this));
    
    // Simulation control endpoints
    this.app.post('/api/simulation/start', this.startSimulation.bind(this));
    this.app.post('/api/simulation/stop', this.stopSimulation.bind(this));
    this.app.post('/api/simulation/pause', this.pauseSimulation.bind(this));
    this.app.post('/api/simulation/resume', this.resumeSimulation.bind(this));
    this.app.get('/api/simulation/status', this.getSimulationStatus.bind(this));
    this.app.post('/api/simulation/time-acceleration', this.setTimeAcceleration.bind(this));
    
    // State persistence endpoints
    this.app.post('/api/state/save', this.saveState.bind(this));
    this.app.post('/api/state/load', this.loadState.bind(this));
    
    // Configuration management endpoints
    this.app.get('/api/config', this.getConfig.bind(this));
    this.app.post('/api/config', this.updateConfig.bind(this));
    this.app.get('/api/config/reservoir', this.getReservoirConfig.bind(this));
    this.app.post('/api/config/reservoir', this.updateReservoirConfig.bind(this));
    this.app.get('/api/config/sensors', this.getSensorsConfig.bind(this));
    this.app.post('/api/config/sensors', this.updateSensorsConfig.bind(this));
    this.app.get('/api/config/actuators', this.getActuatorsConfig.bind(this));
    this.app.post('/api/config/actuators', this.updateActuatorsConfig.bind(this));
    this.app.get('/api/config/physics', this.getPhysicsConfig.bind(this));
    this.app.post('/api/config/physics', this.updatePhysicsConfig.bind(this));
    this.app.get('/api/config/simulation', this.getSimulationConfig.bind(this));
    this.app.post('/api/config/simulation', this.updateSimulationConfig.bind(this));
    this.app.get('/api/config/logging', this.getLoggingConfig.bind(this));
    this.app.post('/api/config/logging', this.updateLoggingConfig.bind(this));
  }

  /**
   * Start the API server
   * 
   * @param port - Port number to listen on
   */
  start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`REST API server listening on port ${port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: Error) => {
          if (err) {
            reject(err);
          } else {
            console.log('REST API server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }

  // ============================================================================
  // Sensor Endpoints (Requirement 15.1)
  // ============================================================================

  /**
   * GET /api/sensors - List all sensors
   */
  private listSensors(req: Request, res: Response): void {
    try {
      const sensors = this.simCore.getAllSensors();
      const sensorList: SensorListItem[] = sensors.map(sensor => ({
        id: sensor.id,
        type: sensor.type,
        unit: this.getUnitForSensorType(sensor.type)
      }));
      
      this.sendSuccess(res, sensorList);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/sensors/:id - Get sensor value
   * 
   * Requirement 15.1: Provide REST API for querying sensor values
   */
  private getSensorValue(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      
      if (!id) {
        this.sendError(res, 'Sensor ID is required', 400);
        return;
      }
      
      const sensor = this.simCore.getSensor(id);
      const value = sensor.getValue();
      
      const response: SensorValueResponse = {
        id: sensor.id,
        type: sensor.type,
        value,
        unit: this.getUnitForSensorType(sensor.type),
        timestamp: Date.now()
      };
      
      this.sendSuccess(res, response);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  // ============================================================================
  // Actuator Endpoints (Requirement 15.2)
  // ============================================================================

  /**
   * GET /api/actuators - List all actuators
   */
  private listActuators(req: Request, res: Response): void {
    try {
      const actuators = this.simCore.getAllActuators();
      const actuatorList: ActuatorListItem[] = actuators.map(actuator => ({
        id: actuator.id,
        type: actuator.type
      }));
      
      this.sendSuccess(res, actuatorList);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/actuators/:id - Send actuator command
   * 
   * Requirement 15.2: Provide REST API for sending actuator commands
   */
  private sendActuatorCommand(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const command: ActuatorCommandRequest = req.body;
      
      if (!id) {
        this.sendError(res, 'Actuator ID is required', 400);
        return;
      }
      
      if (command.state === undefined) {
        this.sendError(res, 'Command state is required', 400);
        return;
      }
      
      const actuator = this.simCore.getActuator(id);
      
      const actuatorState: ActuatorState = {
        active: command.state,
        intensity: command.intensity,
        timestamp: Date.now()
      };
      
      actuator.setState(actuatorState);
      
      this.sendSuccess(res, { message: 'Actuator command executed successfully' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  // ============================================================================
  // Scenario Endpoint (Requirement 15.3)
  // ============================================================================

  /**
   * POST /api/scenario - Load test scenario
   * 
   * Requirement 15.3: Provide REST API for loading test scenario configurations
   */
  private loadScenario(req: Request, res: Response): void {
    try {
      const request: ScenarioLoadRequest = req.body;
      
      if (!request.filepath) {
        this.sendError(res, 'Scenario filepath is required', 400);
        return;
      }
      
      this.simCore.loadScenario(request.filepath);
      
      this.sendSuccess(res, { message: 'Scenario loaded successfully' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  // ============================================================================
  // Simulation Control Endpoints (Requirement 15.4)
  // ============================================================================

  /**
   * POST /api/simulation/start - Start simulation
   */
  private startSimulation(req: Request, res: Response): void {
    try {
      this.simCore.start();
      this.sendSuccess(res, { message: 'Simulation started' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/simulation/stop - Stop simulation
   */
  private stopSimulation(req: Request, res: Response): void {
    try {
      this.simCore.stop();
      this.sendSuccess(res, { message: 'Simulation stopped' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/simulation/pause - Pause simulation
   */
  private pauseSimulation(req: Request, res: Response): void {
    try {
      this.simCore.pause();
      this.sendSuccess(res, { message: 'Simulation paused' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/simulation/resume - Resume simulation
   */
  private resumeSimulation(req: Request, res: Response): void {
    try {
      this.simCore.resume();
      this.sendSuccess(res, { message: 'Simulation resumed' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/simulation/status - Get simulation status
   * 
   * Requirement 15.4: Provide REST API for controlling simulation state
   */
  private getSimulationStatus(req: Request, res: Response): void {
    try {
      const status: SimulationStatusResponse = {
        running: this.simCore.isRunning(),
        paused: this.simCore.isPaused(),
        simulatedTime: this.simCore.getSimulatedTime(),
        realTime: this.simCore.getRealTime(),
        timeAcceleration: this.simCore.getTimeManager().getAcceleration()
      };
      
      this.sendSuccess(res, status);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/simulation/time-acceleration - Set time acceleration
   */
  private setTimeAcceleration(req: Request, res: Response): void {
    try {
      const request: TimeAccelerationRequest = req.body;
      
      if (request.factor === undefined) {
        this.sendError(res, 'Time acceleration factor is required', 400);
        return;
      }
      
      if (typeof request.factor !== 'number') {
        this.sendError(res, 'Time acceleration factor must be a number', 400);
        return;
      }
      
      this.simCore.setTimeAcceleration(request.factor);
      
      this.sendSuccess(res, { message: 'Time acceleration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  // ============================================================================
  // State Persistence Endpoints
  // ============================================================================

  /**
   * POST /api/state/save - Save state to file
   */
  private saveState(req: Request, res: Response): void {
    try {
      const request: StateFileRequest = req.body;
      
      if (!request.filepath) {
        this.sendError(res, 'State filepath is required', 400);
        return;
      }
      
      this.simCore.saveState(request.filepath);
      
      this.sendSuccess(res, { message: 'State saved successfully' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/state/load - Load state from file
   */
  private loadState(req: Request, res: Response): void {
    try {
      const request: StateFileRequest = req.body;
      
      if (!request.filepath) {
        this.sendError(res, 'State filepath is required', 400);
        return;
      }
      
      this.simCore.loadState(request.filepath);
      
      this.sendSuccess(res, { message: 'State loaded successfully' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  // ============================================================================
  // Configuration Management Endpoints
  // ============================================================================

  /**
   * GET /api/config - Get full configuration
   */
  private getConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config - Update configuration
   */
  private updateConfig(req: Request, res: Response): void {
    try {
      const config = req.body;
      this.simCore.updateConfig(config);
      this.sendSuccess(res, { message: 'Configuration updated successfully' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/config/reservoir - Get reservoir configuration
   */
  private getReservoirConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config.reservoir);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config/reservoir - Update reservoir configuration
   */
  private updateReservoirConfig(req: Request, res: Response): void {
    try {
      const reservoir = req.body;
      this.simCore.updateConfig({ reservoir });
      this.sendSuccess(res, { message: 'Reservoir configuration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/config/sensors - Get sensors configuration
   */
  private getSensorsConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config.sensors);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config/sensors - Update sensors configuration
   */
  private updateSensorsConfig(req: Request, res: Response): void {
    try {
      const sensors = req.body;
      this.simCore.updateConfig({ sensors });
      this.sendSuccess(res, { message: 'Sensors configuration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/config/actuators - Get actuators configuration
   */
  private getActuatorsConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config.actuators);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config/actuators - Update actuators configuration
   */
  private updateActuatorsConfig(req: Request, res: Response): void {
    try {
      const actuators = req.body;
      this.simCore.updateConfig({ actuators });
      this.sendSuccess(res, { message: 'Actuators configuration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/config/physics - Get physics configuration
   */
  private getPhysicsConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config.physics);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config/physics - Update physics configuration
   */
  private updatePhysicsConfig(req: Request, res: Response): void {
    try {
      const physics = req.body;
      this.simCore.updateConfig({ physics });
      this.sendSuccess(res, { message: 'Physics configuration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/config/simulation - Get simulation configuration
   */
  private getSimulationConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config.simulation);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config/simulation - Update simulation configuration
   */
  private updateSimulationConfig(req: Request, res: Response): void {
    try {
      const simulation = req.body;
      this.simCore.updateConfig({ simulation });
      this.sendSuccess(res, { message: 'Simulation configuration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * GET /api/config/logging - Get logging configuration
   */
  private getLoggingConfig(req: Request, res: Response): void {
    try {
      const config = this.simCore.getConfig();
      this.sendSuccess(res, config.logging);
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  /**
   * POST /api/config/logging - Update logging configuration
   */
  private updateLoggingConfig(req: Request, res: Response): void {
    try {
      const logging = req.body;
      this.simCore.updateConfig({ logging });
      this.sendSuccess(res, { message: 'Logging configuration updated' });
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Send successful response
   * 
   * @param res - Express response object
   * @param data - Response data
   */
  private sendSuccess<T>(res: Response, data: T): void {
    const response: APIResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
      simulatedTime: this.simCore.getSimulatedTime()
    };
    
    res.status(200).json(response);
  }

  /**
   * Send error response
   * 
   * Requirement 15.5: Return HTTP 400 with descriptive error messages for malformed requests
   * 
   * @param res - Express response object
   * @param error - Error message
   * @param statusCode - HTTP status code (default 400)
   */
  private sendError(res: Response, error: string, statusCode: number = 400): void {
    const response: APIResponse = {
      success: false,
      error,
      timestamp: Date.now(),
      simulatedTime: this.simCore.getSimulatedTime()
    };
    
    res.status(statusCode).json(response);
  }

  /**
   * Handle errors and send appropriate response
   * 
   * @param error - Error object
   * @param res - Express response object
   */
  private handleError(error: Error, res: Response): void {
    console.error('API Error:', error);
    
    // Determine status code based on error type
    let statusCode = 500;
    let message = error.message;
    
    if (message.includes('not found')) {
      statusCode = 404;
    } else if (message.includes('required') || message.includes('invalid') || message.includes('must be')) {
      statusCode = 400;
    }
    
    this.sendError(res, message, statusCode);
  }

  /**
   * Get unit string for sensor type
   * 
   * @param sensorType - Sensor type
   * @returns Unit string
   */
  private getUnitForSensorType(sensorType: string): string {
    switch (sensorType) {
      case 'ph':
        return 'pH';
      case 'ec':
        return 'mS/cm';
      case 'temperature':
        return '°C';
      case 'water_level':
        return '%';
      default:
        return '';
    }
  }
}
