// @ts-nocheck
export declare let loggerCodes: {
    API_RESPONSE: number;
    API_CALLED: number;
};
export declare let infoLoggerWithCode: {
    [x: number]: (apiName: string) => void;
};
export declare let debugLoggerWithCode: {
    [x: number]: (apiName: string, status: string) => void;
};
