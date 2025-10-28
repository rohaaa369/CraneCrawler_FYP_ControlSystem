/*
  Crane Maintenance Data Logger - DEMO MODE
  Simulates realistic crane operational data for thesis demonstration
*/

#include "thingProperties.h"

// Pin definitions (not used in simulation mode)
#define ENGINE_TEMP_PIN A0
#define GEARBOX_TEMP_PIN A1
#define GEARBOX_PRESSURE_PIN A2
#define TACHOMETER_PIN A3

// Maintenance tracking
struct MaintenanceData {
    float totalEngineSeconds;
    float lastServiceHours;
    int criticalEvents;
} maintenance;

const float SERVICE_INTERVAL = 50.0;

// Simulation variables
unsigned long simulationStart = 0;
bool engineRunning = true;
int simulationScenario = 1; // Change this to cycle through different scenarios

void setup() {
    Serial.begin(115200);
    delay(1500);
    
    Serial.println("Crane Maintenance Logger Starting - SIMULATION MODE");

    pinMode(ENGINE_TEMP_PIN, INPUT);
    pinMode(GEARBOX_TEMP_PIN, INPUT);
    pinMode(GEARBOX_PRESSURE_PIN, INPUT);
    pinMode(TACHOMETER_PIN, INPUT);

    // Initialize with simulated operational hours
    maintenance.totalEngineSeconds = 42.3 * 3600; // 42.3 hours of operation
    maintenance.lastServiceHours = 0;
    maintenance.criticalEvents = 0;
    
    simulationStart = millis();

    initProperties();
    ArduinoCloud.begin(ArduinoIoTPreferredConnection);
    
    setDebugMessageLevel(2);
    ArduinoCloud.printDebugInfo();
    
    systemStatus = "Initializing...";
}

void loop() {
    ArduinoCloud.update();
    
    simulateRealisticOperation();
    calculateServiceInterval();
    updateStatusMessage();
    
    delay(1000); // Update every second
}

void simulateRealisticOperation() {
    unsigned long runtime = (millis() - simulationStart) / 1000; // seconds since start
    
    // Select scenario (change simulationScenario variable to switch modes)
    switch(simulationScenario) {
        case 1: // Normal operation
            simulateNormalOperation(runtime);
            break;
        case 2: // High temperature warning
            simulateHighTemperature(runtime);
            break;
        case 3: // Service due soon
            simulateServiceDue(runtime);
            break;
        case 4: // Low oil pressure critical
            simulateLowPressure(runtime);
            break;
        default:
            simulateNormalOperation(runtime);
    }
    
    // Gradually accumulate engine hours during simulation
    if (engineRunning) {
        maintenance.totalEngineSeconds += 1.0; // Add 1 second
    }
    
    Serial.print("Scenario ");
    Serial.print(simulationScenario);
    Serial.print(" | Eng: ");
    Serial.print(engineTemp);
    Serial.print("C | Gear: ");
    Serial.print(gearboxTemp);
    Serial.print("C | Hours: ");
    Serial.println(engineHours, 1);
}

void simulateNormalOperation(unsigned long runtime) {
    // Realistic operating temperatures with slight variation
    engineTemp = 85 + (runtime % 10) - 5; // 80-90°C range
    gearboxTemp = 68 + (runtime % 8) - 4; // 64-72°C range
    engineRunning = true;
}

void simulateHighTemperature(unsigned long runtime) {
    // Engine running hot
    engineTemp = 102 + (runtime % 6); // 102-108°C (warning zone)
    gearboxTemp = 88 + (runtime % 5); // 88-93°C (high but ok)
    engineRunning = true;
}

void simulateServiceDue(unsigned long runtime) {
    // Normal temps but close to service interval
    engineTemp = 82 + (runtime % 8);
    gearboxTemp = 70 + (runtime % 6);
    
    // Set hours close to service interval
    maintenance.totalEngineSeconds = (SERVICE_INTERVAL - 3.2) * 3600; // 3.2 hours until service
    engineRunning = true;
}

void simulateLowPressure(unsigned long runtime) {
    // Critical low pressure scenario
    engineTemp = 95 + (runtime % 5);
    gearboxTemp = 78 + (runtime % 4);
    engineRunning = true;
}

void calculateServiceInterval() {
    engineHours = maintenance.totalEngineSeconds / 3600.0;
    float hoursSinceService = engineHours - maintenance.lastServiceHours;
    hoursToService = SERVICE_INTERVAL - hoursSinceService;

    Serial.print("Engine Hrs: ");
    Serial.print(engineHours, 1);
    Serial.print(" | To Service: ");
    Serial.println(hoursToService, 1);
}

void updateStatusMessage() {
    // Simulate hydraulic pressure based on scenario
    int hydraulicPressure;
    
    if (simulationScenario == 4) {
        hydraulicPressure = 12; // Critical low
    } else {
        hydraulicPressure = 65; // Normal
    }

    if (hydraulicPressure < 20) {
        systemStatus = "CRITICAL: Low oil pressure " + String(hydraulicPressure) + " PSI";
        maintenance.criticalEvents++;
    } 
    else if (engineTemp > 105) {
        systemStatus = "WARNING: High engine temp " + String(engineTemp) + "C";
    } 
    else if (gearboxTemp > 90) {
        systemStatus = "WARNING: High gearbox temp " + String(gearboxTemp) + "C";
    } 
    else if (hoursToService <= 0) {
        systemStatus = "SERVICE OVERDUE by " + String(abs(hoursToService), 1) + " hrs";
    } 
    else if (hoursToService < 5.0) {
        systemStatus = "Service due soon: " + String(hoursToService, 1) + " hrs";
    } 
    else if (hoursToService < 10.0) {
        systemStatus = "OK - Service in " + String((int)hoursToService) + " hrs";
    } 
    else {
        systemStatus = "Running normally - " + String(engineHours, 1) + " total hrs";
    }
}

