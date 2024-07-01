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

import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { TypeFramework } from "./framework/types";
import { RecipeLevelUser } from "./recipe/accountlinking/types";
import { BaseRequest } from "./framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainer } from "./recipe/session";
declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };

type Branded<T, B> = T & Brand<B>;

// Record<string,any> is still quite generic and we would like to ensure type safety for the userContext
// so we use the concept of branded type, which enables catching of issues at compile time.
// Detailed explanation about branded types is available here - https://egghead.io/blog/using-branded-types-in-typescript
export type UserContext = Branded<Record<string, any>, "UserContext">;

export type AppInfo = {
    appName: string;
    websiteDomain?: string;
    origin?: string | ((input: { request: BaseRequest | undefined; userContext: UserContext }) => string);
    websiteBasePath?: string;
    apiDomain: string;
    apiBasePath?: string;
    apiGatewayPath?: string;
};

export type NormalisedAppinfo = {
    appName: string;
    getOrigin: (input: { request: BaseRequest | undefined; userContext: UserContext }) => NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    topLevelAPIDomain: string;
    getTopLevelWebsiteDomain: (input: { request: BaseRequest | undefined; userContext: UserContext }) => string;
    apiBasePath: NormalisedURLPath;
    apiGatewayPath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
};

export type SuperTokensInfo = {
    connectionURI: string;
    apiKey?: string;
    networkInterceptor?: NetworkInterceptor;
    disableCoreCallCache?: boolean;
};

export type TypeInput = {
    supertokens?: SuperTokensInfo;
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
    debug?: boolean;
    security?: {
        anomalyServiceAPIKey?: string; // this will be provided by us on our supertokens.com dashboard
        rateLimitServiceApiKey?: string; // this will be provided by us on our supertokens.com dashboard (cache wrapper)
        googleRecaptcha?: {
            // if the user provides both, we will use v2
            v2SecretKey?: string;
            v1SecretKey?: string;
        };
        override?: (
            originalImplementation: SecurityFunctions,
            builder?: OverrideableBuilder<SecurityFunctions>
        ) => SecurityFunctions;
    };
};

export type InfoFromRequest = {
    ipAddress?: string;
    userAgent?: string;
};

export type AnomalyServiceActionTypes =
    | "sign-in"
    | "sign-up"
    | "session-refresh"
    | "password-reset"
    | "send-email"
    | "send-sms"
    | "mfa-verify"
    | "mfa-setup";

export type RiskScores = {
    // all values are between 0 and 1, with 1 being highest risk
    ipRisk: number;
    phoneNumberRisk?: number;
    emailRisk?: number;
    sessionRisk?: number;
    userIdRisk?: number;
};

export type SecurityFunctions = {
    getInfoFromRequest: (input: { request: BaseRequest; userContext: UserContext }) => InfoFromRequest;

    performGoogleRecaptchaV2: (input: {
        infoFromRequest: InfoFromRequest;
        clientResponseToken: string;
        userContext: UserContext;
    }) => Promise<boolean>;

    performGoogleRecaptchaV1: (input: {
        infoFromRequest: InfoFromRequest;
        clientResponseToken: string;
        userContext: UserContext;
    }) => Promise<boolean>;

    calculateRiskScoreUsingAnomalyService: (input: {
        infoFromRequest: InfoFromRequest;
        email?: string;
        phoneNumber?: string;
        sessionHandle?: string;
        tenantId: string;
        userId?: string;
        actionType: AnomalyServiceActionTypes;
        userContext: UserContext;
    }) => Promise<RiskScores>;

    logToAnomalyService: (input: {
        infoFromRequest: InfoFromRequest;
        email?: string;
        phoneNumber?: string;
        sessionHandle?: string;
        tenantId: string;
        userId?: string;
        action: AnomalyServiceActionTypes;
        success: boolean; // this input is what differentiates this function from the one that generates the risk score.
        userContext: UserContext;
    }) => void; // we intentionally do not return a promise cause this should be non blocking

    // these are all here and not in the respective recipes cause they are to be applied
    // only in the APIs and not in the recipe function. We still can't put them in the API
    // cause for third party, we do not have the thirdPartyInfo in the api args in the input.

    // Note that for passwordless, we will call this during createCode.
    getRateLimitForEmailPasswordSignIn: (input: {
        tenantId: string;
        session?: SessionContainer;
        email: string;
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[] // is an array so that we can have multiple checks and fail the api if any one of them fail
        | undefined; // undefined means no rate limit
    getRateLimitForEmailPasswordSignUp: (input: {
        tenantId: string;
        session?: SessionContainer;
        email: string;
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[]
        | undefined;
    getRateLimitForThirdPartySignInUp: (input: {
        tenantId: string;
        session?: SessionContainer;
        thirdPartyId: string; // we intentionally do not give thirdPartyUserId because if we did, we'd have to query the thirdParty provider first
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[]
        | undefined;
    getRateLimitForSendingPasswordlessEmail: (input: {
        tenantId: string;
        session?: SessionContainer;
        email: string;
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[]
        | undefined;
    getRateLimitForSendingPasswordlessSms: (input: {
        tenantId: string;
        session?: SessionContainer;
        phoneNumber: string;
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[]
        | undefined;
    getRateLimitForResetPassword: (input: {
        tenantId: string;
        email: string;
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[]
        | undefined;
    getRateLimitForVerifyEmail: (input: {
        tenantId: string;
        session: SessionContainer;
        // we intentionally do not pass in the email here cause to fetch that, we'd need to query the core first
        infoFromRequest: InfoFromRequest;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              millisecondsIntervalBetweenAttempts: number;
          }[]
        | undefined;

    // these are functions to actually query the rate limit service
    setRateLimitForKey: (input: {
        keys: {
            key: string;
            millisecondsIntervalBetweenAttempts: number;
        }[];
        userContext: UserContext;
    }) => void; // should be non blocking, so we do not return a Promise
    areAnyKeysRateLimited: (input: {
        keys: {
            key: string;
            millisecondsIntervalBetweenAttempts: number;
        }[];
        userContext: UserContext;
    }) => Promise<boolean>;
};

export type NetworkInterceptor = (request: HttpRequest, userContext: UserContext) => HttpRequest;

export interface HttpRequest {
    url: string;
    method: HTTPMethod;
    headers: { [key: string]: string | number | string[] };
    params?: Record<string, boolean | number | string | undefined>;
    body?: any;
}

export type RecipeListFunction = (appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) => RecipeModule;

export type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};

export type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";

export type JSONPrimitive = string | number | boolean | null;
export type JSONArray = Array<JSONValue>;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray | undefined;
export interface JSONObject {
    [ind: string]: JSONValue;
}
export type GeneralErrorResponse = {
    status: "GENERAL_ERROR";
    message: string;
};

export type User = {
    id: string; // primaryUserId or recipeUserId
    timeJoined: number; // minimum timeJoined value from linkedRecipes
    isPrimaryUser: boolean;
    tenantIds: string[];
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
        hasSameEmailAs: (email: string | undefined) => boolean;
        hasSamePhoneNumberAs: (phoneNumber: string | undefined) => boolean;
        hasSameThirdPartyInfoAs: (thirdParty?: { id: string; userId: string }) => boolean;
        toJson: () => any;
    })[];

    // this function will be used in the send200Response function in utils to
    // convert this object to JSON before sending it to the client. So that in RecipeLevelUser
    // the recipeUserId can be converted to string from the RecipeUserId object type.
    toJson: () => any;
};
