import { AuthError, generateError } from "./error";

export class DeviceInfo {
    static instance: DeviceInfo | undefined;
    private frontendSDK: {
        name: string;
        version: string;
    }[] = [];

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw generateError(AuthError.GENERAL_ERROR, new Error("calling testing function in non testing env"));
        }
        DeviceInfo.instance = undefined;
    }

    static getInstance(): DeviceInfo {
        if (DeviceInfo.instance == undefined) {
            DeviceInfo.instance = new DeviceInfo();
        }
        return DeviceInfo.instance;
    }

    getFrontendSDKs = () => {
        return this.frontendSDK;
    };

    addToFrontendSDKs = (sdk: { name: string; version: string }) => {
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
