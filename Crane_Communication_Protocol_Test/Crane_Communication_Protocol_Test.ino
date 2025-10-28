#include "WiFi.h"

// Use WiFiServer from the WiFi library
WiFiServer server(3001);

// Network Configuration
const char* ssid = "LCT-600 Wifi";
const char* password = "Lampson@21";

// TCP Server
WiFiServer tcpServer(3001);
WiFiClient tcpClient;

// Static IP Configuration (Optional but recommended)
IPAddress local_IP(192, 168, 1, 100);  // Set your desired static IP
IPAddress gateway(192, 168, 1, 1);     // Your router's IP
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(8, 8, 8, 8);      // Optional

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🚀 Arduino Opta Crane Control Starting...");
  Serial.println("================================");
  
  // Configure static IP (optional)
  WiFi.config(local_IP, gateway, subnet, primaryDNS);
  Serial.println("📍 Static IP configuration applied");
  
  // Connect to WiFi
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("🌐 Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("📶 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("🔄 Check your WiFi credentials and try again");
    return;
  }
  
  // Start TCP Server
  tcpServer.begin();
  Serial.println("🔌 TCP Server started on port 3001");
  Serial.println("⏳ Waiting for bridge connection...");
  Serial.println("================================");
}

void loop() {
  // Check for new client connections
  if (!tcpClient || !tcpClient.connected()) {
    tcpClient = tcpServer.available();
    if (tcpClient) {
      Serial.println("🔗 Bridge connected!");
      Serial.print("📱 Client IP: ");
      Serial.println(tcpClient.remoteIP());
      
      // Send welcome message
      tcpClient.println("{\"type\":\"connection\",\"status\":\"connected\",\"device\":\"arduino_opta\"}");
    }
  }
  
  // Handle incoming data from bridge
  if (tcpClient && tcpClient.connected() && tcpClient.available()) {
    String jsonCommand = tcpClient.readStringUntil('\n');
    jsonCommand.trim();
    
    if (jsonCommand.length() > 0) {
      Serial.println("📨 COMMAND RECEIVED:");
      Serial.println("Raw: " + jsonCommand);
      
      // Parse and log the command details
      parseAndLogCommand(jsonCommand);
      
      // Send acknowledgment back to bridge
      String response = "{\"type\":\"ack\",\"command\":\"" + jsonCommand + "\",\"timestamp\":\"" + String(millis()) + "\"}";
      tcpClient.println(response);
      Serial.println("✅ Acknowledgment sent");
      Serial.println("--------------------------------");
    }
  }
  
  // Check connection status every 10 seconds
  static unsigned long lastStatusCheck = 0;
  if (millis() - lastStatusCheck > 10000) {
    lastStatusCheck = millis();
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi connection lost, attempting reconnect...");
      WiFi.begin(ssid, password);
    }
    
    if (tcpClient && !tcpClient.connected()) {
      Serial.println("⚠️ Bridge disconnected");
      tcpClient.stop();
    }
  }
  
  delay(10); // Small delay to prevent overwhelming the processor
}

void parseAndLogCommand(String jsonCommand) {
  Serial.println("🔍 PARSING COMMAND:");
  
  // Check for command type
  if (jsonCommand.indexOf("\"type\":\"cmd\"") != -1) {
    Serial.println("📋 Command Type: CRANE CONTROL");
    
    // Extract main power status
    if (jsonCommand.indexOf("\"mainPower\":true") != -1) {
      Serial.println("⚡ Main Power: ON");
    } else if (jsonCommand.indexOf("\"mainPower\":false") != -1) {
      Serial.println("⚡ Main Power: OFF");
    }
    
    // Extract emergency stop
    if (jsonCommand.indexOf("\"emergencyStop\":true") != -1) {
      Serial.println("🚨 EMERGENCY STOP: ACTIVATED");
    } else if (jsonCommand.indexOf("\"emergencyStop\":false") != -1) {
      Serial.println("🚨 Emergency Stop: Normal");
    }
    
    // Extract engine states
    if (jsonCommand.indexOf("\"leftEngine\":true") != -1) {
      Serial.println("🔧 Left Engine: ON");
    } else if (jsonCommand.indexOf("\"leftEngine\":false") != -1) {
      Serial.println("🔧 Left Engine: OFF");
    }
    
    if (jsonCommand.indexOf("\"rightEngine\":true") != -1) {
      Serial.println("🔧 Right Engine: ON");
    } else if (jsonCommand.indexOf("\"rightEngine\":false") != -1) {
      Serial.println("🔧 Right Engine: OFF");
    }
    
    // Extract horn
    if (jsonCommand.indexOf("\"horn\":true") != -1) {
      Serial.println("📯 Horn: ACTIVE");
    }
    
    // Extract left track direction
    if (jsonCommand.indexOf("\"left\":{\"dir\":\"fwd\"") != -1) {
      Serial.println("⬅️ Left Track: FORWARD");
    } else if (jsonCommand.indexOf("\"left\":{\"dir\":\"rev\"") != -1) {
      Serial.println("⬅️ Left Track: REVERSE");
    } else if (jsonCommand.indexOf("\"left\":{\"dir\":\"stop\"") != -1) {
      Serial.println("⬅️ Left Track: STOP");
    }
    
    // Extract right track direction
    if (jsonCommand.indexOf("\"right\":{\"dir\":\"fwd\"") != -1) {
      Serial.println("➡️ Right Track: FORWARD");
    } else if (jsonCommand.indexOf("\"right\":{\"dir\":\"rev\"") != -1) {
      Serial.println("➡️ Right Track: REVERSE");
    } else if (jsonCommand.indexOf("\"right\":{\"dir\":\"stop\"") != -1) {
      Serial.println("➡️ Right Track: STOP");
    }
    
    // Extract throttle values
    int leftThrottleStart = jsonCommand.indexOf("\"left\":{\"dir\":");
    if (leftThrottleStart != -1) {
      int throttlePos = jsonCommand.indexOf("\"throttle\":", leftThrottleStart);
      if (throttlePos != -1) {
        int throttleStart = throttlePos + 11;
        int throttleEnd = jsonCommand.indexOf("}", throttleStart);
        String leftThrottle = jsonCommand.substring(throttleStart, throttleEnd);
        Serial.println("⬅️ Left Throttle: " + leftThrottle + "%");
      }
    }
    
    int rightThrottleStart = jsonCommand.indexOf("\"right\":{\"dir\":");
    if (rightThrottleStart != -1) {
      int throttlePos = jsonCommand.indexOf("\"throttle\":", rightThrottleStart);
      if (throttlePos != -1) {
        int throttleStart = throttlePos + 11;
        int throttleEnd = jsonCommand.indexOf("}", throttleStart);
        String rightThrottle = jsonCommand.substring(throttleStart, throttleEnd);
        Serial.println("➡️ Right Throttle: " + rightThrottle + "%");
      }
    }
    
    Serial.println("🎯 READY FOR CRANE EXECUTION");
    
  } else if (jsonCommand.indexOf("\"type\":\"heartbeat\"") != -1) {
    Serial.println("💓 Heartbeat received - connection healthy");
  } else {
    Serial.println("❓ Unknown command type");
    Serial.println("Raw: " + jsonCommand);
  }
}