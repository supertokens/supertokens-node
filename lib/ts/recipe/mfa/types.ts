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
    defaultFirstFactors: string[];
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    defaultFirstFactors: string[];
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    getNextFactors: (input: {
        session: SessionContainer;
        completedFactors: string[];
        enabledByUser: string[];
        userContext: any;
    }) => Promise<string[]>;

    getFirstFactors: (input: { tenantId: string; userContext: any }) => Promise<string[]>;

    completeFactorInSession: (input: {
        session: SessionContainer;
        factorId: string;
        userContext: any;
    }) => Promise<void>;

    isFactorAlreadySetup: (input: {
        session: SessionContainer;
        factorId: string;
        userContext: any;
    }) => Promise<boolean>;

    getUserIdForFactor: (input: {
        session: SessionContainer;
        factorId: string;
        email?: string;
        phoneNumber?: string;
    }) => Promise<string | undefined>;

    setUserIdForFactor: (input: { session: SessionContainer; userId: string; factorId: string }) => Promise<void>;

    getPrimaryUserIdForFactor: (input: { userId: string; factorId: string }) => Promise<string | undefined>;

    enableFactorForUser: (input: {
        tenantId: string;
        userId: string;
        factorId: string;
        userContext: any;
    }) => Promise<{ status: "OK"; wasAlreadyEnabled: boolean }>;

    getAllFactorsEnabledForUser: (input: { tenantId: string; userId: string; userContext: any }) => Promise<string[]>;

    disableFactorForUser: (input: {
        tenantId: string;
        userId: string;
        factorId: string;
        userContext: any;
    }) => Promise<{ status: "OK"; didFactorExist: boolean }>;
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
    isFactorAlreadySetupForUserGET?: (input: {
        session: SessionContainer;
        factorId: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<{ status: "OK"; isSetup: boolean }>;

    listFactorsGET?: (input: {
        session: SessionContainer;
        options: APIOptions;
        userContext: any;
    }) => Promise<{ status: "OK"; factors: string[] }>;
};
