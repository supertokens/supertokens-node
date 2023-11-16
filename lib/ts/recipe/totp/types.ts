/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse } from "../../types";
import { SessionContainerInterface } from "../session/types";

export type GetUserIdentifierInfoForUserIdFunc = (
    userId: string,
    userContext: any
) => Promise<
    | {
          status: "OK";
          info: string;
      }
    | { status: "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR" }
>;

export type TypeInput = {
    issuer?: string;
    defaultSkew?: number;
    defaultPeriod?: number;

    getUserIdentifierInfoForUserId?: GetUserIdentifierInfoForUserIdFunc;

    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    issuer: string;
    defaultSkew: number;
    defaultPeriod: number;

    getUserIdentifierInfoForUserId?: GetUserIdentifierInfoForUserIdFunc;

    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    createDevice: (input: {
        userId: string;
        userIdentifierInfo?: string;
        deviceName?: string;
        skew?: number;
        period?: number;
        userContext: any;
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
    verifyTOTP: (input: {
        tenantId: string;
        userId: string;
        totp: string;
        userContext: any;
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
    createDevicePOST: (input: {
        deviceName?: string;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK" | "DEVICE_ALREADY_EXISTS_ERROR";
              deviceName: string;
              secret: string;
              qrCodeString: string;
          }
        | {
              status: "DEVICE_ALREADY_EXISTS_ERROR";
          }
        | GeneralErrorResponse
    >;

    listDevicesGET: (input: {
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
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
    >;

    removeDevicePOST: (input: {
        deviceName: string;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              didDeviceExist: boolean;
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
    >;

    verifyTOTPPOST: (input: {
        totp: string;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
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
    >;
};
