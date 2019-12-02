export declare class DeviceInfo {
    static instance: DeviceInfo | undefined;
    private frontendSDK;
    static reset(): void;
    static getInstance(): DeviceInfo;
    getFrontendSDKs: () => {
        name: string;
        version: string;
    }[];
    addToFrontendSDKs: (sdk: {
        name: string;
        version: string;
    }) => void;
}
