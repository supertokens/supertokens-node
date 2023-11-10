// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse } from "../../types";
import { SessionContainerInterface } from "../session/types";
export declare type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    createDevice: (input: {
        userId: string;
        deviceName?: string;
        skew?: number;
        period?: number;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              deviceName: string;
              secret: string;
          }
        | {
              status: "DEVICE_ALREADY_EXISTS_ERROR";
          }
    >;
    updateDevice: (input: {
        userId: string;
        existingDeviceName: string;
        newDeviceName: string;
        userContext: any;
    }) => Promise<{
        status: "OK" | "UNKNOWN_DEVICE_ERROR" | "DEVICE_ALREADY_EXISTS_ERROR";
    }>;
    listDevices: (input: {
        userId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        devices: {
            name: string;
            period: number;
            skew: number;
            verified: boolean;
        }[];
    }>;
    removeDevice: (input: {
        userId: string;
        deviceName: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        didDeviceExist: boolean;
    }>;
    verifyDevice: (input: {
        tenantId: string;
        userId: string;
        deviceName: string;
        totp: string;
        userContext: string;
    }) => Promise<
        | {
              status: "OK";
              wasAlreadyVerified: boolean;
          }
        | {
              status: "UNKNOWN_DEVICE_ERROR" | "INVALID_TOTP_ERROR" | "LIMIT_REACHED_ERROR";
          }
    >;
    verifyTOTP: (input: {
        tenantId: string;
        userId: string;
        totp: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK" | "INVALID_TOTP_ERROR" | "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    >;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
    createDevicePOST: (input: {
        deviceName?: string;
        period?: number;
        skew?: number;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK" | "DEVICE_ALREADY_EXISTS_ERROR";
              deviceName: string;
              secret: string;
          }
        | {
              status: "DEVICE_ALREADY_EXISTS_ERROR";
          }
        | GeneralErrorResponse
    >;
    verifyDevicePOST: (input: {
        deviceName: string;
        totp: string;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              wasAlreadyVerified: boolean;
          }
        | {
              status: "UNKNOWN_DEVICE_ERROR" | "INVALID_TOTP_ERROR" | "LIMIT_REACHED_ERROR";
          }
        | GeneralErrorResponse
    >;
    verifyTOTPPOST: (input: {
        totp: string;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK" | "INVALID_TOTP_ERROR" | "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
        | GeneralErrorResponse
    >;
};
