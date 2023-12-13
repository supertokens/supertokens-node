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

import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIInterface, APIOptions, TypeProvider } from "./types";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { getUserContext } from "../../utils";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async getProvider(
        tenantId: string,
        thirdPartyId: string,
        clientType: string | undefined,
        userContext?: Record<string, any>
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getProvider({
            thirdPartyId,
            clientType,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async manuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext?: Record<string, any>
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.manuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            isVerified,
            userContext: getUserContext(userContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let getProvider = Wrapper.getProvider;

export let manuallyCreateOrUpdateUser = Wrapper.manuallyCreateOrUpdateUser;

export type { RecipeInterface, APIInterface, APIOptions, TypeProvider };
