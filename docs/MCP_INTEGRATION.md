# MCP (Model Context Protocol) Integration

## Overview

The Model Context Protocol (MCP) is an open protocol that enables seamless integration between AI applications and external data sources. This document explores how the Hydroponic Test Simulation could be exposed as an MCP server, allowing AI assistants to interact with the simulation programmatically.

## What is MCP?

MCP provides a standardized way for AI applications to:
- **Access Resources**: Read data from external systems (sensors, logs, configurations)
- **Execute Tools**: Perform actions (control actuators, run scenarios, adjust settings)
- **Receive Prompts**: Get context-aware suggestions and templates

## Why MCP for Hydroponic Simulation?

### Benefits

1. **AI-Powered Monitoring**: AI assistants can monitor sensor values and provide insights
2. **Intelligent Automation**: AI can suggest or execute optimal control strategies
3. **Natural Language Control**: Users can control the simulation using conversational commands
4. **Automated Testing**: AI can generate and execute test scenarios
5. **Anomaly Detection**: AI can identify unusual patterns in sensor data
6. **Documentation Generation**: AI can create reports from simulation data

### Use Cases

- **"What's the current pH level?"** → AI reads sensor via MCP
- **"Adjust pH to 6.0"** → AI calculates and executes pump commands
- **"Run a stress test scenario"** → AI generates and loads test scenario
- **"Why is the EC increasing?"** → AI analyzes sensor trends and actuator history
- **"Generate a report of today's simulation"** → AI compiles data into readable format

## Proposed MCP Server Architecture

### Resources

Resources provide read-only access to simulation data:

```json
{
  "resources": [
    {
      "uri": "hydroponic://sensors/ph",
      "name": "pH Sensor Reading",
      "description": "Current pH level of the nutrient solution",
      "mimeType": "application/json"
    },
    {
      "uri": "hydroponic://sensors/ec",
      "name": "EC Sensor Reading",
      "description": "Current electrical conductivity",
      "mimeType": "application/json"
    },
    {
      "uri": "hydroponic://sensors/temperature",
      "name": "Temperature Sensor Reading",
      "description": "Current solution temperature",
      "mimeType": "application/json"
    },
    {
      "uri": "hydroponic://sensors/water-level",
      "name": "Water Level Sensor Reading",
      "description": "Current water level percentage",
      "mimeType": "application/json"
    },
    {
      "uri": "hydroponic://status",
      "name": "Simulation Status",
      "description": "Current simulation state and timing information",
      "mimeType": "application/json"
    },
    {
      "uri": "hydroponic://logs/events",
      "name": "Event Logs",
      "description": "Recent simulation events and state changes",
      "mimeType": "application/json"
    },
    {
      "uri": "hydroponic://config",
      "name": "Configuration",
      "description": "Current simulation configuration",
      "mimeType": "application/json"
    }
  ]
}
```

### Tools

Tools allow AI to perform actions on the simulation:

```json
{
  "tools": [
    {
      "name": "read_sensor",
      "description": "Read current value from a specific sensor",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sensor_id": {
            "type": "string",
            "enum": ["ph-sensor-1", "ec-sensor-1", "temp-sensor-1", "water-level-sensor-1"],
            "description": "Sensor identifier"
          }
        },
        "required": ["sensor_id"]
      }
    },
    {
      "name": "control_actuator",
      "description": "Turn an actuator on or off",
      "inputSchema": {
        "type": "object",
        "properties": {
          "actuator_id": {
            "type": "string",
            "description": "Actuator identifier"
          },
          "state": {
            "type": "boolean",
            "description": "Desired state (true=on, false=off)"
          },
          "intensity": {
            "type": "number",
            "description": "Intensity for lights (0-100)",
            "minimum": 0,
            "maximum": 100
          }
        },
        "required": ["actuator_id", "state"]
      }
    },
    {
      "name": "adjust_ph",
      "description": "Automatically adjust pH to target value",
      "inputSchema": {
        "type": "object",
        "properties": {
          "target_ph": {
            "type": "number",
            "description": "Target pH value",
            "minimum": 0,
            "maximum": 14
          },
          "max_adjustment_time": {
            "type": "number",
            "description": "Maximum time to run pumps (seconds)",
            "default": 10
          }
        },
        "required": ["target_ph"]
      }
    },
    {
      "name": "load_scenario",
      "description": "Load and apply a test scenario",
      "inputSchema": {
        "type": "object",
        "properties": {
          "filepath": {
            "type": "string",
            "description": "Path to scenario JSON file"
          }
        },
        "required": ["filepath"]
      }
    },
    {
      "name": "set_time_acceleration",
      "description": "Change simulation time acceleration",
      "inputSchema": {
        "type": "object",
        "properties": {
          "factor": {
            "type": "number",
            "description": "Time acceleration factor (1-1000)",
            "minimum": 1,
            "maximum": 1000
          }
        },
        "required": ["factor"]
      }
    },
    {
      "name": "start_simulation",
      "description": "Start the simulation",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "stop_simulation",
      "description": "Stop the simulation",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "save_state",
      "description": "Save current simulation state to file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "filepath": {
            "type": "string",
            "description": "Path to save state file"
          }
        },
        "required": ["filepath"]
      }
    },
    {
      "name": "load_state",
      "description": "Load simulation state from file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "filepath": {
            "type": "string",
            "description": "Path to state file"
          }
        },
        "required": ["filepath"]
      }
    },
    {
      "name": "get_sensor_history",
      "description": "Get historical sensor readings",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sensor_id": {
            "type": "string",
            "description": "Sensor identifier"
          },
          "duration": {
            "type": "number",
            "description": "Duration in seconds to look back",
            "default": 3600
          }
        },
        "required": ["sensor_id"]
      }
    }
  ]
}
```

### Prompts

Prompts provide templates for common AI interactions:

```json
{
  "prompts": [
    {
      "name": "system_status_report",
      "description": "Generate a comprehensive system status report",
      "arguments": []
    },
    {
      "name": "diagnose_issue",
      "description": "Analyze current sensor readings and identify potential issues",
      "arguments": [
        {
          "name": "symptom",
          "description": "Observed symptom or concern",
          "required": false
        }
      ]
    },
    {
      "name": "optimize_nutrients",
      "description": "Suggest optimal nutrient adjustments based on current readings",
      "arguments": []
    },
    {
      "name": "create_test_scenario",
      "description": "Generate a test scenario based on requirements",
      "arguments": [
        {
          "name": "test_objective",
          "description": "What aspect to test",
          "required": true
        },
        {
          "name": "duration",
          "description": "Test duration in seconds",
          "required": false
        }
      ]
    }
  ]
}
```

## Implementation Guide

### Step 1: Create MCP Server Module

```typescript
// src/mcp/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SimulationCore } from '../core/simulation-core';

export class HydroponicMCPServer {
  private server: Server;
  private simCore: SimulationCore;

  constructor(simCore: SimulationCore) {
    this.simCore = simCore;
    this.server = new Server(
      {
        name: 'hydroponic-simulation',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Resource handlers
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: this.getResourceList()
      };
    });

    this.server.setRequestHandler('resources/read', async (request) => {
      return this.readResource(request.params.uri);
    });

    // Tool handlers
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: this.getToolList()
      };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      return this.executeTool(request.params.name, request.params.arguments);
    });

    // Prompt handlers
    this.server.setRequestHandler('prompts/list', async () => {
      return {
        prompts: this.getPromptList()
      };
    });

    this.server.setRequestHandler('prompts/get', async (request) => {
      return this.getPrompt(request.params.name, request.params.arguments);
    });
  }

  private async readResource(uri: string): Promise<any> {
    if (uri === 'hydroponic://sensors/ph') {
      const sensor = this.simCore.getSensor('ph-sensor-1');
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            value: sensor.getValue(),
            unit: 'pH',
            timestamp: Date.now()
          })
        }]
      };
    }
    // ... handle other resources
  }

  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'read_sensor':
        const sensor = this.simCore.getSensor(args.sensor_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              sensor_id: args.sensor_id,
              value: sensor.getValue(),
              timestamp: Date.now()
            })
          }]
        };

      case 'control_actuator':
        const actuator = this.simCore.getActuator(args.actuator_id);
        actuator.setState({
          active: args.state,
          intensity: args.intensity,
          timestamp: Date.now()
        });
        return {
          content: [{
            type: 'text',
            text: `Actuator ${args.actuator_id} set to ${args.state ? 'ON' : 'OFF'}`
          }]
        };

      // ... handle other tools
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Hydroponic MCP Server running on stdio');
  }
}
```

### Step 2: Add MCP Server Entry Point

```typescript
// src/mcp-main.ts
import { SimulationCore } from './core/simulation-core';
import { ConfigurationLoader } from './config/configuration-loader';
import { HydroponicMCPServer } from './mcp/mcp-server';

async function main() {
  // Load configuration
  const configLoader = new ConfigurationLoader();
  const config = configLoader.loadFromFile('./examples/default-config.json');

  // Initialize simulation core
  const simCore = new SimulationCore(config);
  simCore.start();

  // Start MCP server
  const mcpServer = new HydroponicMCPServer(simCore);
  await mcpServer.start();
}

main().catch(console.error);
```

### Step 3: Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop, Kiro, etc.):

```json
{
  "mcpServers": {
    "hydroponic-simulation": {
      "command": "node",
      "args": ["dist/mcp-main.js"],
      "env": {
        "CONFIG_PATH": "./examples/default-config.json"
      }
    }
  }
}
```

## Example AI Interactions

### Monitoring

**User**: "What are the current sensor readings?"

**AI** (via MCP):
```
Reading sensors...
- pH: 6.3 (optimal range: 5.5-6.5) ✓
- EC: 1.9 mS/cm (optimal range: 1.5-2.5) ✓
- Temperature: 22.1°C (optimal range: 18-24) ✓
- Water Level: 78% (minimum: 20%) ✓

All parameters are within optimal ranges.
```

### Control

**User**: "The pH is too high, can you adjust it?"

**AI** (via MCP):
```
Current pH: 7.2 (target: 6.0)
Activating pH down pump...
Running for 3 seconds...
New pH: 6.1
Adjustment complete. pH is now within optimal range.
```

### Analysis

**User**: "Why is my EC dropping?"

**AI** (via MCP):
```
Analyzing EC trends over the past hour...

Observations:
- EC decreased from 2.1 to 1.7 mS/cm (19% drop)
- Water level increased from 70% to 85%
- Water pump was active for 15 minutes

Diagnosis: EC dilution due to water addition. The nutrient concentration 
decreased because water was added without proportional nutrients.

Recommendation: Add nutrients using the nutrient pump to restore EC to 
optimal range (1.8-2.2 mS/cm).

Would you like me to activate the nutrient pump?
```

### Scenario Generation

**User**: "Create a test scenario for pH adjustment"

**AI** (via MCP):
```json
{
  "name": "AI-Generated pH Adjustment Test",
  "description": "Tests pH adjustment from high to optimal range",
  "initialState": {
    "ph": 7.5,
    "ec": 1.8,
    "temperature": 22,
    "waterLevel": 80
  },
  "events": [
    {
      "time": 0,
      "type": "actuator_command",
      "target": "ph-down-pump-1",
      "value": { "active": true, "duration": 2 }
    },
    {
      "time": 30,
      "type": "actuator_command",
      "target": "ph-down-pump-1",
      "value": { "active": true, "duration": 2 }
    }
  ]
}
```

Scenario saved to: ./scenarios/ai-generated-ph-test.json
Would you like me to load and run this scenario?
```

## Security Considerations

### Authentication

Implement authentication for MCP server:

```typescript
// Add authentication middleware
private validateRequest(request: any): boolean {
  const apiKey = request.headers['x-api-key'];
  return apiKey === process.env.MCP_API_KEY;
}
```

### Rate Limiting

Prevent abuse with rate limiting:

```typescript
private rateLimiter = new Map<string, number>();

private checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const lastRequest = this.rateLimiter.get(clientId) || 0;
  
  if (now - lastRequest < 1000) { // Max 1 request per second
    return false;
  }
  
  this.rateLimiter.set(clientId, now);
  return true;
}
```

### Action Validation

Validate all actions before execution:

```typescript
private validateActuatorCommand(actuatorId: string, state: boolean): void {
  // Check if actuator exists
  if (!this.simCore.getActuator(actuatorId)) {
    throw new Error(`Actuator ${actuatorId} not found`);
  }
  
  // Check if simulation is running
  if (!this.simCore.isRunning()) {
    throw new Error('Cannot control actuators while simulation is stopped');
  }
  
  // Add custom validation rules
  // e.g., prevent simultaneous pH up and pH down
}
```

## Future Enhancements

### 1. Streaming Updates

Implement server-sent events for real-time sensor updates:

```typescript
this.server.setRequestHandler('resources/subscribe', async (request) => {
  // Stream sensor updates to AI
  const sensorId = request.params.uri.split('/').pop();
  return this.streamSensorUpdates(sensorId);
});
```

### 2. AI-Powered Optimization

Allow AI to learn optimal control strategies:

```typescript
{
  "name": "optimize_control_strategy",
  "description": "Use ML to optimize actuator control based on historical data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "objective": {
        "type": "string",
        "enum": ["minimize_ph_variance", "optimize_nutrient_efficiency", "reduce_water_usage"]
      }
    }
  }
}
```

### 3. Multi-System Management

Extend MCP to manage multiple simulation instances:

```typescript
{
  "uri": "hydroponic://systems/{system_id}/sensors/ph",
  "description": "pH sensor for specific system instance"
}
```

## Conclusion

MCP integration would make the Hydroponic Test Simulation significantly more powerful by enabling:
- Natural language interaction
- AI-powered monitoring and control
- Automated testing and optimization
- Intelligent anomaly detection
- Seamless integration with AI assistants

This would be particularly valuable for the Gladys project, allowing users to interact with their hydroponic systems through conversational AI.

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
