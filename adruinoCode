#include "DHT.h"
#include <WiFi.h>
#include <WebServer.h>
#include <FirebaseESP32.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <time.h>

// ----- WiFi Credentials -----
const char* ssid = "IITRPR";
const char* password = "V#6qF?pyM!bQ$%NX";

#define FIREBASE_HOST "esp32-air-quality-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "2dYpBQrURFdrgWROHaRkrAS8usoAszMyhRm8NxcG"

// ----- Web Server -----
WebServer server(80);

// ----- DHT22 -----
#define DHTPIN 26
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ----- MQ Sensors -----
#define MQ135_PIN 34     // ADC for MQ135
#define MQ4_PIN   35     // ADC for MQ4
#define VCC       5.0    // Assuming powered by 5V
#define RLOAD     10000.0
#define RZERO135  76000.0   // Typical R0 for MQ135
#define RZERO4    10000.0   // Estimate R0 for MQ4

// ----- Air Quality Thresholds -----
#define CO2_GOOD 800
#define CO2_MODERATE 1000
#define CO2_POOR 1500
#define CH4_NORMAL 50
#define CH4_ELEVATED 200
#define CH4_HIGH 1000

// ----- Sensor Variables -----
float temperature = 0.0;
float humidity = 0.0;
float co2_ppm = 0.0;
float ch4_ppm = 0.0;
bool dht_error = false;

// ----- Connection Flags -----
bool wifi_connected = false;
bool firebase_connected = false;

// ----- Time Settings -----
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800;  // GMT+5:30 for India
const int   daylightOffset_sec = 0;

// ----- Firebase Objects -----
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ----- Timing Variables -----
unsigned long lastSensorRead = 0;
unsigned long lastUpload = 0;
const unsigned long SENSOR_READ_INTERVAL = 3000;  // Read sensors every 3 seconds
const unsigned long UPLOAD_INTERVAL = 60000;      // Upload to Firebase every 60 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);  // Give serial monitor time to start

  Serial.println("\n\n====== ESP32 Air Quality Monitor with Database ======");
  Serial.println("Initializing components...");
  
  // Initialize DHT sensor
  dht.begin();
  Serial.println("● DHT22 sensor initialized");
  
  // Set ADC resolution
  analogReadResolution(12);
  Serial.println("● ADC resolution set to 12-bit");
  
  // Connect to WiFi
  connectWiFi();
  
  if (wifi_connected) {
    // Set up time
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.println("● NTP time server configured");
    printLocalTime();
    
    // Initialize Firebase
    initFirebase();
    
    // Setup web server routes
    setupWebServer();
  }
  
  Serial.println("\n----- System Ready -----");
  Serial.println("Starting sensor monitoring...\n");
}

void loop() {
  // Current time
  unsigned long currentMillis = millis();

  // Handle web server requests
  if (wifi_connected) {
    server.handleClient();
  }
  
  // Read sensors at regular intervals
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readSensors();
    
    if (wifi_connected) {
      printToSerial();
    }
  }
  
  // Upload data to Firebase at regular intervals
  if (wifi_connected && firebase_connected && (currentMillis - lastUpload >= UPLOAD_INTERVAL)) {
    lastUpload = currentMillis;
    uploadToFirebase();
  }
  
  // Check WiFi status periodically
  checkWiFiStatus();
}

// ===== WIFI FUNCTIONS =====

void connectWiFi() {
  Serial.println("\n----- WiFi Configuration -----");
  Serial.print("● MAC Address: ");
  Serial.println(WiFi.macAddress());
  Serial.print("● Connecting to network: ");
  Serial.println(ssid);
  
  // Begin WiFi connection
  WiFi.begin(ssid, password);
  
  Serial.println("● Attempting connection... (this may take up to 20 seconds)");
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 40) {
    delay(500);
    Serial.print(".");
    attempt++;
    
    // Print detailed status every 10 attempts
    if (attempt % 10 == 0) {
      Serial.print(" [Status: ");
      printWiFiStatus(WiFi.status());
      Serial.print("] ");
    }
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifi_connected = true;
    Serial.println("\n✅ WIFI CONNECTION SUCCESSFUL");
    Serial.println("----- Network Information -----");
    Serial.print("● IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("● Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WIFI CONNECTION FAILED");
    Serial.println("● The system will operate in offline mode");
    Serial.println("● Only serial output will be available");
  }
}

void checkWiFiStatus() {
  static wl_status_t last_status = WL_NO_SHIELD;
  
  if (WiFi.status() != last_status) {
    if (WiFi.status() == WL_CONNECTED && !wifi_connected) {
      // WiFi just connected
      wifi_connected = true;
      Serial.println("\n✅ WIFI RECONNECTED");
      Serial.print("● IP Address: ");
      Serial.println(WiFi.localIP());
      
      // Reinitialize Firebase if we just reconnected
      initFirebase();
    } 
    else if (WiFi.status() != WL_CONNECTED && wifi_connected) {
      // WiFi just disconnected
      wifi_connected = false;
      firebase_connected = false;
      Serial.println("\n❌ WIFI CONNECTION LOST");
      Serial.println("● Attempting to reconnect...");
    }
    
    last_status = WiFi.status();
  }
  
  // Try to reconnect every 30 seconds if disconnected
  static unsigned long lastReconnectAttempt = 0;
  if (!wifi_connected && millis() - lastReconnectAttempt > 30000) {
    lastReconnectAttempt = millis();
    Serial.println("● Attempting to reconnect to WiFi...");
    WiFi.reconnect();
  }
}

void printWiFiStatus(wl_status_t status) {
  switch (status) {
    case WL_NO_SHIELD: Serial.print("No WiFi shield"); break;
    case WL_IDLE_STATUS: Serial.print("Idle"); break;
    case WL_NO_SSID_AVAIL: Serial.print("No SSID available"); break;
    case WL_SCAN_COMPLETED: Serial.print("Scan completed"); break;
    case WL_CONNECTED: Serial.print("Connected"); break;
    case WL_CONNECT_FAILED: Serial.print("Connection failed"); break;
    case WL_CONNECTION_LOST: Serial.print("Connection lost"); break;
    case WL_DISCONNECTED: Serial.print("Disconnected"); break;
    default: Serial.print("Unknown status"); break;
  }
}

// ===== FIREBASE FUNCTIONS =====

void initFirebase() {
  Serial.println("\n----- Firebase Configuration -----");
  
  // Configure Firebase credentials
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Check connection
  if (Firebase.ready()) {
    firebase_connected = true;
    Serial.println("✅ FIREBASE CONNECTION SUCCESSFUL");
    
    // Set database read timeout to 1 minute
    Firebase.setReadTimeout(fbdo, 1000 * 60);
    // Set database size limit
    Firebase.setwriteSizeLimit(fbdo, "tiny");
    
    // Create a test entry to verify connection
    String testPath = "/system/status";
    if (Firebase.setString(fbdo, testPath, "online")) {
      Serial.println("● Firebase test write successful");
      
      // Initialize database structure if needed
      initDatabaseStructure();
    } else {
      Serial.println("❌ Firebase test write failed: " + fbdo.errorReason());
      firebase_connected = false;
    }
  } else {
    Serial.println("❌ FIREBASE CONNECTION FAILED");
    firebase_connected = false;
  }
}

void initDatabaseStructure() {
  // Create basic structure for the database if it doesn't exist
  
  // System info
  String systemPath = "/system";
  if (Firebase.setString(fbdo, systemPath + "/device", "ESP32")) {
    Serial.println("● Database structure initialized");
  }
  
  // Check if device is registered, if not, register it
  String devicePath = "/devices/" + WiFi.macAddress();
  if (!Firebase.getJSON(fbdo, devicePath)) {
    FirebaseJson deviceInfo;
    deviceInfo.set("name", "ESP32-" + WiFi.macAddress().substring(9));
    deviceInfo.set("ip", WiFi.localIP().toString());
    deviceInfo.set("location", "Room");
    deviceInfo.set("firstSeen", getFormattedTime());
    
    if (Firebase.setJSON(fbdo, devicePath, deviceInfo)) {
      Serial.println("● Device registered in database");
    }
  } else {
    // Update device IP and last seen
    Firebase.setString(fbdo, devicePath + "/ip", WiFi.localIP().toString());
    Firebase.setString(fbdo, devicePath + "/lastSeen", getFormattedTime());
    Serial.println("● Device info updated in database");
  }
}

void uploadToFirebase() {
  if (!firebase_connected) return;
  
  Serial.println("\n[FIREBASE] Uploading sensor data...");
  
  // Get current timestamp
  String timestamp = getFormattedTime();
  String timestampPath = String(getEpochTime());
  
  // Create data JSON
  FirebaseJson sensorData;
  sensorData.set("timestamp", timestamp);
  sensorData.set("temperature", temperature);
  sensorData.set("humidity", humidity);
  sensorData.set("co2", co2_ppm);
  sensorData.set("methane", ch4_ppm);
  sensorData.set("dhtError", dht_error);
  
  // Path for this data point
  String dataPath = "/data/" + WiFi.macAddress() + "/" + timestampPath;

  // Upload data point
  if (Firebase.setJSON(fbdo, dataPath, sensorData)) {
    Serial.println("✅ Data uploaded successfully!");
    
    // Also update the latest readings
    String latestPath = "/latest/" + WiFi.macAddress();
    Firebase.setJSON(fbdo, latestPath, sensorData);
    
    // Update the status table with quality ratings
    updateQualityStatus();
  } else {
    Serial.println("❌ Firebase upload failed: " + fbdo.errorReason());
  }
}

void updateQualityStatus() {
  // Path for air quality status
  String statusPath = "/status/" + WiFi.macAddress();
  
  // Get air quality classifications
  String co2Class = getAirQualityClass(co2_ppm);
  String ch4Class = getMethaneLevelClass(ch4_ppm);
  
  // Create status JSON
  FirebaseJson statusData;
  statusData.set("co2/value", co2_ppm);
  statusData.set("co2/status", getAirQualityText(co2_ppm));
  statusData.set("co2/class", co2Class);
  
  statusData.set("methane/value", ch4_ppm);
  statusData.set("methane/status", getMethaneText(ch4_ppm));
  statusData.set("methane/class", ch4Class);
  
  // Set overall air quality based on worst indicator
  String overallClass = "good";
  if (co2Class == "poor" || ch4Class == "poor") {
    overallClass = "poor";
  } else if (co2Class == "moderate" || ch4Class == "moderate") {
    overallClass = "moderate";
  }
  
  statusData.set("overall", overallClass);
  statusData.set("updatedAt", getFormattedTime());
  
  // Upload status
  Firebase.setJSON(fbdo, statusPath, statusData);
}

// ===== SENSOR FUNCTIONS =====

void readSensors() {
  // ----- DHT22 Reading -----
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  if (isnan(temp) || isnan(hum)) {
    dht_error = true;
  } else {
    temperature = temp;
    humidity = hum;
    dht_error = false;
  }

  // ----- MQ135 Reading -----
  int mq135_raw = analogRead(MQ135_PIN);
  float mq135_voltage = (mq135_raw * VCC) / 4095.0;
  float rs135 = ((VCC - mq135_voltage) * RLOAD) / mq135_voltage;
  float ratio135 = rs135 / RZERO135;
  co2_ppm = 116.6020682 * pow(ratio135, -2.769034857);

  // ----- MQ4 Reading -----
  int mq4_raw = analogRead(MQ4_PIN);
  float mq4_voltage = (mq4_raw * VCC) / 4095.0;
  float rs4 = ((VCC - mq4_voltage) * RLOAD) / mq4_voltage;
  float ratio4 = rs4 / RZERO4;
  ch4_ppm = 1000 * pow(ratio4, -1.5);  // Ballpark estimate
}

void printToSerial() {
  Serial.println("\n----- Air Quality Report -----");
  if (dht_error) {
    Serial.println("⚠️ DHT22 read failed!");
  } else {
    Serial.print("🌡️ Temp: "); Serial.print(temperature, 1);
    Serial.print(" °C | 💧 Humidity: "); Serial.print(humidity, 1);
    Serial.println(" %");
  }

  Serial.print("🌫️ MQ135 -> CO₂ Estimate: ");
  Serial.print(co2_ppm, 1); Serial.println(" ppm");

  Serial.print("🔥 MQ4 -> Methane Estimate: ");
  Serial.print(ch4_ppm, 1); Serial.println(" ppm");
  
  if (firebase_connected) {
    Serial.print("🔄 Next database upload in: ");
    int timeToNextUpload = (UPLOAD_INTERVAL - (millis() - lastUpload)) / 1000;
    Serial.print(timeToNextUpload);
    Serial.println(" seconds");
  }

  Serial.println("--------------------------------------");
}

// ===== WEB SERVER FUNCTIONS =====

void setupWebServer() {
  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.on("/refresh", handleRefresh);
  server.on("/history", handleHistory);
  
  server.begin();
  Serial.println("● Web server started on port 80");
  Serial.print("● Dashboard URL: http://");
  Serial.println(WiFi.localIP());
}

void handleRoot() {
  String html = "<!DOCTYPE html>\n";
  html += "<html lang='en'>\n";
  html += "<head>\n";
  html += "  <meta charset='UTF-8'>\n";
  html += "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n";
  html += "  <title>Air Quality Monitor</title>\n";
  html += "  <style>\n";
  html += "    * { box-sizing: border-box; margin: 0; padding: 0; }\n";
  html += "    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }\n";
  html += "    .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n";
  html += "    h1 { color: #333; text-align: center; margin-bottom: 20px; }\n";
  html += "    .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }\n";
  html += "    .card { background: white; border-radius: 8px; padding: 15px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }\n";
  html += "    .card-header { font-size: 16px; color: #555; margin-bottom: 10px; }\n";
  html += "    .card-value { font-size: 28px; font-weight: bold; margin-bottom: 5px; }\n";
  html += "    .unit { font-size: 14px; color: #777; }\n";
  html += "    .status { display: flex; align-items: center; justify-content: center; margin-top: 10px; }\n";
  html += "    .indicator { width: 12px; height: 12px; border-radius: 50%; margin-right: 5px; }\n";
  html += "    .good { background-color: #4CAF50; }\n";
  html += "    .moderate { background-color: #FF9800; }\n";
  html += "    .poor { background-color: #F44336; }\n";
  html += "    .warning { background-color: #ffecb3; color: #e67e22; padding: 10px; border-radius: 4px; margin-bottom: 15px; text-align: center; }\n";
  html += "    .footer { text-align: center; margin-top: 20px; color: #777; }\n";
  html += "    .btn { display: inline-block; margin: 10px 5px; padding: 8px 15px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; }\n";
  html += "    .btn-secondary { background: #607D8B; }\n";
  html += "    .firebase-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 5px; display: inline-block; }\n";
  html += "    .online { background-color: #e6f7e6; color: #4CAF50; }\n";
  html += "    .offline { background-color: #ffebee; color: #F44336; }\n";
  html += "  </style>\n";
  html += "  <script>\n";
  html += "    function updateData() {\n";
  html += "      fetch('/data')\n";
  html += "        .then(response => response.json())\n";
  html += "        .then(data => {\n";
  html += "          document.getElementById('temperature').textContent = data.temp.toFixed(1);\n";
  html += "          document.getElementById('humidity').textContent = data.humidity.toFixed(1);\n";
  html += "          document.getElementById('co2').textContent = data.co2.toFixed(1);\n";
  html += "          document.getElementById('methane').textContent = data.ch4.toFixed(1);\n";
  html += "          document.getElementById('last-update').textContent = data.lastUpdate;\n";
  html += "          \n";
  html += "          document.getElementById('co2-indicator').className = 'indicator ' + data.co2Class;\n";
  html += "          document.getElementById('co2-status').textContent = data.co2Text;\n";
  html += "          \n";
  html += "          document.getElementById('methane-indicator').className = 'indicator ' + data.ch4Class;\n";
  html += "          document.getElementById('methane-status').textContent = data.ch4Text;\n";
  html += "          \n";
  html += "          if (data.dhtError) {\n";
  html += "            document.getElementById('dht-warning').style.display = 'block';\n";
  html += "          } else {\n";
  html += "            document.getElementById('dht-warning').style.display = 'none';\n";
  html += "          }\n";
  html += "        })\n";
  html += "        .catch(error => {\n";
  html += "          console.error('Error fetching data:', error);\n";
  html += "        });\n";
  html += "    }\n";
  html += "    setInterval(updateData, 3000);\n";
  html += "    window.onload = updateData;\n";
  html += "  </script>\n";
  html += "</head>\n";
  html += "<body>\n";
  html += "  <div class='container'>\n";
  html += "    <h1>Air Quality Monitor</h1>\n";
  
  html += "    <div id='dht-warning' class='warning' style='display:";
  html += dht_error ? "block" : "none";
  html += ";'>\n";
  html += "      ⚠️ Warning: Temperature/Humidity sensor reading failed\n";
  html += "    </div>\n";
  
  html += "    <div class='dashboard'>\n";
  html += "      <div class='card'>\n";
  html += "        <div class='card-header'>Temperature</div>\n";
  html += "        <div class='card-value'><span id='temperature'>" + String(temperature, 1) + "</span> <span class='unit'>°C</span></div>\n";
  html += "      </div>\n";
  
  html += "      <div class='card'>\n";
  html += "        <div class='card-header'>Humidity</div>\n";
  html += "        <div class='card-value'><span id='humidity'>" + String(humidity, 1) + "</span> <span class='unit'>%</span></div>\n";
  html += "      </div>\n";
  
  html += "      <div class='card'>\n";
  html += "        <div class='card-header'>CO₂ Level</div>\n";
  html += "        <div class='card-value'><span id='co2'>" + String(co2_ppm, 1) + "</span> <span class='unit'>ppm</span></div>\n";
  html += "        <div class='status'>\n";
  html += "          <div id='co2-indicator' class='indicator " + getAirQualityClass(co2_ppm) + "'></div>\n";
  html += "          <span id='co2-status'>" + getAirQualityText(co2_ppm) + "</span>\n";
  html += "        </div>\n";
  html += "      </div>\n";
  
  html += "      <div class='card'>\n";
  html += "        <div class='card-header'>Methane</div>\n";
  html += "        <div class='card-value'><span id='methane'>" + String(ch4_ppm, 1) + "</span> <span class='unit'>ppm</span></div>\n";
  html += "        <div class='status'>\n";
  html += "          <div id='methane-indicator' class='indicator " + getMethaneLevelClass(ch4_ppm) + "'></div>\n";
  html += "          <span id='methane-status'>" + getMethaneText(ch4_ppm) + "</span>\n";
  html += "        </div>\n";
  html += "      </div>\n";
  html += "    </div>\n";
  
  html += "    <div class='footer'>\n";
  html += "      <p>ESP32 Air Quality Monitoring System</p>\n";
  html += "      <p>IP: " + WiFi.localIP().toString() + "</p>\n";
  html += "      <div class='firebase-status " + String(firebase_connected ? "online" : "offline") + "'>";
  html += "        Database: " + String(firebase_connected ? "Connected" : "Disconnected");
  html += "      </div>\n";
  html += "      <p>Last Update: <span id='last-update'>" + getFormattedTime() + "</span></p>\n";
  html += "      <a href='/refresh' class='btn'>Refresh Now</a>\n";
  html += "      <a href='/history' class='btn btn-secondary'>View History</a>\n";
  html += "    </div>\n";
  html += "  </div>\n";
  html += "</body>\n";
  html += "</html>";

  server.send(200, "text/html", html);
}

void handleData() {
  String json = "{";
  json += "\"temp\":" + String(temperature) + ",";
  json += "\"humidity\":" + String(humidity) + ",";
  json += "\"co2\":" + String(co2_ppm) + ",";
  json += "\"ch4\":" + String(ch4_ppm) + ",";
  json += "\"dhtError\":" + String(dht_error ? "true" : "false") + ",";
  json += "\"co2Class\":\"" + getAirQualityClass(co2_ppm) + "\",";
  json += "\"co2Text\":\"" + getAirQualityText(co2_ppm) + "\",";
  json += "\"ch4Class\":\"" + getMethaneLevelClass(ch4_ppm) + "\",";
  json += "\"ch4Text\":\"" + getMethaneText(ch4_ppm) + "\",";
  json += "\"lastUpdate\":\"" + getFormattedTime() + "\",";
  json += "\"databaseStatus\":\"" + String(firebase_connected ? "connected" : "disconnected") + "\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleRefresh() {
  readSensors();
  server.sendHeader("Location", "/");
  server.send(303);
}

void handleHistory() {
  String html = "<!DOCTYPE html>\n";
  html += "<html lang='en'>\n";
  html += "<head>\n";
  html += "  <meta charset='UTF-8'>\n";
  html += "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n";
  html += "  <title>Air Quality History</title>\n";
  html += "  <style>\n";
  html += "    * { box-sizing: border-box; margin: 0; padding: 0; }\n";
  html += "    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }\n";
  html += "    .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n";
  html += "    h1 { color: #333; text-align: center; margin-bottom: 20px; }\n";
  html += "    .info-box { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }\n";
  html += "    .btn { display: inline-block; margin: 10px 5px; padding: 8px 15px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; }\n";
  html += "    .footer { text-align: center; margin-top: 20px; color: #777; }\n";
  html += "  </style>\n";
  html += "</head>\n";
  html += "<body>\n";
  html += "  <div class='container'>\n";
  html += "    <h1>Air Quality History</h1>\n";
  
  html += "    <div class='info-box'>\n";
  html += "      <p>Your air quality data is being stored in Firebase!</p>\n";
  html += "      <p>To view your historical data and charts:</p>\n";
  html += "      <ol>\n";
  html += "        <li>Visit the Firebase Console</li>\n";
  html += "        <li>Go to your project: 'ESP32-Air-Quality'</li>\n";
  html += "        <li>Navigate to the Realtime Database section</li>\n";
  html += "        <li>Explore the 'data' node to see all historical readings</li>\n";
  html += "      </ol>\n";
  html += "      <p>For advanced analytics, you can connect your Firebase database to tools like Google Data Studio or download the data for analysis.</p>\n";
  html += "    </div>\n";
  
  if (firebase_connected) {
    html += "    <div>\n";
    html += "      <p><strong>Device ID:</strong> " + WiFi.macAddress() + "</p>\n";
    html += "      <p><strong>Data points stored:</strong> Every minute</p>\n";
    html += "      <p><strong>Database status:</strong> Connected</p>\n";
    html += "      <p><strong>Last upload:</strong> " + getFormattedTime() + "</p>\n";
    html += "    </div>\n";
  } else {
    html += "    <div style='color: #F44336;'>\n";
    html += "      <p><strong>Database Status:</strong> Disconnected</p>\n";
    html += "      <p>Cannot retrieve history while disconnected from Firebase.</p>\n";
    html += "    </div>\n";
  }
  
  html += "    <div class='footer'>\n";
  html += "      <a href='/' class='btn'>Back to Dashboard</a>\n";
  html += "    </div>\n";
  html += "  </div>\n";
  html += "</body>\n";
  html += "</html>";

  server.send(200, "text/html", html);
}

// ===== UTILITY FUNCTIONS =====

String getAirQualityClass(float co2) {
  if (co2 < CO2_GOOD) return "good";
  if (co2 < CO2_MODERATE) return "moderate";
  return "poor";
}

String getMethaneLevelClass(float ch4) {
  if (ch4 < CH4_NORMAL) return "good";
  if (ch4 < CH4_ELEVATED) return "moderate";
  return "poor";
}

String getAirQualityText(float co2) {
  if (co2 < CO2_GOOD) return "Good";
  if (co2 < CO2_MODERATE) return "Moderate";
  return "Poor";
}

String getMethaneText(float ch4) {
  if (ch4 < CH4_NORMAL) return "Normal";
  if (ch4 < CH4_ELEVATED) return "Elevated";
  return "High";
}

void printLocalTime() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("Failed to obtain time");
    return;
  }
  Serial.println(&timeinfo, "● Current time: %A, %B %d %Y %H:%M:%S");
}

String getFormattedTime() {
  struct tm timeinfo;
  char timeStr[30];
  
  if(!getLocalTime(&timeinfo)){
    return "Time not available";
  }
  
  strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeStr);
}

unsigned long getEpochTime() {
  time_t now;
  time(&now);
  return now;
}
