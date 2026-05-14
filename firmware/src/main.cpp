#include <Arduino.h>
#include <WiFi.h>
#include <FirebaseESP32.h>

// WiFi credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase credentials
#define FIREBASE_HOST "practive-b6bbc-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET" // Legacy secret or service account

FirebaseData firebaseData;

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());

  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);
}

void loop() {
  // Mock data for now
  float pm25 = random(10, 50);
  float pm10 = random(20, 100);
  float co = random(0, 5);
  float nh3 = random(5, 20);
  float temp = random(20, 35);
  float humidity = random(40, 80);

  Firebase.setFloat(firebaseData, "/sensors/pm25", pm25);
  Firebase.setFloat(firebaseData, "/sensors/pm10", pm10);
  Firebase.setFloat(firebaseData, "/sensors/co", co);
  Firebase.setFloat(firebaseData, "/sensors/nh3", nh3);
  Firebase.setFloat(firebaseData, "/sensors/temp", temp);
  Firebase.setFloat(firebaseData, "/sensors/humidity", humidity);

  delay(5000); // Send data every 5 seconds
}
