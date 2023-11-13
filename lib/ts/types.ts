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

export type AppInfo = {
    appName: string;
    websiteDomain?: string;
    origin?: string | ((input: { request: BaseRequest | undefined; userContext: any }) => string);
    websiteBasePath?: string;
    apiDomain: string;
    apiBasePath?: string;
    apiGatewayPath?: string;
};

export type NormalisedAppinfo = {
    appName: string;
    getOrigin: (input: { request: BaseRequest | undefined; userContext: any }) => NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    topLevelAPIDomain: string;
    getTopLevelWebsiteDomain: (input: { request: BaseRequest | undefined; userContext: any }) => string;
    apiBasePath: NormalisedURLPath;
    apiGatewayPath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
};

export type SuperTokensInfo = {
    connectionURI: string;
    apiKey?: string;
    networkInterceptor?: NetworkInterceptor;
};

export type TypeInput = {
    supertokens?: SuperTokensInfo;
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
    debug?: boolean;
};

export type NetworkInterceptor = (request: HttpRequest, userContext: any) => HttpRequest;

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
