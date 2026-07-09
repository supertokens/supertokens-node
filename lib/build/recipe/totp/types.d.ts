// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
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
export type GetUserIdentifierInfoForUserIdResponse =
    | {
          status: "OK";
          info: string;
      }
    | {
          status: "UNKNOWN_USER_ID_ERROR" | "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR";
      };
export type CreateDeviceResponse =
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
      };
export type UpdateDeviceResponse = {
    status: "OK" | "UNKNOWN_DEVICE_ERROR" | "DEVICE_ALREADY_EXISTS_ERROR";
};
export type ListDevicesResponse = {
    status: "OK";
    devices: {
        name: string;
        period: number;
        skew: number;
        verified: boolean;
    }[];
};
export type RemoveDeviceResponse = {
    status: "OK";
    didDeviceExist: boolean;
};
export type VerifyDeviceResponse =
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
      };
export type VerifyTOTPResponse =
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
      };
export type RecipeInterface = {
    getUserIdentifierInfoForUserId: (input: {
        userId: string;
        userContext: UserContext;
    }) => Promise<GetUserIdentifierInfoForUserIdResponse>;
    createDevice: (input: {
        userId: string;
        userIdentifierInfo?: string;
        deviceName?: string;
        skew?: number;
        period?: number;
        userContext: UserContext;
    }) => Promise<CreateDeviceResponse>;
    updateDevice: (input: {
        userId: string;
        existingDeviceName: string;
        newDeviceName: string;
        userContext: UserContext;
    }) => Promise<UpdateDeviceResponse>;
    listDevices: (input: { userId: string; userContext: UserContext }) => Promise<ListDevicesResponse>;
    removeDevice: (input: {
        userId: string;
        deviceName: string;
        userContext: UserContext;
    }) => Promise<RemoveDeviceResponse>;
    verifyDevice: (input: {
        tenantId: string;
        userId: string;
        deviceName: string;
        totp: string;
        userContext: UserContext;
    }) => Promise<VerifyDeviceResponse>;
    verifyTOTP: (input: {
        tenantId: string;
        userId: string;
        totp: string;
        userContext: UserContext;
    }) => Promise<VerifyTOTPResponse>;
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
