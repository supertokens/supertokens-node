"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DeviceInfo {
    constructor() {
        this.frontendSDK = [];
        this.getFrontendSDKs = () => {
            return this.frontendSDK;
        };
        this.addToFrontendSDKs = sdk => {
            let alreadyExists = false;
            this.frontendSDK.forEach(i => {
                if (i.name == sdk.name && i.version == sdk.version) {
                    alreadyExists = true;
                }
            });
            if (alreadyExists) {
                return;
            }
            this.frontendSDK.push(sdk);
        };
    }
    static getInstance() {
        if (DeviceInfo.instance == undefined) {
            DeviceInfo.instance = new DeviceInfo();
        }
        return DeviceInfo.instance;
    }
}
exports.DeviceInfo = DeviceInfo;
//# sourceMappingURL=deviceInfo.js.map
