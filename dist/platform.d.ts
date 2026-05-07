import { API, DynamicPlatformPlugin, Logger, PlatformConfig, Service, Characteristic } from 'homebridge';
import type { PlatformAccessory } from 'homebridge';
export declare class UniversalTasmotaPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    private client?;
    private weatherTemp;
    private lastWeatherFetch;
    constructor(log: Logger, config: PlatformConfig, api: API);
    private initMQTT;
    configureAccessory(accessory: PlatformAccessory): void;
    private updateWeatherAndPush;
    discoverDevices(): void;
}
