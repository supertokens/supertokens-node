/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

import { getUserContext } from "../../utils";
import Recipe from "./recipe";
import { RecipeInterface, APIInterface, APIOptions, OAuthTokens } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async exchangeAuthCodeForOAuthTokens(
        redirectURIInfo: {
            redirectURI: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string | undefined;
        },
        userContext?: Record<string, any>
    ) {
        const recipeInterfaceImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;
        const normalisedUserContext = getUserContext(userContext);
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            userContext: normalisedUserContext,
        });
        return await recipeInterfaceImpl.exchangeAuthCodeForOAuthTokens({
            providerConfig,
            redirectURIInfo,
            userContext: normalisedUserContext,
        });
    }

    static async getUserInfo(oAuthTokens: OAuthTokens, userContext?: Record<string, any>) {
        const recipeInterfaceImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;
        const normalisedUserContext = getUserContext(userContext);
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            userContext: normalisedUserContext,
        });
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserInfo({
            providerConfig,
            oAuthTokens,
            userContext: normalisedUserContext,
        });
    }
}

export let init = Wrapper.init;

export let exchangeAuthCodeForOAuthTokens = Wrapper.exchangeAuthCodeForOAuthTokens;

export let getUserInfo = Wrapper.getUserInfo;

export type { RecipeInterface, APIInterface, APIOptions };