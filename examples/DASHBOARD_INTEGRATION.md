# Gladys Dashboard Integration Guide

This guide explains how to integrate the Hydroponic Test Simulation dashboard into Gladys Assistant.

## Overview

The included `gladys-dashboard-example.html` provides a complete, ready-to-use dashboard for monitoring and controlling your hydroponic simulation system. It can be integrated into Gladys in several ways.

## Features

- **Real-time Sensor Monitoring**: pH, EC, temperature, and water level
- **Visual Indicators**: Color-coded range bars showing optimal/warning/critical states
- **Actuator Controls**: Toggle switches for pumps, lights, and valves
- **Simulation Controls**: Start, pause, stop, and time acceleration
- **Alert System**: Automatic warnings for out-of-range values
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Integration Methods

### Method 1: Gladys Custom Dashboard Widget

The easiest way to integrate this dashboard is as a custom widget in Gladys.

#### Step 1: Copy the Dashboard File

```bash
# Copy the dashboard to your Gladys static files directory
cp examples/gladys-dashboard-example.html /path/to/gladys/static/hydroponic-dashboard.html
```

#### Step 2: Add as iFrame Widget

1. Open your Gladys dashboard
2. Click "Edit Dashboard"
3. Add a new "Custom HTML" or "iFrame" widget
4. Set the source to: `/static/hydroponic-dashboard.html`
5. Adjust the widget size to your preference

### Method 2: Standalone Web Page

Host the dashboard as a standalone web page accessible from Gladys.

#### Step 1: Configure Web Server

```bash
# If using nginx, add this location block:
location /hydroponic {
    alias /path/to/hydroponic-test-simulation/examples;
    index gladys-dashboard-example.html;
}
```

#### Step 2: Add Link in Gladys

Add a custom link in your Gladys navigation menu pointing to `/hydroponic`.

### Method 3: Gladys Scene Integration

Create Gladys scenes that interact with the simulation through the REST API.

#### Example Scene: "Water Plants"

```javascript
// Gladys scene code
const axios = require('axios');

// Turn on water pump for 5 seconds
await axios.post('http://localhost:3000/api/actuators/water-pump-1', {
  state: true
});

await gladys.utils.wait(5000);

await axios.post('http://localhost:3000/api/actuators/water-pump-1', {
  state: false
});
```

#### Example Scene: "Check pH and Adjust"

```javascript
// Get current pH
const phResponse = await axios.get('http://localhost:3000/api/sensors/ph-sensor-1');
const ph = phResponse.data.data.value;

// If pH is too low, add pH up solution
if (ph < 5.5) {
  await axios.post('http://localhost:3000/api/actuators/ph-up-pump-1', {
    state: true
  });
  
  await gladys.utils.wait(2000); // Run for 2 seconds
  
  await axios.post('http://localhost:3000/api/actuators/ph-up-pump-1', {
    state: false
  });
}

// If pH is too high, add pH down solution
if (ph > 6.5) {
  await axios.post('http://localhost:3000/api/actuators/ph-down-pump-1', {
    state: true
  });
  
  await gladys.utils.wait(2000);
  
  await axios.post('http://localhost:3000/api/actuators/ph-down-pump-1', {
    state: false
  });
}
```

## Customization

### Changing API Endpoint

Edit the `API_BASE` constant in the dashboard HTML:

```javascript
const API_BASE = 'http://your-server:3000/api';
```

### Adjusting Update Frequency

Change the update interval (default: 2 seconds):

```javascript
updateInterval = setInterval(updateDashboard, 5000); // Update every 5 seconds
```

### Customizing Optimal Ranges

Modify the range checking in the `updateRangeBar` function:

```javascript
// Example: Change pH optimal range to 6.0-7.0
updateRangeBar('phBar', value, 6.0, 7.0, 0, 14);
```

### Adding Custom Alerts

Add your own alert conditions in the `checkAlerts` function:

```javascript
function checkAlerts() {
  const ecValue = parseFloat(document.getElementById('ecValue').textContent);
  
  if (ecValue > 3.0) {
    document.getElementById('dangerMessage').textContent = 'EC too high - nutrient burn risk!';
    document.getElementById('alertDanger').classList.add('show');
  }
}
```

## Gladys Device Integration

### Registering Sensors as Gladys Devices

Use the `GladysIntegrationAdapter` to expose simulation sensors as Gladys devices:

```javascript
const { GladysIntegrationAdapter } = require('hydroponic-test-simulation');

// Initialize adapter
const adapter = new GladysIntegrationAdapter(simulationCore);

// Discover all devices
const devices = adapter.discoverDevices();

// Register with Gladys
for (const device of devices) {
  await gladys.device.create(device);
}
```

### Creating Gladys Triggers

Set up triggers based on sensor values:

1. **Low Water Alert**
   - Trigger: Water level sensor < 30%
   - Action: Send notification

2. **pH Out of Range**
   - Trigger: pH sensor < 5.5 OR > 6.5
   - Action: Run pH adjustment scene

3. **High Temperature**
   - Trigger: Temperature sensor > 28°C
   - Action: Turn off grow lights

## Mobile Access

The dashboard is fully responsive and works on mobile devices. For best mobile experience:

1. Add the dashboard URL to your home screen
2. Use Gladys mobile app with custom widget
3. Access through Gladys web interface on mobile browser

## Troubleshooting

### Dashboard Not Updating

1. Check that the simulation is running: `http://localhost:3000/api/simulation/status`
2. Verify API endpoint is accessible from browser
3. Check browser console for CORS errors
4. Ensure simulation REST API server is started

### CORS Issues

If accessing from a different domain, enable CORS in the simulation:

```javascript
// Add to src/api/rest-api-server.ts
this.app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### Actuator Controls Not Working

1. Verify actuator IDs match your configuration
2. Check API response in browser console
3. Ensure simulation is running (not stopped)

## Advanced Integration

### WebSocket Support (Future Enhancement)

For real-time updates without polling, consider adding WebSocket support:

```javascript
// Example WebSocket client code
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'sensor_update') {
    updateSensorDisplay(data.sensorId, data.value);
  }
};
```

### Historical Data Charts

Integrate with Gladys chart widgets to show historical trends:

```javascript
// Store sensor readings in Gladys database
await gladys.device.setValue({
  device_feature_external_id: 'hydroponic-ph-sensor',
  state: phValue
});
```

## Contributing to Gladys

If you'd like to contribute this integration to the Gladys project:

1. Fork the Gladys repository
2. Create a new integration module: `server/services/hydroponic-simulation`
3. Implement the Gladys service interface
4. Add dashboard widget to `front/src/routes/integration/all/hydroponic-simulation`
5. Submit a pull request with documentation

## Support

For issues specific to:
- **Dashboard**: Check browser console and network tab
- **Gladys Integration**: Consult Gladys documentation
- **Simulation API**: See API documentation at `/api-docs`

## License

This dashboard example is provided under the same MIT license as the Hydroponic Test Simulation project.
