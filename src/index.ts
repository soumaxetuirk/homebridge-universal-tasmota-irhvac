import { API } from 'homebridge';
import { UniversalTasmotaPlatform } from './platform.js';

export default (api: API) => {
  api.registerPlatform('UniversalTasmotaIRHVAC', UniversalTasmotaPlatform);
};
