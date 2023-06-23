/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo } from "../../types";
import type { SessionContainer } from "../session";

export type TypeInput = {
    issuer?: string;
    defaultSkew?: number;
    defaultPeriod?: number;
    getUserIdentifierInfoForUserId?: GetUserIdentifierInfoForUserIdFunc;
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
    getUserIdentifierInfoForUserId?: GetUserIdentifierInfoForUserIdFunc;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    createDevice: (input: {
        userId: string;
        deviceName: string;
        skew?: number;
        period?: number;
        userIdentifierInfo?: string;
        userContext: any;
    }) => Promise<
        | { status: "OK"; issuerName: string; secret: string; userIdentifier?: string; qrCodeString: string }
        | { status: "DEVICE_ALREADY_EXISTS_ERROR" }
    >;
    verifyCode: (input: {
        userId: string;
        totp: string;
        userContext: any;
    }) => Promise<{ status: "OK" | "INVALID_TOTP_ERROR" } | { status: "LIMIT_REACHED_ERROR"; retryAfterMs: number }>;
    verifyDevice: (input: {
        userId: string;
        deviceName: string;
        totp: string;
        userContext: any;
    }) => Promise<
        | { status: "OK"; wasAlreadyVerified: boolean }
        | { status: "INVALID_TOTP_ERROR" | "UNKNOWN_DEVICE_ERROR" }
        | { status: "LIMIT_REACHED_ERROR"; retryAfterMs: number }
    >;
    updateDevice: (input: {
        userId: string;
        existingDeviceName: string;
        newDeviceName: string;
        userContext: any;
    }) => Promise<{ status: "OK" | "DEVICE_ALREADY_EXISTS_ERROR" | "UNKNOWN_DEVICE_ERROR" }>;
    removeDevice: (input: {
        userId: string;
        deviceName: string;
        userContext: any;
    }) => Promise<{ status: "OK"; didDeviceExist: boolean }>;
    listDevices: (input: {
        userId: string;
        userContext: any;
    }) => Promise<{ status: "OK"; devices: { name: string; period: number; skew: number; verified: boolean }[] }>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    createDevicePOST?: (input: {
        session: SessionContainer;
        deviceName?: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              issuerName: string;
              deviceName: string;
              secret: string;
              userIdentifier?: string;
              qrCodeString: string;
          }
        | { status: "DEVICE_ALREADY_EXISTS_ERROR" }
    >;
    verifyCodePOST?: (input: {
        session: SessionContainer;
        totp: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<{ status: "OK" | "INVALID_TOTP_ERROR" } | { status: "LIMIT_REACHED_ERROR"; retryAfterMs: number }>;
    verifyDevicePOST?: (input: {
        session: SessionContainer;
        deviceName: string;
        totp: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<
        | { status: "OK"; wasAlreadyVerified: boolean }
        | { status: "INVALID_TOTP_ERROR" | "UNKNOWN_DEVICE_ERROR" }
        | { status: "LIMIT_REACHED_ERROR"; retryAfterMs: number }
    >;
    removeDevicePOST?: (input: {
        session: SessionContainer;
        deviceName: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<{ status: "OK"; didDeviceExist: boolean }>;
    listDevicesGET?: (input: {
        session: SessionContainer;
        options: APIOptions;
        userContext: any;
    }) => Promise<{ status: "OK"; devices: { name: string; period: number; skew: number; verified: boolean }[] }>;
};

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
