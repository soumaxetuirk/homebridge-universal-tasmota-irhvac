v2.1.2

added
* Readme pushed to npm

---

v2.1.1

Added
* Code fix for mode change
* Optimisation of Auto mode

---

V 2.1.0

Added

* Proper implementation of Auto Mode.
* Improved compatibility with HVAC devices supporting native Auto operation.

Improvements

* General stability improvements.
* Internal code optimizations and cleanup.

⸻

V 2.0.0

Added

* Support for room temperature sensors through MQTT.
* Physical remote synchronization using Tasmota IRReceive.
* Automatic state updates when commands are received from the original IR remote.
* Multiple device type support:
    * Air Conditioner
    * Heater
    * Thermostat

Notes

* IRReceive synchronization requires the same vendor and model configuration as the HVAC device.
* Tasmota IRReceive must be enabled and properly configured.

⸻

V 1.0.4

Fixed

* Fixed use of cached accessory instead of creating a new accessory every startup.
* Fixed occasional initialization issue causing target temperature to become 10°C and trigger HomeKit errors.
* Fixed plugin updates requiring manual cache clearing before changes took effect.

Full Changelog: 1.0.3…1.0.4

⸻

V 1.0.3

Initial Release

* First public release of Homebridge Universal Tasmota IR HVAC.
* Basic HomeKit HVAC control through Tasmota IRHVAC.
* MQTT communication support.
* Temperature control support.
* Mode switching support.
* Fan speed control support.

⸻

V 1.0.2

Improvements

* Homebridge compatibility improvements.
* MQTT communication optimizations.
* Improved accessory initialization handling.
* Internal bug fixes and stability improvements.

⸻

V 1.0.1

Fixed

* Minor bug fixes.
* Improved configuration validation.
* Improved error handling and logging

⸻

V 1.0.0

Initial NPM Release

* Initial npm package publication.
* Basic integration between Homebridge and Tasmota IRHVAC.
* HomeKit control for HVAC devices.
