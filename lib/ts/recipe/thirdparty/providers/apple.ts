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
import NewProvider, { getActualClientIdFromDevelopmentClientId } from "./custom";
import * as jose from "jose";

async function getClientSecret(clientId: string, keyId: string, teamId: string, privateKey: string): Promise<string> {
    const alg = "ES256";
    const key = await jose.importPKCS8(privateKey.replace(/\\n/g, "\n"), alg);

    return new jose.SignJWT({})
        .setProtectedHeader({ alg, kid: keyId, typ: "JWT" })
        .setIssuer(teamId)
        .setIssuedAt()
        .setExpirationTime("180days")
        .setAudience("https://appleid.apple.com")
        .setSubject(getActualClientIdFromDevelopmentClientId(clientId))
        .sign(key);
}

export default function Apple(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Apple";
    }

    if (input.config.oidcDiscoveryEndpoint === undefined) {
        input.config.oidcDiscoveryEndpoint = "https://appleid.apple.com/";
    }

    input.config.authorizationEndpointQueryParams = {
        response_mode: "form_post",
        ...input.config.authorizationEndpointQueryParams,
    };

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            const config = await oGetConfig({ clientType, userContext });

            if (config.scope === undefined) {
                config.scope = ["openid", "email"];
            }

            if (config.clientSecret === undefined) {
                if (
                    config.additionalConfig === undefined ||
                    config.additionalConfig.keyId === undefined ||
                    config.additionalConfig.teamId === undefined ||
                    config.additionalConfig.privateKey === undefined
                ) {
                    throw new Error(
                        "Please ensure that keyId, teamId and privateKey are provided in the additionalConfig"
                    );
                }

                config.clientSecret = await getClientSecret(
                    config.clientId,
                    config.additionalConfig.keyId,
                    config.additionalConfig.teamId,
                    config.additionalConfig.privateKey
                );
            }

            return config;
        };

        const oExchangeAuthCodeForOAuthTokens = originalImplementation.exchangeAuthCodeForOAuthTokens;
        originalImplementation.exchangeAuthCodeForOAuthTokens = async function (input) {
            const response = await oExchangeAuthCodeForOAuthTokens(input);

            const user = input.redirectURIInfo.redirectURIQueryParams.user;
            if (user !== undefined) {
                if (typeof user === "string") {
                    response.user = JSON.parse(user);
                } else if (typeof user === "object") {
                    response.user = user;
                }
            }

            return response;
        };

        const oGetUserInfo = originalImplementation.getUserInfo;
        originalImplementation.getUserInfo = async function (input) {
            const response = await oGetUserInfo(input);
            const user = input.oAuthTokens.user;

            if (user !== undefined) {
                if (typeof user === "string") {
                    response.rawUserInfoFromProvider = {
                        ...response.rawUserInfoFromProvider,
                        fromIdTokenPayload: {
                            ...response.rawUserInfoFromProvider?.fromIdTokenPayload,
                            user: JSON.parse(user),
                        },
                    };
                } else if (typeof user === "object") {
                    response.rawUserInfoFromProvider = {
                        ...response.rawUserInfoFromProvider,
                        fromIdTokenPayload: {
                            ...response.rawUserInfoFromProvider?.fromIdTokenPayload,
                            user,
                        },
                    };
                }
            }

            return response;
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return NewProvider(input);
}
