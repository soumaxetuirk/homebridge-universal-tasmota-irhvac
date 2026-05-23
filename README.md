# Homebridge Universal Tasmota IR HVAC
[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=for-the-badge&logoColor=%23FFFFFF&logo=homebridge)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![npm](https://img.shields.io/npm/dw/homebridge-universal-tasmota-irhvac)](https://www.npmjs.com/package/homebridge-universal-tasmota-irhvac)
[![npm](https://img.shields.io/npm/dt/homebridge-universal-tasmota-irhvac)](https://www.npmjs.com/package/homebridge-universal-tasmota-irhvac)

A  plugin for controlling IR-based air conditioners using **Tasmota IRHVAC** based on IRremoteESP8266 Library and **MQTT**.

Designed for setups using a IR blaster, flashed with tasmota and configured with mqtt.Tasmota receives IRHVAC payload sent to separate topic also sends confirmation of full payload in tele topic.

It also displays weather-based temperature using Open-Meteo so HomeKit can show realistic ambient current temperature even when no physical room sensor is available.

---

# ✨ Features

- ❄️ Native HomeKit HeaterCooler support
- 🀞  Sync status with Physical IR remote
- 🌡️ Weather-based or Sensor based current temperature display
- 🌀 Fan speed control
- 🔄 Swing mode support
- 🌿 Eco mode support (Child lock toggle)


---

# 📦 Installation

Install through npm:

```bash
npm install -g homebridge-universal-tasmota-irhvac
```

Or search for:

```text
homebridge-universal-tasmota-irhvac
```

inside the Homebridge UI plugin search.

---

# Homebridge Configuration

Add the following to your Homebridge `config.json`:

```json
{
  "platform": "UniversalTasmotaIRHVAC",

  "mqtt": {
    "url": "mqtt://127.0.0.1:1883",
    "username": "mqtt_user",
    "password": "mqtt_password",
    "topicPublish": "cmnd/devicename/IRHVAC"
  },

  "latitude": 60.7128,
  "longitude": 84.0060,

  "devices": [
    {
      "name": "Living Room AC",
      "vendor": "LG",
      "model": "1",
      "temperatureTopic": "home/TEMP_Sensor/temperature",
      "topicReceiveIR": "tele/IR_Sensor/RESULT",
      "manufacturer": "LG",
      "serial": "AC001",
      "version": "1.0"
    }
  ]
}
```

---

# Configuration Reference

## MQTT Settings

| Field | Type | Description |
|------|------|-------------|
| `url` | string | MQTT broker URL |
| `username` | string | MQTT username |
| `password` | string | MQTT password |
| `topicPublish` | string | MQTT topic used for sending IRHVAC commands |

### Example

```json
"mqtt": {
  "url": "mqtt://192.168.1.10:1883",
  "username": "mqtt_user",
  "password": "mqtt_password",
  "topicPublish": "cmnd/DeviceName/IRHVAC"
}
```

---

# current temperature Settings

The plugin displays weather station based current temperature in HomeKit using the Open-Meteo weather API. Or if you have Temperature sensor installed then just enter temperatureTopic in config. 

Weather station based temperature is considered when TemperatureTopic is not populated. That is useful for IR-only AC setups where no room temperature sensor is available.

| Field | Type | Description |
|------|------|-------------|
| `latitude` | number | Latitude used for weather lookup |
| `longitude` | number | Longitude used for weather lookup |

### Example

```json
"latitude": 50.7128,
"longitude": 74.0060
```

### Notes

- Used only for HomeKit Current Temperature
- Does not affect AC target temperature
- No constant polling loops are used
- Temperature topic should be providing temperature directly not in json format.

---

# Device Settings

Each entry inside the `devices` array creates one HomeKit accessory.

| Field | Type | Description |
|------|------|-------------|
| `name` | string | Name shown in HomeKit |
| `vendor` | string | AC brand/vendor |
| `model` | string | IRHVAC model code |
| `manufacturer` | string | Manufacturer shown in HomeKit |
| `serial` | string | Accessory serial number |
| `version` | string | Firmware or accessory version |

### Example

```json
{
  "name": "Bedroom AC",
  "vendor": "LG",
  "model": "AKB75215403",
  "manufacturer": "LG",
  "serial": "BEDROOM001",
  "version": "1.0"
}
```

---

# HomeKit Features

The plugin exposes the following HomeKit characteristics:

| Characteristic | Purpose |
|---------------|----------|
| Active | Power ON/OFF |
| CurrentTemperature | Weather-based temperature |
| TargetHeaterCoolerState | Cool / Auto |
| CoolingThresholdTemperature | Target temperature |
| RotationSpeed | Fan speed |
| SwingMode | Swing control |
| LockPhysicalControls | Eco mode toggle |

--
## Target State Mapping

| HomeKit State | IRHVAC Mode |
|--------------|-------------|
| COOL | Cool |
| AUTO | Auto | 
| HEAT | Ignored |
(Currently auto mode does changes to auto, but homekit interface doesnt respond to it, still need to fix the bug,use siri command to get back to cool mode again.same for heat mode)
---

#  Future path


- Implementation of proper Auto Mode.
- Sync with physical remote control (with IR receiver if installed).(Supported in V 2.0)
- Option to sync current temperature from different MQTT topic.(Supported in V 2.0)
- multiple device type support (AC /Heater/Thermostat)

---


#  Debug Logging

The plugin includes detailed logs in debug mode for:

- MQTT connection
- IR payload transmission
- HomeKit state changes
- Weather temperature updates
- MQTT publish topics
- Accessory initialization

Useful for troubleshooting and advanced automation setups.if you are facing any issue kindly full debug log.

---

# Special Thanks

- Homebridge Community (https://github.com/homebridge)
- Developers of Tasmota (https://github.com/arendst/tasmota)
- Developers of IRremote8266 Library (https://github.com/crankyoldgit/irremoteesp8266)

---

# Author

I am a Homebridge user for a long time . Not many people use tasmota based IR blaster which is fairly simple to build or addon to any sonoff / shelly or other esp based devices. This is originally made for my own personal use so any idea or feature request needed let me know , i will try to implement in future bersions
