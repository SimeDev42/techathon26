/* PlatformIO entry: run the same C beacon implementation as ESP-IDF. */
#include <Arduino.h>
#include "station_config.h"
#include "beacon.h"
extern "C" void techathon_beacon_start(void);
/* Keep the C3 BLE memory available during Arduino startup. */
extern "C" bool btInUse(void) { return true; }

void setup()
{
    Serial.begin(115200);
    delay(500);
    techathon_beacon_start();
    Serial.printf("iBeacon setup requested: major=%u minor=%u\n",
                  (unsigned)BEACON_MAJOR, (unsigned)BEACON_MINOR);
}

void loop()
{
    delay(1000); /* Controller advertises in the background. */
}
