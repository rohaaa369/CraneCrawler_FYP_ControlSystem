# CraneCrawler_FYP_ControlSystem  
**Evolution from RF to Wi-Fi-Based Remote Control: Development of an Industrial IoT Crane Crawler System**  
Final Year Project – University of Newcastle, 2025  
Student: Rohan Koshy Thomas 

---

## Overview
This repository contains the complete implementation of a Wi-Fi-enabled control and monitoring system designed to modernise the LCT600-12 relay-based crane crawler.  
The system replaces legacy RF and wired control with a secure Industrial IoT architecture built on the Arduino Opta PLC, a Node.js communication bridge, and a Progressive Web Application (PWA) operator interface.  
It enables real-time wireless operation, telemetry acquisition, and predictive maintenance while preserving safety and manual fallback functions.

---

## System Architecture
The system consists of four integrated layers:

1. **Arduino Opta PLC (Firmware Layer)**  
   - Interfaces directly with the LCT600-12 control panel via analog and digital I/O.  
   - Executes safety-critical logic, relay actuation, and sensor data acquisition.  
   - Operates under a dual-core architecture for separation of safety and communication tasks.  

2. **Node.js Bridge Server (Middleware Layer)**  
   - Runs on a local industrial PC or Raspberry Pi.  
   - Provides bidirectional protocol translation between WebSocket (browser) and TCP (Opta PLC).  
   - Implements message validation, rate limiting, logging, and fault recovery.  

3. **Progressive Web Application (Interface Layer)**  
   - Cross-platform operator UI for tablet and desktop.  
   - Implements WebSocket communication for direct control and telemetry.  
   - Provides offline capability through service workers, ensuring continuity during Wi-Fi interruptions.  

4. **Arduino Cloud IoT Platform (Maintenance Layer)**  
   - Periodically synchronises operational metrics such as temperatures, runtime hours, and service intervals.  
   - Enables predictive maintenance dashboards and fleet-level analytics independent of control functions.  

---

## Technical Highlights
- **Communication Protocol:** WebSocket ↔ TCP bidirectional messaging  
- **Average Command Latency:** 34 ms (σ = 12 ms)  
- **Operational Range:** 142 m line-of-sight using TP-Link CPE210  
- **Fail-Safe Design:** Hardware E-Stop, watchdog timer, and communication timeout (< 500 ms)  
- **Compatibility:** Operates on 24 V DC control circuits without modifying legacy safety wiring  

---

## Repository Structure
