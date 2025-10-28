const WebSocket = require('ws');
const net = require('net');

// Configuration
const WS_PORT = 8080;           
const OPTA_IP = '192.168.100.100'; // Updated IP
const OPTA_TCP_PORT = 3001;     

console.log('🚀 Starting INDUSTRIAL Crane Control Bridge...');
console.log('📱 WebSocket Server (iPad):', `Port ${WS_PORT}`);
console.log('🔌 TCP Target (Opta):', `${OPTA_IP}:${OPTA_TCP_PORT}`);

// WebSocket Server for iPad App
const wss = new WebSocket.Server({ port: WS_PORT });
const connectedClients = new Set();

// TCP Connection Management - INDUSTRIAL GRADE
let optaTcpClient = null;
let isOptaConnected = false;
let reconnectTimer = null;
let heartbeatTimer = null;
let lastHeartbeat = null;

function connectToOpta() {
  if (optaTcpClient) {
    optaTcpClient.destroy();
  }
  
  console.log('🔄 Connecting to Arduino Opta...');
  
  optaTcpClient = new net.Socket();
  
  // REMOVE TIMEOUT - Let it stay connected indefinitely
  // optaTcpClient.setTimeout(5000); // REMOVED THIS LINE
  
  // Set keep-alive to maintain connection
  optaTcpClient.setKeepAlive(true, 30000); // Keep-alive every 30 seconds
  optaTcpClient.setNoDelay(true); // Disable Nagle's algorithm for low latency
  
  optaTcpClient.connect(OPTA_TCP_PORT, OPTA_IP, () => {
    console.log('✅ STABLE CONNECTION to Arduino Opta via TCP');
    console.log('🔒 Connection configured for industrial reliability');
    isOptaConnected = true;
    broadcastStatus();
    
    // Start heartbeat monitoring
    startHeartbeat();
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  optaTcpClient.on('data', (data) => {
    const response = data.toString().trim();
    if (response) { // Only log non-empty responses
      console.log('📨 Arduino → Bridge:', response);
      lastHeartbeat = Date.now(); // Update last activity timestamp
      
      // Forward Arduino responses to all iPad clients
      broadcastToClients({
        type: 'arduino_response',
        data: response,
        timestamp: new Date().toISOString()
      });
    }
  });

  optaTcpClient.on('error', (err) => {
    console.error('❌ TCP Error:', err.message);
    isOptaConnected = false;
    broadcastStatus();
    stopHeartbeat();
    scheduleReconnect();
  });

  optaTcpClient.on('close', (hadError) => {
    console.log('🔌 TCP connection to Opta closed', hadError ? '(with error)' : '(clean)');
    isOptaConnected = false;
    broadcastStatus();
    stopHeartbeat();
    
    // Only reconnect if it wasn't a clean shutdown
    if (hadError !== false) {
      scheduleReconnect();
    }
  });

  // REMOVED timeout handler - no more timeouts!
}

function startHeartbeat() {
  stopHeartbeat(); // Clear any existing heartbeat
  lastHeartbeat = Date.now();
  
  heartbeatTimer = setInterval(() => {
    if (isOptaConnected && optaTcpClient && optaTcpClient.readyState === 'open') {
      // Send a lightweight heartbeat
      const heartbeat = JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }) + '\n';
      optaTcpClient.write(heartbeat);
      
      // Check if we haven't heard from Arduino in too long (2 minutes)
      const timeSinceLastResponse = Date.now() - lastHeartbeat;
      if (timeSinceLastResponse > 120000) { // 2 minutes
        console.warn('⚠️ No response from Arduino for 2 minutes - connection may be dead');
        // But don't disconnect - let the connection attempt to recover
      }
    }
  }, 30000); // Send heartbeat every 30 seconds
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    console.log('🔄 Scheduling reconnect in 10 seconds...');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectToOpta();
    }, 10000); // Increased to 10 seconds for stability
  }
}

// WebSocket Server for iPad connections
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log('📱 iPad connected from:', clientIP);
  
  connectedClients.add(ws);
  
  // Send current status to newly connected client
  ws.send(JSON.stringify({
    type: 'connection_status',
    websocket_connected: true,
    opta_connected: isOptaConnected,
    opta_ip: OPTA_IP,
    bridge_info: 'Industrial-Grade Stable Bridge',
    connection_uptime: lastHeartbeat ? Date.now() - lastHeartbeat : 0,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const command = JSON.parse(message);
      
      // Skip logging ping commands to reduce noise
      if (command.type !== 'ping') {
        console.log('📱➡️🔌 iPad Command:', JSON.stringify(command));
      }
      
      // Forward command to Arduino Opta via TCP
      if (isOptaConnected && optaTcpClient && optaTcpClient.readyState === 'open') {
        const commandString = JSON.stringify(command) + '\n';
        optaTcpClient.write(commandString);
        
        if (command.type !== 'ping') {
          console.log('✅ Forwarded to Opta via TCP');
        }
        
        // Update last activity timestamp
        lastHeartbeat = Date.now();
        
      } else {
        console.warn('⚠️ Cannot forward - Opta not connected');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Arduino Opta not connected via TCP',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('❌ Invalid JSON from iPad:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid command format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    console.log('📱 iPad disconnected from:', clientIP);
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error.message);
    connectedClients.delete(ws);
  });
});

function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function broadcastStatus() {
  broadcastToClients({
    type: 'connection_status',
    websocket_connected: true,
    opta_connected: isOptaConnected,
    opta_ip: OPTA_IP,
    connection_uptime: lastHeartbeat ? Date.now() - lastHeartbeat : 0,
    timestamp: new Date().toISOString()
  });
}

console.log('🏭 INDUSTRIAL-GRADE Bridge ready!');
console.log('🔒 Configured for maximum stability and reliability');
console.log('📱 iPad connects to: ws://YOUR_PC_IP:8080');

// Start connection to Opta
connectToOpta();

// Status reporting every minute
setInterval(() => {
  if (isOptaConnected) {
    const uptime = lastHeartbeat ? Math.round((Date.now() - lastHeartbeat) / 1000) : 0;
    console.log(`📊 Status: Connected | Uptime: ${uptime}s | Active Clients: ${connectedClients.size}`);
  }
}, 60000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridge...');
  
  stopHeartbeat();
  
  if (optaTcpClient) {
    optaTcpClient.destroy();
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  connectedClients.forEach(client => {
    client.close();
  });
  
  process.exit(0);
});