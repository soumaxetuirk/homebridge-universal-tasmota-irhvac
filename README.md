# 🌡️ Homebridge Universal Tasmota IR HVAC

A  plugin for controlling IR-based air conditioners using **Tasmota IRHVAC** based on IRremoteESP8266 Library and **MQTT**.

Designed for setups using a shared IR blaster, this plugin exposes your AC units as native HomeKit HeaterCooler accessories while sending full IR HVAC payloads through MQTT.

It also supports optional weather-based temperature display using Open-Meteo so HomeKit can show realistic ambient temperature even when no physical room sensor is available.

---

# ✨ Features

- ❄️ Native HomeKit HeaterCooler support
- 🌡️ Weather-based current temperature display
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

# ⚙️ Homebridge Configuration

Add the following to your Homebridge `config.json`:

```json
{
  "platform": "UniversalTasmotaIRHVAC",

  "mqtt": {
    "url": "mqtt://127.0.0.1:1883",
    "username": "mqtt_user",
    "password": "mqtt_password",
    "topicPublish": "cmnd/Dressing_table/IRHVAC"
  },

  "latitude": 40.7128,
  "longitude": -74.0060,

  "devices": [
    {
      "name": "Living Room AC",
      "vendor": "LG",
      "model": "AKB75215403",
      "manufacturer": "LG",
      "serial": "AC001",
      "version": "1.0"
    }
  ]
}
```

---

# 🧾 Configuration Reference

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
  "topicPublish": "cmnd/Dressing_table/IRHVAC"
}
```

---

# 🌡️ Weather Settings

The plugin can display outdoor temperature in HomeKit using the Open-Meteo weather API.

This is useful for IR-only AC setups where no room temperature sensor is available.

| Field | Type | Description |
|------|------|-------------|
| `latitude` | number | Latitude used for weather lookup |
| `longitude` | number | Longitude used for weather lookup |

### Example

```json
"latitude": 40.7128,
"longitude": -74.0060
```

### Notes

- Used only for HomeKit Current Temperature
- Does not affect AC target temperature
- No constant polling loops are used
- Temperature is cached and refreshed intelligently

---

# 🏠 Device Settings

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

# 🏡 HomeKit Features

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

---

# 🧠 HomeKit State Logic

The plugin intelligently maps HomeKit actions into Tasmota IRHVAC payloads.

## Target State Mapping

| HomeKit State | IRHVAC Mode |
|--------------|-------------|
| COOL | Cool |
| AUTO | Auto | 
| HEAT | Ignored |
(Currently auto mode does changes to auto, but homekit interface doesnt respond to it, still need to fix the bug,use siri command to get back to cool mode again.same for heat mode)
---

# 🌡️ Current Temperature Handling

HomeKit requires a current temperature value for HeaterCooler accessories.

Since many IR AC setups do not include room sensors, this plugin optionally fetches local weather temperature using Open-Meteo.

This provides a more realistic HomeKit experience while keeping the setup lightweight and sensor-free.

---

#  Future path


- Implementation of proper Auto Mode
- Sync with physical remote control (with IR receiver if installed)
- Option to sync current temperature from different MQTT topic
- multiple device type support (AC /Heater/Thermostat)

---


# 🛠️ Debug Logging

The plugin includes detailed logs for:

- MQTT connection
- IR payload transmission
- HomeKit state changes
- Weather temperature updates
- MQTT publish topics
- Accessory initialization

Useful for troubleshooting and advanced automation setups.

---

# 📜 License

MIT License

---

# 👨‍💻 Author

Built for Homebridge + Tasmota IR + MQTT integrations.
