# CPE
Cisco Port Expansion

* Enables you to use an ESP32 directly from your Cisco Codec! Use Serial Ports and GPIO from macro framework. 
* Control projectors, monitors, matrices, relays (think motorized screens)
* Add buttons, knobs, sensors, LEDs and more!
* Use the functions you already know and love, such as pinMode, digitalWrite, digitalRead, analogWrite, analogRead
* Current performance is about 10 read/writes per second

## WARNING!
THIS IS ALPHA SOFTWARE. USE AT YOUR OWN RISK. I DON'T SUPPORT THIS SOFTWARE, NOR TAKE ANY RESPONSIBILITIES IF SOMETHING EXPLODES OR SOMEONE LOOSES AN ARM.

## Required hardware
* ESP32 (WROOM32)
* USB cable
* TTL-RS232 level converter (if you want to use serial ports)
* A Cisco Codec (tested with DeskPro and RoomKitPro)

## Current implementation
* Only the WROOM32 has been tested (might work with other boards)
* The ESP32 software will be available as a library (one day) so you can use it inside your own sketch.

## What's included ?
* INO sketch
* Macro Framework "Driver"
* Examples

## Usage
* Open the sketch in Arduino IDE
* Flash to your ESP2 board
* Import cpe.js and cpe-examples.js to your codec
* Connect your ESP32 to the codec USB port
* Press the "EN" button on the ESP32 or ground the "EN" pin (warning, if you jump EN to ground, you can't flash it until you break that jump)