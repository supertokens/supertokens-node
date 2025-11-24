// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
export type TypeInput = {
    issuer?: string;
    defaultSkew?: number;
    defaultPeriod?: number;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    issuer: string;
    defaultSkew: number;
    defaultPeriod: number;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type RecipeInterface = {
    getUserIdentifierInfoForUserId: (input: { userId: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
              info: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR" | "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR";
          }
    >;
    createDevice: (input: {
        userId: string;
        userIdentifierInfo?: string;
        deviceName?: string;
        skew?: number;
        period?: number;
        userContext: UserContext;
    }) => Promise<
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
    updateDevice: (input: {
        userId: string;
        existingDeviceName: string;
        newDeviceName: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK" | "UNKNOWN_DEVICE_ERROR" | "DEVICE_ALREADY_EXISTS_ERROR";
    }>;
    listDevices: (input: { userId: string; userContext: UserContext }) => Promise<{
        status: "OK";
        devices: {
            name: string;
            period: number;
            skew: number;
            verified: boolean;
        }[];
    }>;
    removeDevice: (input: { userId: string; deviceName: string; userContext: UserContext }) => Promise<{
        status: "OK";
        didDeviceExist: boolean;
    }>;
    verifyDevice: (input: {
        tenantId: string;
        userId: string;
        deviceName: string;
        totp: string;
        userContext: UserContext;
    }) => Promise<
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
    verifyTOTP: (input: { tenantId: string; userId: string; totp: string; userContext: UserContext }) => Promise<
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
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export type APIInterface = {
    createDevicePOST:
        | undefined
        | ((input: {
              deviceName?: string;
              options: APIOptions;
              session: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    deviceName: string;
                    secret: string;
                    qrCodeString: string;
                }
              | {
                    status: "DEVICE_ALREADY_EXISTS_ERROR";
                }
              | GeneralErrorResponse
          >);
    listDevicesGET:
        | undefined
        | ((input: { options: APIOptions; session: SessionContainerInterface; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                    devices: {
                        name: string;
                        period: number;
                        skew: number;
                        verified: boolean;
                    }[];
                }
              | GeneralErrorResponse
          >);
    removeDevicePOST:
        | undefined
        | ((input: {
              deviceName: string;
              options: APIOptions;
              session: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    didDeviceExist: boolean;
                }
              | GeneralErrorResponse
          >);
    verifyDevicePOST:
        | undefined
        | ((input: {
              deviceName: string;
              totp: string;
              options: APIOptions;
              session: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
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
              | GeneralErrorResponse
          >);
    verifyTOTPPOST:
        | undefined
        | ((input: {
              totp: string;
              options: APIOptions;
              session: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
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
              | GeneralErrorResponse
          >);
};
