// @ts-nocheck
import TotpRecipe from "./recipe";
import SuperTokensError from "./error";
export default class Wrapper {
    static init: typeof TotpRecipe.init;
    static Error: typeof SuperTokensError;
    static createDevice(input: {
        userId: string;
        deviceName: string;
        skew?: number;
        period?: number;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              issuerName: string;
              secret: string;
              userIdentifier?: string | undefined;
              qrCodeString: string;
          }
        | {
              status: "DEVICE_ALREADY_EXISTS_ERROR";
          }
    >;
    static verifyDevice(input: {
        userId: string;
        deviceName: string;
        totp: string;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              wasAlreadyVerified: boolean;
          }
        | {
              status: "INVALID_TOTP_ERROR" | "UNKNOWN_DEVICE_ERROR";
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    >;
    static verifyCode(input: {
        tenantId: string;
        userId: string;
        totp: string;
        userContext?: any;
    }): Promise<
        | {
              status: "OK" | "INVALID_TOTP_ERROR";
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    >;
    static updateDevice(input: {
        userId: string;
        existingDeviceName: string;
        newDeviceName: string;
        userContext?: any;
    }): Promise<{
        status: "OK" | "DEVICE_ALREADY_EXISTS_ERROR" | "UNKNOWN_DEVICE_ERROR";
    }>;
    static removeDevice(input: {
        userId: string;
        deviceName: string;
        userContext?: any;
    }): Promise<{
        status: "OK";
        didDeviceExist: boolean;
    }>;
    static listDevices(input: {
        userId: string;
        userContext?: any;
    }): Promise<{
        status: "OK";
        devices: {
            name: string;
            period: number;
            skew: number;
            verified: boolean;
        }[];
    }>;
}
export declare let init: typeof TotpRecipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createDevice: typeof Wrapper.createDevice;
export declare let verifyDevice: typeof Wrapper.verifyDevice;
export declare let verifyCode: typeof Wrapper.verifyCode;
export declare let updateDevice: typeof Wrapper.updateDevice;
export declare let removeDevice: typeof Wrapper.removeDevice;
export declare let listDevices: typeof Wrapper.listDevices;
