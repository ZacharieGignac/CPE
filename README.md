# CPE
Cisco Port Expansion

* Enables you to use an ESP32 directly from your Cisco Codec! Use Serial Ports and GPIO from macro framework. 
* Control projectors, monitors, matrices, relays (think motorized screens)
* Add buttons, knobs, sensors, LEDs and more!
* Use the functions you already know and love, such as pinMode, digitalWrite, digitalRead, analogWrite, analogRead
* Current performance is about 10 read/writes per second

## Required hardware
* ESP32 (WROOM32)
* USB cable
* TTL-RS232 level converter (if you want to use serial ports)
* A Cisco Codec (tested with DeskPro and RoomKitPro)

## Current implementation
I do not give the source code for the ESP32 software yet. Only the WROOM32 is supported. The software will be available as a library so you can use it inside your own sketch. The current software is distributed as a binary.

The Cisco-Side driver source is available.
