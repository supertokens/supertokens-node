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

import { ProviderInput, TypeProvider } from "../types";
import NewProvider from "./custom";
import SuperTokens from "../../../supertokens";
import NormalisedURLPath from "../../../normalisedURLPath";

export default function SAML(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "SAML";
    }

    input.config.userInfoMap = {
        ...input.config.userInfoMap,
        fromUserInfoAPI: {
            userId: "id",
            email: "email",
            ...input.config.userInfoMap?.fromUserInfoAPI,
        },
    };

    const supertokens = SuperTokens.getInstanceOrThrowError();
    const appinfo = supertokens.appInfo;

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            const config = await oGetConfig({ clientType, userContext });
            return config;
        };

        originalImplementation.getAuthorisationRedirectURL = async function (input) {
            const queryParams = {
                client_id: originalImplementation.config.clientId,
                redirect_uri: input.redirectURIOnProviderDashboard,
            };

            // TODO: check clientId and redirect uri

            return {
                urlWithQueryParams:
                    appinfo.apiDomain.getAsStringDangerous() +
                    appinfo.apiBasePath.appendPath(new NormalisedURLPath("/saml/login")).getAsStringDangerous() +
                    "?" +
                    new URLSearchParams(queryParams).toString(),
            };
        };

        const oExchangeAuthCodeForOAuthTokens = originalImplementation.exchangeAuthCodeForOAuthTokens;
        originalImplementation.exchangeAuthCodeForOAuthTokens = async function (input) {
            const result = await oExchangeAuthCodeForOAuthTokens(input);
            console.log("exchangeAuthCodeForOAuthTokens", input, result);
            return result;
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return NewProvider(input);
}
