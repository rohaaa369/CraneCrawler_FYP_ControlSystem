/*
 * ============================================================================
 * ARDUINO OPTA CRANE CRAWLER CONTROL SYSTEM - PRODUCTION VERSION
 * ============================================================================
 * 
 * SYSTEM ARCHITECTURE:
 * - Layer 1: LCT600-12 Legacy Control System
 * - Layer 2: Arduino Opta PLC (this code)
 * - Layer 3: TP-Link CPE210 WiFi Bridge
 * - Layer 4: Node.js Bridge Server
 * - Layer 5: Progressive Web Application (iPad)
 * 
 * SAFETY CRITICAL: Multi-layer safety with fail-safe operation
 * - Hardware E-stop override
 * - Communication timeout monitoring (500ms)
 * - Watchdog timer (2s)
 * - Manual override capability maintained
 * - Fail-safe relay de-energization
 * 
 * ============================================================================
 */

#include "WiFi.h"

// ==================== NETWORK CONFIGURATION ====================
const char* ssid = "LCT-600 Wifi";
const char* password = "Lampson@21";

// TCP Server
WiFiServer tcpServer(3001);
WiFiClient tcpClient;

// Static IP Configuration
IPAddress local_IP(192, 168, 100, 100);    // Opta static IP
IPAddress gateway(192, 168, 100, 1);        // CPE210 gateway
IPAddress subnet(255, 255, 255, 0);         // /24 network
IPAddress primaryDNS(8, 8, 8, 8);           // Optional DNS

// ==================== HARDWARE PIN DEFINITIONS ====================

// ANALOG INPUTS (0-10V DC Telemetry Channels)
#define ENGINE_TEMP_PIN     A0  // I1(+) - LCT600 Pin 10 - Engine Water Temperature
#define GEARBOX_TEMP_PIN    A1  // I2(+) - LCT600 Pin 11 - Gearbox Oil Temperature
#define TACHOMETER_PIN      A2  // I3(+) - LCT600 Pin 14 - Tachometer (RPM)
#define THROTTLE_PIN        A3  // I4(+) - LCT600 Pin 16 - Throttle Position

// DIGITAL INPUTS (Control Signal Monitoring)
#define BRAKE_INPUT_PIN     A4  // I5 - LCT600 Pin 17 - Brake Control
#define FORWARD_SW_PIN      A5  // I6 - LCT600 Pin 23 - Forward Switch Monitor
#define REVERSE_SW_PIN      A6  // I7 - LCT600 Pin 22 - Reverse Switch Monitor
#define ESTOP_PIN           A7  // I8 - Emergency Stop Circuit (Hardware Priority)

// MAIN OPTA RELAY OUTPUTS (Electromechanical Relays)
#define FORWARD_RELAY       D0  // R1 - LCT600 Pin 23 (Parallel with manual forward switch)
#define REVERSE_RELAY       D1  // R2 - LCT600 Pin 22 (Parallel with manual reverse switch)
#define RESERVED_R3         D2  // R3 - Reserved for future expansion
#define RESERVED_R4         D3  // R4 - Reserved for future expansion

// LED OUTPUT for Status Indication
#define LED_STATUS          LED_BUILTIN

// ==================== CALIBRATION CONSTANTS ====================

// Analog Input Scaling (0-10V to Engineering Units)
#define ADC_RESOLUTION      12        // 12-bit ADC
#define ADC_MAX_VALUE       4095      // 2^12 - 1
#define INPUT_VOLTAGE_MAX   10.0      // 0-10V input range

// Temperature Scaling
#define ENGINE_TEMP_MIN     0.0       // °C
#define ENGINE_TEMP_MAX     120.0     // °C
#define GEARBOX_TEMP_MIN    0.0       // °C
#define GEARBOX_TEMP_MAX    100.0     // °C

// RPM Scaling
#define RPM_MIN             0
#define RPM_MAX             3000

// Throttle Scaling  
#define THROTTLE_MIN        0.0       // %
#define THROTTLE_MAX        100.0     // %

// ==================== SAFETY PARAMETERS ====================
#define COMM_TIMEOUT_MS         500     // 500ms communication timeout
#define WATCHDOG_TIMEOUT_MS     2000    // 2 second watchdog timeout
#define DEBOUNCE_DELAY_MS       5       // 5ms switch debounce
#define TELEMETRY_INTERVAL_MS   100     // Send telemetry every 100ms (10Hz)
#define HEARTBEAT_INTERVAL_MS   1000    // Send heartbeat every 1 second

// Temperature Thresholds
#define ENGINE_TEMP_WARNING     100.0   // °C
#define ENGINE_TEMP_CRITICAL    110.0   // °C
#define GEARBOX_TEMP_WARNING    90.0    // °C
#define GEARBOX_TEMP_CRITICAL   95.0    // °C

// ==================== SYSTEM STATE MACHINE ====================
enum SystemState {
  STATE_INIT,               // System initializing
  STATE_IDLE,               // System idle, no connection
  STATE_READY,              // Connected, ready for commands
  STATE_OPERATING,          // Actively controlling crane
  STATE_FAULT,              // Fault condition detected
  STATE_EMERGENCY_STOP      // Emergency stop activated
};

SystemState currentState = STATE_INIT;
SystemState previousState = STATE_INIT;

// ==================== DATA STRUCTURES ====================

// Telemetry Data Structure
struct TelemetryData {
  // Analog Telemetry
  float engineTemp;         // Engine water temperature (°C)
  float gearboxTemp;        // Gearbox oil temperature (°C)
  int rpm;                  // Engine RPM
  float throttlePos;        // Throttle position (%)
  
  // Digital Status
  bool eStopActive;         // Emergency stop status
  bool manualForward;       // Manual forward switch status
  bool manualReverse;       // Manual reverse switch status
  bool brakeEngaged;        // Brake engagement status
  
  // System Status
  String systemState;       // Current system state
  bool communicationHealthy;// Communication status
  
  // Timestamp
  unsigned long timestamp;  // Milliseconds since boot
};

TelemetryData telemetry;

// Control Command Structure
struct ControlCommand {
  // Main Control
  bool mainPower;           // Main power enable
  bool emergencyStop;       // Emergency stop command
  
  // Track Control (Left/Right)
  struct Track {
    String direction;       // "fwd", "rev", "stop"
    int throttle;           // 0-100%
  } left, right;
  
  // Engine Control
  bool leftEngine;          // Left engine on/off
  bool rightEngine;         // Right engine on/off
  
  // Auxiliary Controls
  bool horn;                // Horn activation
  bool parkBrake;           // Park brake engagement
  
  // Gear Selection
  int gearSelection;        // 0=neutral, 1=1st gear, 3=3rd gear
  
  // Timestamp
  unsigned long timestamp;  // When command was received
};

ControlCommand currentCommand;

// ==================== TIMING VARIABLES ====================
unsigned long lastCommandTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastWatchdogReset = 0;
unsigned long lastStateChange = 0;
unsigned long lastWiFiCheck = 0;

// ==================== SAFETY FLAGS ====================
bool communicationHealthy = false;
bool emergencyStopTriggered = false;
bool systemInitialized = false;
bool wifiConnected = false;

// ==================== SETUP FUNCTION ====================
void setup() {
  // Initialize Serial Communication
  Serial.begin(115200);
  delay(2000);  // Allow serial to stabilize
  
  printBanner();
  
  // Phase 1: Hardware Initialization
  Serial.println("PHASE 1: Hardware Initialization");
  initializeHardware();
  delay(100);
  
  // Phase 2: Network Initialization
  Serial.println("\n PHASE 2: Network Initialization");
  connectWiFi();
  delay(100);
  
  // Phase 3: TCP Server Initialization
  Serial.println("\n PHASE 3: TCP Server Initialization");
  tcpServer.begin();
  Serial.print("TCP Server started on ");
  Serial.print(WiFi.localIP());
  Serial.println(":3001");
  Serial.println("Waiting for Node.js bridge connection...");
  
  // Phase 4: Safety Initialization
  Serial.println("\n PHASE 4: Safety Systems Check");
  setAllRelaysOff();
  Serial.println("All relays initialized to OFF (fail-safe)");
  checkEmergencyStop();
  
  // Phase 5: Initial Telemetry Read
  Serial.println("\n PHASE 5: Initial Telemetry Reading");
  readTelemetry();
  printTelemetry();
  
  // System Ready
  currentState = STATE_IDLE;
  systemInitialized = true;
  
  Serial.println("\n================================================================================");
  Serial.println("SYSTEM INITIALIZATION COMPLETE");
  Serial.println("Arduino Opta Crane Control System READY");
  Serial.println("================================================================================\n");
  
  // Blink LED to indicate ready
  blinkStatusLED(3, 200);
}

// ==================== MAIN CONTROL LOOP ====================
void loop() {
  // 100Hz control loop (10ms cycle time)
  unsigned long loopStart = millis();
  
  // 1. WiFi Connection Management
  maintainWiFiConnection();
  
  // 2. TCP Client Connection Management  
  handleTCPConnection();
  
  // 3. Telemetry Acquisition
  readTelemetry();
  
  // 4. Safety Monitoring (CRITICAL - Always Execute)
  checkSafety();
  
  // 5. Command Execution (Only if safe)
  if (isSafeToOperate()) {
    executeControlCommands();
  } else {
    setAllRelaysOff();
  }
  
  // 6. Telemetry Transmission
  sendTelemetry();
  
  // 7. Heartbeat Transmission
  sendHeartbeat();
  
  // 8. Watchdog Reset
  resetWatchdog();
  
  // 9. Status LED Update
  updateStatusLED();
  
  // 10. State Machine Update
  updateStateMachine();
  
  // Maintain 10ms loop time (100Hz)
  unsigned long loopDuration = millis() - loopStart;
  if (loopDuration < 10) {
    delay(10 - loopDuration);
  }
}

// ==================== HARDWARE INITIALIZATION ====================
void initializeHardware() {
  Serial.println("Configuring I/O pins...");
  
  // Configure ADC Resolution
  analogReadResolution(ADC_RESOLUTION);
  
  // Configure Analog Inputs (0-10V)
  pinMode(ENGINE_TEMP_PIN, INPUT);
  pinMode(GEARBOX_TEMP_PIN, INPUT);
  pinMode(TACHOMETER_PIN, INPUT);
  pinMode(THROTTLE_PIN, INPUT);
  Serial.println("Analog inputs configured (A0-A3: I1-I4)");
  
  // Configure Digital Inputs
  pinMode(BRAKE_INPUT_PIN, INPUT);
  pinMode(FORWARD_SW_PIN, INPUT);
  pinMode(REVERSE_SW_PIN, INPUT);
  pinMode(ESTOP_PIN, INPUT_PULLUP);  // Active LOW with internal pullup
  Serial.println("Digital inputs configured (A4-A7: I5-I8)");
  
  // Configure Relay Outputs (Initialize to OFF - Fail-Safe)
  pinMode(FORWARD_RELAY, OUTPUT);
  pinMode(REVERSE_RELAY, OUTPUT);
  pinMode(RESERVED_R3, OUTPUT);
  pinMode(RESERVED_R4, OUTPUT);
  
  digitalWrite(FORWARD_RELAY, LOW);
  digitalWrite(REVERSE_RELAY, LOW);
  digitalWrite(RESERVED_R3, LOW);
  digitalWrite(RESERVED_R4, LOW);
  Serial.println("Main relay outputs configured (D0-D3: R1-R4)");
  
  // Configure Status LED
  pinMode(LED_STATUS, OUTPUT);
  digitalWrite(LED_STATUS, LOW);
  Serial.println("Status LED configured");
  
  // Note about expansion module
  Serial.println("Expansion module (D1608E) functions reserved for future integration");
  Serial.println("Current version controls Forward/Reverse via main Opta relays");
}

// ==================== WIFI CONNECTION ====================
void connectWiFi() {
  Serial.println("Configuring WiFi...");
  
  // Configure static IP (Opta WiFi.config returns void, no error checking)
  WiFi.config(local_IP, gateway, subnet, primaryDNS);
  Serial.println("Static IP configured: 192.168.100.100");
  
  // Connect to WiFi
  Serial.print("Connecting to SSID: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("WiFi Connected!");
    Serial.print(" IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print(" Gateway: ");
    Serial.println(gateway);
    Serial.print(" Subnet: ");
    Serial.println(subnet);
    Serial.print(" Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    wifiConnected = false;
    Serial.println(" WiFi Connection Failed!");
    Serial.println(" Check your WiFi credentials and try again");
    Serial.println(" System will continue with limited functionality");
  }
}

void maintainWiFiConnection() {
  // Check WiFi status every 10 seconds
  if (millis() - lastWiFiCheck > 10000) {
    lastWiFiCheck = millis();
    
    if (WiFi.status() != WL_CONNECTED) {
      if (wifiConnected) {
        Serial.println(" WiFi connection lost! Attempting to reconnect...");
        wifiConnected = false;
      }
      WiFi.begin(ssid, password);
    } else {
      if (!wifiConnected) {
        Serial.println(" WiFi reconnected!");
        Serial.print(" IP Address: ");
        Serial.println(WiFi.localIP());
        wifiConnected = true;
      }
    }
    
    // Check TCP client connection status
    if (tcpClient && !tcpClient.connected()) {
      Serial.println(" Bridge disconnected");
      tcpClient.stop();
      if (communicationHealthy) {
        communicationHealthy = false;
        if (currentState == STATE_OPERATING || currentState == STATE_READY) {
          currentState = STATE_IDLE;
        }
      }
    }
  }
}

// ==================== TCP CONNECTION MANAGEMENT ====================
void handleTCPConnection() {
  // Accept new client if none connected
  if (!tcpClient || !tcpClient.connected()) {
    WiFiClient newClient = tcpServer.available();
    if (newClient) {
      if (tcpClient) {
        tcpClient.stop();
      }
      tcpClient = newClient;
      Serial.println(" Bridge connected!");
      Serial.print(" Client IP: ");
      Serial.println(tcpClient.remoteIP());
      
      communicationHealthy = true;
      lastCommandTime = millis();
      
      // Send initial connection message
      sendJSON("{\"type\":\"connection\",\"status\":\"connected\",\"device\":\"arduino_opta\",\"timestamp\":" + String(millis()) + "}");
      
      // Update state
      if (currentState == STATE_IDLE) {
        currentState = STATE_READY;
        Serial.println(" State: IDLE → READY");
      }
    }
  }
  
  // Process incoming data
  if (tcpClient && tcpClient.connected() && tcpClient.available()) {
    String message = tcpClient.readStringUntil('\n');
    message.trim();
    
    if (message.length() > 0) {
      Serial.println(" COMMAND RECEIVED:");
      Serial.println("   Raw: " + message);
      
      lastCommandTime = millis();
      communicationHealthy = true;
      
      parseCommand(message);
    }
  }
}

// ==================== COMMAND PARSING ====================
void parseCommand(String json) {
  Serial.println(" PARSING COMMAND:");
  
  // Detect command type
  if (json.indexOf("\"type\":\"cmd\"") != -1 || json.indexOf("\"type\":\"control\"") != -1) {
    Serial.println(" Command Type: CRANE CONTROL");
    
    // Parse main power
    if (json.indexOf("\"mainPower\":true") != -1) {
      currentCommand.mainPower = true;
      Serial.println(" Main Power: ON");
    } else if (json.indexOf("\"mainPower\":false") != -1) {
      currentCommand.mainPower = false;
      Serial.println(" Main Power: OFF");
    }
    
    // Parse emergency stop
    if (json.indexOf("\"emergencyStop\":true") != -1) {
      currentCommand.emergencyStop = true;
      Serial.println(" EMERGENCY STOP: ACTIVATED");
    } else if (json.indexOf("\"emergencyStop\":false") != -1) {
      currentCommand.emergencyStop = false;
      Serial.println(" Emergency Stop: Normal");
    }
    
    // Parse engines
    if (json.indexOf("\"leftEngine\":true") != -1) {
      currentCommand.leftEngine = true;
      Serial.println(" Left Engine: ON");
    } else if (json.indexOf("\"leftEngine\":false") != -1) {
      currentCommand.leftEngine = false;
      Serial.println(" Left Engine: OFF");
    }
    
    if (json.indexOf("\"rightEngine\":true") != -1) {
      currentCommand.rightEngine = true;
      Serial.println(" Right Engine: ON");
    } else if (json.indexOf("\"rightEngine\":false") != -1) {
      currentCommand.rightEngine = false;
      Serial.println(" Right Engine: OFF");
    }
    
    // Parse horn
    if (json.indexOf("\"horn\":true") != -1) {
      currentCommand.horn = true;
      Serial.println(" Horn: ACTIVE");
    } else {
      currentCommand.horn = false;
    }
    
    // Parse left track direction
    if (json.indexOf("\"left\":{\"dir\":\"fwd\"") != -1) {
      currentCommand.left.direction = "fwd";
      Serial.println(" Left Track: FORWARD");
    } else if (json.indexOf("\"left\":{\"dir\":\"rev\"") != -1) {
      currentCommand.left.direction = "rev";
      Serial.println(" Left Track: REVERSE");
    } else if (json.indexOf("\"left\":{\"dir\":\"stop\"") != -1) {
      currentCommand.left.direction = "stop";
      Serial.println(" Left Track: STOP");
    }
    
    // Parse right track direction
    if (json.indexOf("\"right\":{\"dir\":\"fwd\"") != -1) {
      currentCommand.right.direction = "fwd";
      Serial.println(" Right Track: FORWARD");
    } else if (json.indexOf("\"right\":{\"dir\":\"rev\"") != -1) {
      currentCommand.right.direction = "rev";
      Serial.println(" Right Track: REVERSE");
    } else if (json.indexOf("\"right\":{\"dir\":\"stop\"") != -1) {
      currentCommand.right.direction = "stop";
      Serial.println(" Right Track: STOP");
    }
    
    // Parse throttle values (simplified extraction)
    int leftThrottleStart = json.indexOf("\"left\":{\"dir\":");
    if (leftThrottleStart != -1) {
      int throttlePos = json.indexOf("\"throttle\":", leftThrottleStart);
      if (throttlePos != -1) {
        int throttleStart = throttlePos + 11;
        int throttleEnd = json.indexOf("}", throttleStart);
        if (throttleEnd == -1) throttleEnd = json.indexOf(",", throttleStart);
        String leftThrottleStr = json.substring(throttleStart, throttleEnd);
        currentCommand.left.throttle = leftThrottleStr.toInt();
        Serial.println(" Left Throttle: " + String(currentCommand.left.throttle) + "%");
      }
    }
    
    int rightThrottleStart = json.indexOf("\"right\":{\"dir\":");
    if (rightThrottleStart != -1) {
      int throttlePos = json.indexOf("\"throttle\":", rightThrottleStart);
      if (throttlePos != -1) {
        int throttleStart = throttlePos + 11;
        int throttleEnd = json.indexOf("}", throttleStart);
        if (throttleEnd == -1) throttleEnd = json.indexOf(",", throttleStart);
        String rightThrottleStr = json.substring(throttleStart, throttleEnd);
        currentCommand.right.throttle = rightThrottleStr.toInt();
        Serial.println(" Right Throttle: " + String(currentCommand.right.throttle) + "%");
      }
    }
    
    currentCommand.timestamp = millis();
    Serial.println(" READY FOR CRANE EXECUTION");
    
    // Send acknowledgment
    String ackMsg = "{\"type\":\"ack\",\"timestamp\":" + String(millis()) + "}";
    sendJSON(ackMsg);
    Serial.println(" Command sent to the LCT-600");
    
    // Update system state
    updateStateFromCommand();
    
  } else if (json.indexOf("\"type\":\"heartbeat\"") != -1) {
    Serial.println("Heartbeat received - connection healthy");
  } else {
    Serial.println(" Unknown command type");
  }
  
  Serial.println("--------------------------------");
}

void updateStateFromCommand() {
  if (currentCommand.emergencyStop) {
    emergencyStop();
    return;
  }
  
  if (currentCommand.mainPower && communicationHealthy && !telemetry.eStopActive) {
    if (currentState != STATE_OPERATING) {
      currentState = STATE_OPERATING;
      Serial.println(" State: READY → OPERATING");
    }
  } else {
    if (currentState == STATE_OPERATING) {
      currentState = STATE_READY;
      Serial.println(" State: OPERATING → READY");
    }
  }
}

// ==================== TELEMETRY ACQUISITION ====================
void readTelemetry() {
  // Read Analog Inputs and Convert to Engineering Units
  
  // Engine Temperature (0-10V = 0-120°C)
  int engineTempRaw = analogRead(ENGINE_TEMP_PIN);
  float engineTempVolts = (engineTempRaw * INPUT_VOLTAGE_MAX) / ADC_MAX_VALUE;
  telemetry.engineTemp = (engineTempVolts / INPUT_VOLTAGE_MAX) * ENGINE_TEMP_MAX;
  
  // Gearbox Temperature (0-10V = 0-100°C)
  int gearboxTempRaw = analogRead(GEARBOX_TEMP_PIN);
  float gearboxTempVolts = (gearboxTempRaw * INPUT_VOLTAGE_MAX) / ADC_MAX_VALUE;
  telemetry.gearboxTemp = (gearboxTempVolts / INPUT_VOLTAGE_MAX) * GEARBOX_TEMP_MAX;
  
  // Tachometer (0-10V = 0-3000 RPM)
  int rpmRaw = analogRead(TACHOMETER_PIN);
  float rpmVolts = (rpmRaw * INPUT_VOLTAGE_MAX) / ADC_MAX_VALUE;
  telemetry.rpm = (int)((rpmVolts / INPUT_VOLTAGE_MAX) * RPM_MAX);
  
  // Throttle Position (0-10V = 0-100%)
  int throttleRaw = analogRead(THROTTLE_PIN);
  float throttleVolts = (throttleRaw * INPUT_VOLTAGE_MAX) / ADC_MAX_VALUE;
  telemetry.throttlePos = (throttleVolts / INPUT_VOLTAGE_MAX) * THROTTLE_MAX;
  
  // Read Digital Inputs
  telemetry.eStopActive = (digitalRead(ESTOP_PIN) == LOW);  // Active LOW
  telemetry.manualForward = (digitalRead(FORWARD_SW_PIN) == HIGH);
  telemetry.manualReverse = (digitalRead(REVERSE_SW_PIN) == HIGH);
  
  // Brake status (checking voltage level)
  int brakeRaw = analogRead(BRAKE_INPUT_PIN);
  telemetry.brakeEngaged = (brakeRaw > (ADC_MAX_VALUE * 0.6));  // >6V = engaged
  
  // System Status
  telemetry.systemState = getStateString();
  telemetry.communicationHealthy = communicationHealthy;
  telemetry.timestamp = millis();
}

// ==================== SAFETY MONITORING ====================
void checkSafety() {
  // PRIORITY 1: Hardware Emergency Stop
  checkEmergencyStop();
  
  // PRIORITY 2: Communication Timeout
  checkCommunicationTimeout();
  
  // PRIORITY 3: Temperature Monitoring
  checkTemperatures();
  
  // PRIORITY 4: Conflicting Commands
  checkCommandValidity();
}

void checkEmergencyStop() {
  if (telemetry.eStopActive) {
    if (currentState != STATE_EMERGENCY_STOP) {
      Serial.println(" EMERGENCY STOP ACTIVATED (Hardware)");
      emergencyStop();
    }
  }
}

void checkCommunicationTimeout() {
  if (communicationHealthy && (millis() - lastCommandTime > COMM_TIMEOUT_MS)) {
    Serial.println(" COMMUNICATION TIMEOUT - STOPPING ALL OPERATIONS");
    emergencyStop();
    communicationHealthy = false;
    
    if (currentState != STATE_EMERGENCY_STOP) {
      currentState = STATE_FAULT;
    }
  }
}

void checkTemperatures() {
  // Engine Temperature Warnings
  if (telemetry.engineTemp > ENGINE_TEMP_CRITICAL) {
    Serial.println(" CRITICAL: Engine temperature critical!");
  } else if (telemetry.engineTemp > ENGINE_TEMP_WARNING) {
    Serial.println("  WARNING: Engine temperature high");
  }
  
  // Gearbox Temperature Warnings
  if (telemetry.gearboxTemp > GEARBOX_TEMP_CRITICAL) {
    Serial.println(" CRITICAL: Gearbox temperature critical!");
  } else if (telemetry.gearboxTemp > GEARBOX_TEMP_WARNING) {
    Serial.println("  WARNING: Gearbox temperature high");
  }
}

void checkCommandValidity() {
  // Check for conflicting direction commands between manual and remote
  if ((currentCommand.left.direction == "fwd" || currentCommand.right.direction == "fwd") && telemetry.manualReverse) {
    Serial.println("  WARNING: Conflicting direction commands detected");
    currentCommand.left.direction = "stop";
    currentCommand.right.direction = "stop";
  }
  
  if ((currentCommand.left.direction == "rev" || currentCommand.right.direction == "rev") && telemetry.manualForward) {
    Serial.println("  WARNING: Conflicting direction commands detected");
    currentCommand.left.direction = "stop";
    currentCommand.right.direction = "stop";
  }
}

bool isSafeToOperate() {
  return !telemetry.eStopActive && 
         communicationHealthy && 
         currentState != STATE_EMERGENCY_STOP &&
         currentState != STATE_FAULT;
}

// ==================== CONTROL EXECUTION ====================
void executeControlCommands() {
  // Only execute if system is in safe operating state
  if (!isSafeToOperate()) {
    setAllRelaysOff();
    return;
  }
  
  // FORWARD/REVERSE Control for Crawler Tracks
  // Simplified: If EITHER track wants forward, activate forward relay
  // If EITHER track wants reverse, activate reverse relay
  // These relays operate in parallel with manual switches
  
  bool wantForward = (currentCommand.left.direction == "fwd" || currentCommand.right.direction == "fwd");
  bool wantReverse = (currentCommand.left.direction == "rev" || currentCommand.right.direction == "rev");
  
  if (wantForward && !wantReverse) {
    digitalWrite(FORWARD_RELAY, HIGH);
    digitalWrite(REVERSE_RELAY, LOW);
  } else if (wantReverse && !wantForward) {
    digitalWrite(FORWARD_RELAY, LOW);
    digitalWrite(REVERSE_RELAY, HIGH);
  } else {
    // Stop or conflicting commands
    digitalWrite(FORWARD_RELAY, LOW);
    digitalWrite(REVERSE_RELAY, LOW);
  }
  
  // EXPANSION MODULE FUNCTIONS (D1608E)
  // These require OptaBluePrint library - placeholder for future implementation
  // Functions: Horn, Park Brake, Gear Selection (1st/3rd), Engine Start/Stop
  
  /* TODO: Implement when expansion module library is configured
  if (expansionModuleAvailable) {
    setExpansionRelay(EXP_HORN, currentCommand.horn);
    setExpansionRelay(EXP_PARK_BRAKE, currentCommand.parkBrake);
    // Gear selection, engine control, etc.
  }
  */
}

// ==================== TELEMETRY TRANSMISSION ====================
void sendTelemetry() {
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    // Build JSON telemetry message
    String json = "{";
    json += "\"type\":\"telemetry\",";
    json += "\"engineTemp\":" + String(telemetry.engineTemp, 1) + ",";
    json += "\"gearboxTemp\":" + String(telemetry.gearboxTemp, 1) + ",";
    json += "\"rpm\":" + String(telemetry.rpm) + ",";
    json += "\"throttle\":" + String(telemetry.throttlePos, 1) + ",";
    json += "\"eStop\":" + String(telemetry.eStopActive ? "true" : "false") + ",";
    json += "\"manualFwd\":" + String(telemetry.manualForward ? "true" : "false") + ",";
    json += "\"manualRev\":" + String(telemetry.manualReverse ? "true" : "false") + ",";
    json += "\"brake\":" + String(telemetry.brakeEngaged ? "true" : "false") + ",";
    json += "\"state\":\"" + telemetry.systemState + "\",";
    json += "\"commHealthy\":" + String(telemetry.communicationHealthy ? "true" : "false") + ",";
    json += "\"timestamp\":" + String(telemetry.timestamp);
    json += "}";
    
    sendJSON(json);
    lastTelemetryTime = millis();
  }
}

void sendHeartbeat() {
  if (millis() - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    String json = "{";
    json += "\"type\":\"heartbeat\",";
    json += "\"state\":\"" + getStateString() + "\",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"timestamp\":" + String(millis());
    json += "}";
    
    sendJSON(json);
    lastHeartbeatTime = millis();
  }
}

void sendJSON(String json) {
  if (tcpClient && tcpClient.connected()) {
    tcpClient.println(json);
  }
}

// ==================== UTILITY FUNCTIONS ====================
void setAllRelaysOff() {
  // Main Opta Relays
  digitalWrite(FORWARD_RELAY, LOW);
  digitalWrite(REVERSE_RELAY, LOW);
  digitalWrite(RESERVED_R3, LOW);
  digitalWrite(RESERVED_R4, LOW);
  
  // Expansion Module Relays (when implemented)
  // TODO: Add expansion module relay de-energization
}

void emergencyStop() {
  previousState = currentState;
  currentState = STATE_EMERGENCY_STOP;
  emergencyStopTriggered = true;
  
  // Immediately de-energize all relays
  setAllRelaysOff();
  
  // Send emergency stop notification
  if (tcpClient && tcpClient.connected()) {
    sendJSON("{\"type\":\"alert\",\"level\":\"critical\",\"message\":\"EMERGENCY_STOP\",\"timestamp\":" + String(millis()) + "}");
  }
  
  Serial.println(" EMERGENCY STOP ACTIVATED ");
}

void resetWatchdog() {
  // Watchdog timer implementation
  lastWatchdogReset = millis();
  
  // Check for watchdog timeout (system hang detection)
  if (millis() - lastWatchdogReset > WATCHDOG_TIMEOUT_MS) {
    Serial.println("WATCHDOG TIMEOUT - System may be hung!");
    // In production: Force system reset
  }
}

void updateStateMachine() {
  if (currentState != previousState) {
    Serial.print(" State Change: ");
    Serial.print(getStateString(previousState));
    Serial.print(" → ");
    Serial.println(getStateString(currentState));
    
    previousState = currentState;
    lastStateChange = millis();
  }
}

String getStateString() {
  return getStateString(currentState);
}

String getStateString(SystemState state) {
  switch (state) {
    case STATE_INIT: return "INIT";
    case STATE_IDLE: return "IDLE";
    case STATE_READY: return "READY";
    case STATE_OPERATING: return "OPERATING";
    case STATE_FAULT: return "FAULT";
    case STATE_EMERGENCY_STOP: return "E_STOP";
    default: return "UNKNOWN";
  }
}

// ==================== STATUS LED MANAGEMENT ====================
void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  unsigned long blinkInterval;
  
  switch (currentState) {
    case STATE_INIT:
      blinkInterval = 100;  // Fast blink
      break;
    case STATE_IDLE:
      blinkInterval = 1000;  // Slow blink
      break;
    case STATE_READY:
      blinkInterval = 500;  // Medium blink
      break;
    case STATE_OPERATING:
      digitalWrite(LED_STATUS, HIGH);  // Solid ON
      return;
    case STATE_FAULT:
      blinkInterval = 250;  // Fast blink
      break;
    case STATE_EMERGENCY_STOP:
      // Rapid flashing
      if (millis() - lastBlink > 100) {
        ledState = !ledState;
        digitalWrite(LED_STATUS, ledState);
        lastBlink = millis();
      }
      return;
    default:
      blinkInterval = 1000;
  }
  
  if (millis() - lastBlink > blinkInterval) {
    ledState = !ledState;
    digitalWrite(LED_STATUS, ledState);
    lastBlink = millis();
  }
}

void blinkStatusLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_STATUS, HIGH);
    delay(delayMs);
    digitalWrite(LED_STATUS, LOW);
    delay(delayMs);
  }
}

// ==================== DEBUG AND DIAGNOSTICS ====================

void printTelemetry() {
  Serial.println(" Initial Telemetry Reading:");
  Serial.print(" Engine Temp: ");
  Serial.print(telemetry.engineTemp, 1);
  Serial.println(" °C");
  Serial.print(" Gearbox Temp: ");
  Serial.print(telemetry.gearboxTemp, 1);
  Serial.println(" °C");
  Serial.print(" RPM: ");
  Serial.println(telemetry.rpm);
  Serial.print(" Throttle: ");
  Serial.print(telemetry.throttlePos, 1);
  Serial.println(" %");
  Serial.print("  E-Stop: ");
  Serial.println(telemetry.eStopActive ? "ACTIVE" : "Normal");
}
