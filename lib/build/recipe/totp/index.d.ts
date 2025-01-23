// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createDevice(
        userId: string,
        userIdentifierInfo?: string,
        deviceName?: string,
        skew?: number,
        period?: number,
        userContext?: Record<string, any>
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
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    static updateDevice(
        userId: string,
        existingDeviceName: string,
        newDeviceName: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK" | "UNKNOWN_DEVICE_ERROR" | "DEVICE_ALREADY_EXISTS_ERROR";
    }>;
    static listDevices(
        userId: string,
        userContext?: Record<string, any>
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
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        didDeviceExist: boolean;
    }>;
    static verifyDevice(
        tenantId: string,
        userId: string,
        deviceName: string,
        totp: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              wasAlreadyVerified: boolean;
          }
        | {
              status: "UNKNOWN_DEVICE_ERROR";
          }
        | {
              status: "INVALID_TOTP_ERROR";
              currentNumberOfFailedAttempts: number;
              maxNumberOfFailedAttempts: number;
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    >;
    static verifyTOTP(
        tenantId: string,
        userId: string,
        totp: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: "INVALID_TOTP_ERROR";
              currentNumberOfFailedAttempts: number;
              maxNumberOfFailedAttempts: number;
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    >;
}
export declare let init: typeof Recipe.init;
export declare let createDevice: typeof Wrapper.createDevice;
export declare let listDevices: typeof Wrapper.listDevices;
export declare let updateDevice: typeof Wrapper.updateDevice;
export declare let removeDevice: typeof Wrapper.removeDevice;
export declare let verifyDevice: typeof Wrapper.verifyDevice;
export declare let verifyTOTP: typeof Wrapper.verifyTOTP;
export type { RecipeInterface, APIOptions, APIInterface };
