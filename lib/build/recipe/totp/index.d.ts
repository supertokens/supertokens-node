// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createDevice(
        userId: string,
        deviceName?: string,
        skew?: number,
        period?: number,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              deviceName: string;
              secret: string;
              qrCodeString: string;
          }
        | {
              status: "DEVICE_ALREADY_EXISTS_ERROR";
          }
    >;
    static updateDevice(
        userId: string,
        existingDeviceName: string,
        newDeviceName: string,
        userContext?: any
    ): Promise<{
        status: "OK" | "DEVICE_ALREADY_EXISTS_ERROR" | "UNKNOWN_DEVICE_ERROR";
    }>;
    static listDevices(
        userId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        devices: {
            name: string;
            period: number;
            skew: number;
            verified: boolean;
        }[];
    }>;
    static removeDevice(
        userId: string,
        deviceName: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        didDeviceExist: boolean;
    }>;
    static verifyDevice(
        tenantId: string,
        userId: string,
        deviceName: string,
        totp: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              wasAlreadyVerified: boolean;
          }
        | {
              status: "UNKNOWN_DEVICE_ERROR" | "INVALID_TOTP_ERROR" | "LIMIT_REACHED_ERROR";
          }
    >;
    static verifyTOTP(
        tenantId: string,
        userId: string,
        totp: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "INVALID_TOTP_ERROR";
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    >;
}
export declare let init: typeof Recipe.init;
export type { RecipeInterface, APIOptions, APIInterface };
