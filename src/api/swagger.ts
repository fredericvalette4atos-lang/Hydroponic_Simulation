/**
 * Swagger/OpenAPI Configuration
 * 
 * Defines the OpenAPI specification for the Hydroponic Test Simulation REST API
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hydroponic Test Simulation API',
      version: '1.0.0',
      description: 'REST API for the Hydroponic Test Simulation System - a comprehensive simulator for testing hydroponic monitoring and control features without physical hardware.',
      contact: {
        name: 'API Support',
        url: 'https://github.com/gladysassistant/gladys'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Sensors',
        description: 'Sensor monitoring endpoints'
      },
      {
        name: 'Actuators',
        description: 'Actuator control endpoints'
      },
      {
        name: 'Simulation',
        description: 'Simulation control and status endpoints'
      },
      {
        name: 'Scenarios',
        description: 'Test scenario management'
      },
      {
        name: 'State',
        description: 'State persistence endpoints'
      }
    ],
    components: {
      schemas: {
        APIResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            error: {
              type: 'string',
              description: 'Error message (only present if success is false)'
            },
            timestamp: {
              type: 'number',
              description: 'Real timestamp in milliseconds since epoch'
            },
            simulatedTime: {
              type: 'number',
              description: 'Simulated time in seconds'
            }
          },
          required: ['success', 'timestamp', 'simulatedTime']
        },
        SensorReading: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Sensor identifier',
              example: 'ph-sensor-1'
            },
            type: {
              type: 'string',
              enum: ['ph', 'ec', 'temperature', 'water_level'],
              description: 'Sensor type'
            },
            value: {
              type: 'number',
              description: 'Current sensor reading',
              example: 6.5
            },
            unit: {
              type: 'string',
              description: 'Measurement unit',
              example: 'pH'
            },
            timestamp: {
              type: 'number',
              description: 'Reading timestamp in milliseconds'
            }
          }
        },
        ActuatorInfo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Actuator identifier',
              example: 'water-pump-1'
            },
            type: {
              type: 'string',
              enum: ['pump', 'light', 'valve'],
              description: 'Actuator type'
            },
            state: {
              type: 'object',
              properties: {
                active: {
                  type: 'boolean',
                  description: 'Whether the actuator is currently active'
                },
                intensity: {
                  type: 'number',
                  description: 'Intensity level (0-100%, only for lights)',
                  minimum: 0,
                  maximum: 100
                },
                timestamp: {
                  type: 'number',
                  description: 'State change timestamp'
                }
              }
            },
            totalRuntime: {
              type: 'number',
              description: 'Total runtime in seconds'
            }
          }
        },
        ActuatorCommand: {
          type: 'object',
          properties: {
            state: {
              type: 'boolean',
              description: 'Desired actuator state (true = on, false = off)',
              example: true
            },
            intensity: {
              type: 'number',
              description: 'Intensity level (0-100%, only for lights)',
              minimum: 0,
              maximum: 100,
              example: 75
            }
          },
          required: ['state']
        },
        SimulationStatus: {
          type: 'object',
          properties: {
            running: {
              type: 'boolean',
              description: 'Whether the simulation is running'
            },
            paused: {
              type: 'boolean',
              description: 'Whether the simulation is paused'
            },
            simulatedTime: {
              type: 'number',
              description: 'Current simulated time in seconds'
            },
            realTime: {
              type: 'number',
              description: 'Real elapsed time in seconds'
            },
            timeAcceleration: {
              type: 'number',
              description: 'Current time acceleration factor',
              minimum: 1,
              maximum: 1000
            }
          }
        },
        TimeAccelerationRequest: {
          type: 'object',
          properties: {
            factor: {
              type: 'number',
              description: 'Time acceleration factor (1-1000x)',
              minimum: 1,
              maximum: 1000,
              example: 10
            }
          },
          required: ['factor']
        },
        ScenarioRequest: {
          type: 'object',
          properties: {
            filepath: {
              type: 'string',
              description: 'Path to scenario JSON file',
              example: './examples/scenarios/ph-adjustment.json'
            }
          },
          required: ['filepath']
        },
        StateFileRequest: {
          type: 'object',
          properties: {
            filepath: {
              type: 'string',
              description: 'Path to state file',
              example: './saved-state.json'
            }
          },
          required: ['filepath']
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Sensor not found'
            },
            timestamp: {
              type: 'number'
            },
            simulatedTime: {
              type: 'number'
            }
          }
        }
      }
    }
  },
  apis: ['./src/api/rest-api-server.ts'] // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
