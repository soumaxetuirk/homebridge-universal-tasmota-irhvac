import mqtt from 'mqtt';
export class UniversalTasmotaPlatform {
    log;
    config;
    api;
    Service;
    Characteristic;
    client;
    weatherTemp = 24;
    lastWeatherFetch = 0;
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.initMQTT();
        this.api.on('didFinishLaunching', () => {
            this.log.info('IRHVAC platform ready');
            this.discoverDevices();
        });
    }
    // -------------------------
    // MQTT INIT
    // -------------------------
    initMQTT() {
        const mqttConfig = this.config.mqtt || {};
        const broker = mqttConfig.url || 'mqtt://127.0.0.1:1883';
        const username = mqttConfig.username;
        const password = mqttConfig.password;
        const clientId = `homebridge_${Math.random().toString(16).slice(2, 10)}`;
        this.log.info('MQTT connecting...');
        this.log.info(`Broker: ${broker}`);
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
        this.client.on('error', (err) => {
            this.log.error('MQTT error:', err.message);
        });
        this.client.on('close', () => {
            this.log.warn('MQTT disconnected');
        });
    }
    configureAccessory(accessory) { }
    // -------------------------
    // WEATHER FETCH + PUSH
    // -------------------------
    async updateWeatherAndPush(service) {
        const now = Date.now();
        // throttle 5 min
        if (now - this.lastWeatherFetch < 5 * 60 * 1000)
            return;
        const lat = this.config.latitude ?? 40.7128;
        const lon = this.config.longitude ?? -74.0060;
        const url = `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}&longitude=${lon}&current=temperature_2m`;
        try {
            const res = await fetch(url);
            const json = (await res.json());
            const temp = json?.current?.temperature_2m;
            if (typeof temp === 'number') {
                this.weatherTemp = temp;
                this.lastWeatherFetch = now;
                this.log.debug(`Weather updated: ${this.weatherTemp}°C`);
                service.updateCharacteristic(this.Characteristic.CurrentTemperature, this.weatherTemp);
            }
        }
        catch (err) {
            this.log.warn('Weather fetch failed, using cached value');
        }
    }
    // -------------------------
    // DEVICE DISCOVERY
    // -------------------------
    discoverDevices() {
        const devices = this.config.devices || [];
        const irTopic = this.config.mqtt?.topicPublish || 'cmnd/Dressing_table/IRHVAC';
        for (const device of devices) {
            const uuid = this.api.hap.uuid.generate(device.name);
            const accessory = new this.api.platformAccessory(device.name, uuid);
            accessory.getService(this.Service.AccessoryInformation)
                .setCharacteristic(this.Characteristic.Manufacturer, device.manufacturer || 'Tasmota')
                .setCharacteristic(this.Characteristic.Model, device.model ?? '1')
                .setCharacteristic(this.Characteristic.SerialNumber, device.serial || '000')
                .setCharacteristic(this.Characteristic.FirmwareRevision, device.version || '1.0');
            const service = accessory.addService(this.Service.HeaterCooler);
            const state = {
                power: false,
                mode: this.Characteristic.TargetHeaterCoolerState.COOL,
                temp: 24,
                fan: 50,
                swing: this.Characteristic.SwingMode.SWING_DISABLED,
                econo: false,
            };
            // -------------------------
            // INITIAL WEATHER LOAD
            // -------------------------
            this.updateWeatherAndPush(service);
            // -------------------------
            // HELPERS
            // -------------------------
            const getFan = () => {
                if (state.fan <= 20)
                    return "Low";
                if (state.fan <= 60)
                    return "Medium";
                if (state.fan <= 90)
                    return "High";
                return "Auto";
            };
            const getMode = () => {
                if (state.mode === this.Characteristic.TargetHeaterCoolerState.COOL)
                    return "Cool";
                if (state.mode === this.Characteristic.TargetHeaterCoolerState.AUTO)
                    return "Auto";
                return "Auto";
            };
            // -------------------------
            // IR SEND
            // -------------------------
            const sendIR = async () => {
                if (!this.client || !this.client.connected) {
                    this.log.error('MQTT not connected - skipping IR send');
                    return;
                }
                // refresh weather before sending (light update, cached inside)
                await this.updateWeatherAndPush(service);
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
                this.log.debug(JSON.stringify(payload));
                this.log.debug('==========================================');
                this.client.publish(irTopic, JSON.stringify(payload));
            };
            // -------------------------
            // ACTIVE
            // -------------------------
            service.getCharacteristic(this.Characteristic.Active)
                .onGet(() => state.power
                ? this.Characteristic.Active.ACTIVE
                : this.Characteristic.Active.INACTIVE)
                .onSet((value) => {
                state.power = value === this.Characteristic.Active.ACTIVE;
                if (state.power) {
                    state.temp = 24;
                    state.mode = this.Characteristic.TargetHeaterCoolerState.COOL;
                }
                sendIR();
            });
            // -------------------------
            // MODE
            // -------------------------
            service.getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
                .onGet(() => state.mode)
                .onSet((value) => {
                state.mode = value;
                sendIR();
            });
            // -------------------------
            // CURRENT TEMP (WEATHER)
            // -------------------------
            service.getCharacteristic(this.Characteristic.CurrentTemperature)
                .onGet(() => this.weatherTemp);
            // -------------------------
            // TARGET TEMP
            // -------------------------
            service.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
                .setProps({ minValue: 16, maxValue: 30, minStep: 1 })
                .onGet(() => state.temp)
                .onSet((value) => {
                state.temp = value;
                sendIR();
            });
            // -------------------------
            // FAN
            // -------------------------
            service.getCharacteristic(this.Characteristic.RotationSpeed)
                .onGet(() => state.fan)
                .onSet((value) => {
                state.fan = value;
                sendIR();
            });
            // -------------------------
            // SWING
            // -------------------------
            service.getCharacteristic(this.Characteristic.SwingMode)
                .onGet(() => state.swing)
                .onSet((value) => {
                state.swing = value;
                sendIR();
            });
            // -------------------------
            // ECONO MODE
            // -------------------------
            service.getCharacteristic(this.Characteristic.LockPhysicalControls)
                .onGet(() => state.econo
                ? this.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
                : this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED)
                .onSet((value) => {
                state.econo =
                    value === this.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED;
                sendIR();
            });
            this.api.registerPlatformAccessories('homebridge-universal-tasmota-irhvac', 'UniversalTasmotaIRHVAC', [accessory]);
            this.log.debug(`Device added: ${device.name}`);
        }
    }
}
//# sourceMappingURL=platform.js.map