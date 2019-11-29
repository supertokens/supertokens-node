export class DeviceInfo {
    static instance: DeviceInfo | undefined;
    private frontendSDK: {
        name: string;
        version: string;
    }[] = [];

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
