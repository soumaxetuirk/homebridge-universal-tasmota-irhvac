import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';
import type { PlatformAccessory } from 'homebridge';
import mqtt, { MqttClient } from 'mqtt';

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
  };
};

export class UniversalTasmotaPlatform implements DynamicPlatformPlugin {

  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  private client?: MqttClient;
  private accessories: PlatformAccessory[] = [];
  private weatherTemp = 24;
  private lastWeatherFetch = 0;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
if (!this.config.devices || !Array.isArray(this.config.devices) || this.config.devices.length === 0) {

  this.log.warn('No devices configured. Plugin inactive.');
  return;
}
    this.initMQTT();

    this.api.on('didFinishLaunching', () => {
      this.log.info('IRHVAC platform ready');
      this.discoverDevices();
    });
  }

  // -------------------------
  // MQTT INIT
  // -------------------------
  private initMQTT() {

    const mqttConfig = this.config.mqtt || {};

    const broker = mqttConfig.url || 'mqtt://127.0.0.1:1883';
    const username = mqttConfig.username;
    const password = mqttConfig.password;

    const clientId = `homebridge_${Math.random().toString(16).slice(2, 10)}`;

    this.log.debug('MQTT connecting...');
    this.log.debug(`Broker: ${broker}`);

    this.client = mqtt.connect(broker, {
      clientId,
      keepalive: 10,
      reconnectPeriod: 1000,
      connectTimeout: 30000,
      clean: true,
      username,
      password,
      rejectUnauthorized: false,
    });

    this.client.on('connect', () => {
      this.log.info('MQTT connected');
    });
this.client.on('message', (topic, message) => {

  const msg = message.toString();
this.log.debug(`MQTT RX topic=${topic} payload=${msg}`);
  let json: any;

  try {
    json = JSON.parse(msg);
  } catch {
    json = undefined;
  }

  for (const accessory of this.accessories) {

    const device = this.config.devices.find(
      (d: any) => d.name === accessory.displayName
    );

    if (!device) {
      continue;
    }

    const service =
      accessory.getService(this.Service.HeaterCooler);

    if (!service) {
      continue;
    }
const state = (service as any).__state;

if (!state) {
  continue;
}
    // =====================================================
    // IR RECEIVE -> HOMEKIT STATE SYNC
    // =====================================================

    if (
      device.topicReceiveIR &&
      topic === device.topicReceiveIR
    ) {

      const hvac = json?.IrReceived?.IRHVAC;

      // STRICT VALIDATION
      if (!hvac) {
        continue;
      }

      if (
        hvac.Vendor !== device.vendor ||
        hvac.Model !== device.model
      ) {
        continue;
      }

      if (
        hvac.Power !== 'On' &&
        hvac.Power !== 'Off'
      ) {
        continue;
      }

      if (typeof hvac.Temp !== 'number') {
        continue;
      }

      this.log.debug(
        `${device.name} synced from physical remote`
      );
state.power = hvac.Power === 'On';

state.mode =
  hvac.Mode === 'Cool'
    ? this.Characteristic.TargetHeaterCoolerState.COOL
    : this.Characteristic.TargetHeaterCoolerState.AUTO;

let receivedTemp = hvac.Temp;

if (receivedTemp < 16) {
  receivedTemp = 16;
}

if (receivedTemp > 30) {
  receivedTemp = 30;
}

state.temp = receivedTemp;

if (hvac.FanSpeed === 'Low') {
  state.fan = 20;
} else if (hvac.FanSpeed === 'Medium') {
  state.fan = 50;
} else if (hvac.FanSpeed === 'High') {
  state.fan = 80;
} else {
  state.fan = 100;
}

state.swing =
  hvac.SwingV === 'On'
    ? this.Characteristic.SwingMode.SWING_ENABLED
    : this.Characteristic.SwingMode.SWING_DISABLED;
      // POWER
      service.updateCharacteristic(
        this.Characteristic.Active,
        hvac.Power === 'On'
          ? this.Characteristic.Active.ACTIVE
          : this.Characteristic.Active.INACTIVE
      );

      // MODE
      let hkMode =
        this.Characteristic.TargetHeaterCoolerState.AUTO;

      if (hvac.Mode === 'Cool') {

        hkMode =
          this.Characteristic.TargetHeaterCoolerState.COOL;
      }

      service.updateCharacteristic(
        this.Characteristic.TargetHeaterCoolerState,
        hkMode
      );

      // TEMP
      service.updateCharacteristic(
        this.Characteristic.CoolingThresholdTemperature,
receivedTemp
      );

      // FAN
      let fan = 100;

      if (hvac.FanSpeed === 'Low') {
        fan = 20;
      } else if (hvac.FanSpeed === 'Medium') {
        fan = 50;
      } else if (hvac.FanSpeed === 'High') {
        fan = 80;
      }

      service.updateCharacteristic(
        this.Characteristic.RotationSpeed,
        fan
      );

      // SWING
      service.updateCharacteristic(
        this.Characteristic.SwingMode,
        hvac.SwingV === 'On'
          ? this.Characteristic.SwingMode.SWING_ENABLED
          : this.Characteristic.SwingMode.SWING_DISABLED
      );

      continue;
    }

    // =====================================================
    // MQTT TEMPERATURE SENSOR
    // =====================================================

    if (!device.temperatureTopic) {
      continue;
    }

    if (topic !== device.temperatureTopic) {
      continue;
    }

    const temp = parseFloat(msg);

    if (isNaN(temp)) {

      this.log.warn(
        `Invalid temperature payload: ${msg}`
      );

      continue;
    }

    (service as any).__currentTemp = temp;

    service.updateCharacteristic(
      this.Characteristic.CurrentTemperature,
      temp
    );

    this.log.info(
      `${device.name} sensor temp updated: ${temp}°C`
    );
  }
});
    this.client.on('error', (err) => {
      this.log.error('MQTT error:', err.message);
    });

    this.client.on('close', () => {
      this.log.warn('MQTT disconnected');
    });
  }

  configureAccessory(accessory: PlatformAccessory) {

  this.log.info(`Loaded cached accessory: ${accessory.displayName}`);

  this.accessories.push(accessory);
}

  // -------------------------
  // WEATHER FETCH + PUSH
  // -------------------------
  private async updateWeatherAndPush(service: Service) {

    this.log.debug('WEATHER: updateWeatherAndPush() called');

    const now = Date.now();

    if (now - this.lastWeatherFetch < 5 * 60 * 1000) {
      this.log.debug('WEATHER: skipped (cached)');
      return;
    }

    const lat = this.config.latitude ?? 40.7128;
    const lon = this.config.longitude ?? -74.0060;

    this.log.debug(`WEATHER: lat=${lat} lon=${lon}`);

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}&current=temperature_2m`;

    this.log.debug(`WEATHER URL: ${url}`);

    try {

      this.log.debug('WEATHER: fetching...');

      const res = await fetch(url);

      this.log.debug(`WEATHER: response status=${res.status}`);

      const json = (await res.json()) as OpenMeteoResponse;

      this.log.debug(`WEATHER RAW: ${JSON.stringify(json)}`);

      const temp = json?.current?.temperature_2m;

      this.log.debug(`WEATHER TEMP PARSED: ${temp}`);

      if (typeof temp === 'number') {

        this.weatherTemp = temp;
        this.lastWeatherFetch = now;

        this.log.info(`Weather updated: ${this.weatherTemp}°C`);

        service.updateCharacteristic(
          this.Characteristic.CurrentTemperature,
          this.weatherTemp
        );

        this.log.debug('WEATHER: characteristic updated');
      }

    } catch (err) {

      this.log.error(`WEATHER ERROR: ${err}`);

      this.log.warn('Weather fetch failed, using cached value');
    }
  }

  // -------------------------
  // DEVICE DISCOVERY
  // -------------------------
  discoverDevices() {

    const devices = this.config.devices || [];

    const irTopic =
      this.config.mqtt?.topicPublish || 'cmnd/Dressing_table/IRHVAC';

    for (const device of devices) {

      const uuid = this.api.hap.uuid.generate(device.name);
     let accessory = this.accessories.find(
  acc => acc.UUID === uuid
);

if (accessory) {

  this.log.info(`Using cached accessory: ${device.name}`);

} else {

  this.log.info(`Creating new accessory: ${device.name}`);

  accessory = new this.api.platformAccessory(device.name, uuid);
 this.api.registerPlatformAccessories(
    'homebridge-universal-tasmota-irhvac',
    'UniversalTasmotaIRHVAC',
    [accessory],
  );
}

      (accessory.getService(this.Service.AccessoryInformation) ||
 accessory.addService(this.Service.AccessoryInformation))
        .setCharacteristic(this.Characteristic.Manufacturer, device.manufacturer || 'Tasmota')
        .setCharacteristic(this.Characteristic.Model, device.model ?? '1')
        .setCharacteristic(this.Characteristic.SerialNumber, device.serial || '000')
        .setCharacteristic(this.Characteristic.FirmwareRevision, device.version || '1.0');

      let service = accessory.getService(this.Service.HeaterCooler);

if (!service) {
  service = accessory.addService(this.Service.HeaterCooler);
}

      const state = {
        power: false,
        mode: this.Characteristic.TargetHeaterCoolerState.COOL,
        temp: 24,
        fan: 50,
        swing: this.Characteristic.SwingMode.SWING_DISABLED,
        econo: false,
        currentTemp: undefined as number | undefined,
      };
(service as any).__state = state;
      this.updateWeatherAndPush(service);

if (device.temperatureTopic && this.client) {

  this.log.info(
    `Subscribing temp topic for ${device.name}: ${device.temperatureTopic}`
  );

  this.client.subscribe(device.temperatureTopic);
}

if (device.topicReceiveIR && this.client) {

  this.log.info(
    `Subscribing IR topic for ${device.name}: ${device.topicReceiveIR}`
  );

  this.client.subscribe(device.topicReceiveIR);
}
      const getFan = () => {
        if (state.fan <= 20) return "Low";
        if (state.fan <= 60) return "Medium";
        if (state.fan <= 90) return "High";
        return "Auto";
      };

      const getMode = () => {
        if (state.mode === this.Characteristic.TargetHeaterCoolerState.COOL) return "Cool";
        if (state.mode === this.Characteristic.TargetHeaterCoolerState.AUTO) return "Auto";
        return "Auto";
      };

      // -------------------------
      // IR SEND
      // -------------------------
      let sendTimer: NodeJS.Timeout | undefined;

const sendIR = () => {

  if (sendTimer) {
    clearTimeout(sendTimer);
  }

  sendTimer = setTimeout(async () => {

        this.log.debug('SENDIR: called');

        if (!this.client) {
          this.log.error('SENDIR: mqtt client missing');
          return;
        }

        this.log.debug(`SENDIR: mqtt connected=${this.client.connected}`);

        if (!this.client.connected) {
          this.log.error('MQTT not connected - skipping IR send');
          return;
        }

        this.log.debug('SENDIR: before weather update');

        await this.updateWeatherAndPush(service);

        this.log.debug('SENDIR: after weather update');

        const payload = {
          Vendor: device.vendor || "LG",
          Model: device.model || "1",

          Power: state.power ? "On" : "Off",
          Mode: getMode(),

          Temp: state.temp,
          FanSpeed: getFan(),

          SwingV: state.swing === this.Characteristic.SwingMode.SWING_ENABLED ? "On" : "Off",
          Econo: state.econo ? "On" : "Off"
        };

        this.log.debug('================ IR SEND =================');
        this.log.debug(`Device: ${device.name}`);
        this.log.debug(`Topic : ${irTopic}`);
        this.log.debug(`Payload: ${JSON.stringify(payload)}`);
        this.log.debug('==========================================');

        this.client.publish(irTopic, JSON.stringify(payload), {}, (err) => {

          if (err) {
            this.log.error(`MQTT publish error: ${err.message}`);
          } else {
            this.log.info('MQTT publish success');
          }
        });

        this.log.debug('SENDIR: publish() finished');
        }, 300);
};

      // ACTIVE
      service.getCharacteristic(this.Characteristic.Active)
        .onGet(() => state.power
          ? this.Characteristic.Active.ACTIVE
          : this.Characteristic.Active.INACTIVE)
        .onSet((value) => {

          this.log.debug(`HK Active SET: ${value}`);

          state.power = value === this.Characteristic.Active.ACTIVE;

          if (state.power) {
            state.mode = this.Characteristic.TargetHeaterCoolerState.COOL;
          }

          sendIR();
        });

      // MODE
      service.getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
        .onGet(() => state.mode)
        .onSet((value) => {

          this.log.debug(`HK Mode SET: ${value}`);

          state.mode = value as number;
          sendIR();
        });

      // CURRENT TEMP
      service.getCharacteristic(this.Characteristic.CurrentTemperature)
  .onGet(() => {

    const mqttTemp = (service as any).__currentTemp;

    if (typeof mqttTemp === 'number') {
      return mqttTemp;
    }

    return this.weatherTemp;
  });

// TARGET TEMP
service.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
  .setProps({ minValue: 16, maxValue: 30, minStep: 1 })

  .onGet(() => {

    if (state.temp < 16) return 16;
    if (state.temp > 30) return 30;

    return state.temp;
  })

  .onSet((value) => {

    this.log.debug(`HK Temp SET: ${value}`);

    let temp = value as number;

    if (temp < 16) temp = 16;
    if (temp > 30) temp = 30;

    state.temp = temp;

    sendIR();
  });

      // FAN
      service.getCharacteristic(this.Characteristic.RotationSpeed)
        .onGet(() => state.fan)
        .onSet((value) => {

          this.log.debug(`HK Fan SET: ${value}`);

          state.fan = value as number;
          sendIR();
        });

      // SWING
      service.getCharacteristic(this.Characteristic.SwingMode)
        .onGet(() => state.swing)
        .onSet((value) => {

          this.log.debug(`HK Swing SET: ${value}`);

          state.swing = value as number;
          sendIR();
        });

      // ECONO
      service.getCharacteristic(this.Characteristic.LockPhysicalControls)
        .onGet(() => state.econo
          ? this.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
          : this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED)
        .onSet((value) => {

          this.log.debug(`HK Econo SET: ${value}`);

          state.econo =
            value === this.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED;

          sendIR();
        });

      this.log.debug(`Device added: ${device.name}`);
    }
  }
}
