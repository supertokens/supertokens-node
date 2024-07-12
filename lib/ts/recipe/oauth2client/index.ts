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

import { UserContext } from "../../types";
import Recipe from "./recipe";
import { RecipeInterface, APIInterface, APIOptions, OAuthTokens } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async getAuthorisationRedirectURL(redirectURIOnProviderDashboard: string, userContext: UserContext) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAuthorisationRedirectURL(
            redirectURIOnProviderDashboard,
            userContext
        );
    }

    static async exchangeAuthCodeForOAuthTokens(
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string | undefined;
        },
        userContext: UserContext
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.exchangeAuthCodeForOAuthTokens(
            redirectURIInfo,
            userContext
        );
    }

    static async getUserInfo(oAuthTokens: OAuthTokens, userContext: UserContext) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserInfo(oAuthTokens, userContext);
    }
}

export let init = Wrapper.init;

export let getAuthorisationRedirectURL = Wrapper.getAuthorisationRedirectURL;

export let exchangeAuthCodeForOAuthTokens = Wrapper.exchangeAuthCodeForOAuthTokens;

export let getUserInfo = Wrapper.getUserInfo;

export type { RecipeInterface, APIInterface, APIOptions };
