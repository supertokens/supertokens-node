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
import { parseJWTWithoutSignatureVerification } from "../session/jwt";
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
        clientId?: string,
        userContext?: Record<string, any>
    ) {
        let normalisedClientId = clientId;
        const instance = Recipe.getInstanceOrThrowError();
        const recipeInterfaceImpl = instance.recipeInterfaceImpl;
        const normalisedUserContext = getUserContext(userContext);
        if (normalisedClientId === undefined) {
            if (instance.config.providerConfigs.length > 1) {
                throw new Error("clientId is required if there are more than one provider configs defined");
            }

            normalisedClientId = instance.config.providerConfigs[0].clientId!;
        }

        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            clientId: normalisedClientId,
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
        if (oAuthTokens.access_token === undefined) {
            throw new Error("access_token is required to get user info");
        }
        const preparseJWTInfo = parseJWTWithoutSignatureVerification(oAuthTokens.access_token!);
        const providerConfig = await recipeInterfaceImpl.getProviderConfig({
            clientId: preparseJWTInfo.payload.client_id,
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
