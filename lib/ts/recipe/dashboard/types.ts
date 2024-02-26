/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import type { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo, User } from "../../types";

export type TypeInput = {
    apiKey?: string;
    admins?: string[];
    overrideCSPHeaders?: boolean;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    apiKey?: string;
    admins?: string[];
    overrideCSPHeaders?: boolean;
    authMode: AuthMode;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    getDashboardBundleLocation(input: { userContext: any }): Promise<string>;
    shouldAllowAccess(input: { req: BaseRequest; config: TypeNormalisedInput; userContext: any }): Promise<boolean>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
    isInServerlessEnv: boolean;
    appInfo: NormalisedAppinfo;
};

export type APIInterface = {
    dashboardGET: undefined | ((input: { options: APIOptions; userContext: any }) => Promise<string>);
};

export type APIFunction = (
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
) => Promise<any>;

export type RecipeIdForUser = "emailpassword" | "thirdparty" | "passwordless";

export type AuthMode = "api-key" | "email-password";

export type UserWithFirstAndLastName = User & {
    firstName?: string;
    lastName?: string;
};
