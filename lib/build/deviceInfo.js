"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
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
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw error_1.generateError(
                error_1.AuthError.GENERAL_ERROR,
                new Error("calling testing function in non testing env")
            );
        }
        DeviceInfo.instance = undefined;
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
