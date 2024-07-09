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
import { APIInterface, APIOptions } from "../../types";
import Multitenancy from "../../../multitenancy";
import MultitenancyRecipe from "../../../multitenancy/recipe";
import {
    findAndCreateProviderInstance,
    mergeProvidersFromCoreAndStatic,
} from "../../../thirdparty/providers/configUtils";
import { ProviderConfig } from "../../../thirdparty/types";
import { UserContext } from "../../../../types";

export type Response =
    | {
          status: "OK";
          providerConfig: ProviderConfig & {
              isGetAuthorisationRedirectUrlOverridden: boolean;
              isExchangeAuthCodeForOAuthTokensOverridden: boolean;
              isGetUserInfoOverridden: boolean;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };

export default async function getThirdPartyConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> {
    let tenantRes = await Multitenancy.getTenant(tenantId, userContext);

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");

    if (thirdPartyId === undefined) {
        throw new Error("Please provide thirdPartyId");
    }

    let providersFromCore = tenantRes?.thirdParty?.providers;
    const mtRecipe = MultitenancyRecipe.getInstance();
    const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];

    if (providersFromCore === undefined) {
        providersFromCore = [];
    }

    let found = false;
    for (let i = 0; i < providersFromCore.length; i++) {
        if (providersFromCore[i].thirdPartyId === thirdPartyId) {
            found = true;
            if (thirdPartyId === "okta") {
                providersFromCore[i].oidcDiscoveryEndpoint = options.req.getKeyValueFromQuery("oktaDomain");
                providersFromCore[i].authorizationEndpoint = undefined;
                providersFromCore[i].tokenEndpoint = undefined;
                providersFromCore[i].userInfoEndpoint = undefined;
            } else if (thirdPartyId === "active-directory") {
                providersFromCore[
                    i
                ].oidcDiscoveryEndpoint = `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                    "directoryId"
                )}/v2.0/`;
                providersFromCore[i].authorizationEndpoint = undefined;
                providersFromCore[i].tokenEndpoint = undefined;
                providersFromCore[i].userInfoEndpoint = undefined;
            } else if (thirdPartyId === "boxy-saml") {
                providersFromCore[i].oidcDiscoveryEndpoint = undefined;
                providersFromCore[i].authorizationEndpoint = `${options.req.getKeyValueFromQuery(
                    "boxyUrl"
                )}/api/oauth/authorize`;
                providersFromCore[i].tokenEndpoint = `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/token`;
                providersFromCore[i].userInfoEndpoint = `${options.req.getKeyValueFromQuery(
                    "boxyUrl"
                )}/api/oauth/userinfo`;
            } else if (thirdPartyId === "google-workspaces") {
                if (providersFromCore[i].clients !== undefined) {
                    for (let j = 0; j < providersFromCore[i].clients!.length; j++) {
                        providersFromCore[i].clients![j].additionalConfig = {
                            hd: options.req.getKeyValueFromQuery("hd"),
                        };
                    }
                }
            }
        }
    }

    if (!found) {
        if (thirdPartyId === "okta") {
            providersFromCore.push({
                thirdPartyId,
                oidcDiscoveryEndpoint: options.req.getKeyValueFromQuery("oktaDomain"),
            });
        } else if (thirdPartyId === "active-directory") {
            providersFromCore.push({
                thirdPartyId,
                oidcDiscoveryEndpoint: `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                    "directoryId"
                )}/v2.0/`,
            });
        } else if (thirdPartyId === "boxy-saml") {
            providersFromCore.push({
                thirdPartyId,
                authorizationEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/authorize`,
                tokenEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/token`,
                userInfoEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/userinfo`,
            });
        } else if (thirdPartyId === "apple") {
            providersFromCore.push({
                thirdPartyId,
                clients: [
                    {
                        clientId: "nonguessable-temporary-client-id",
                        additionalConfig: {
                            teamId: "team-id",
                            keyId: "key-id",
                            privateKey:
                                "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                        },
                    },
                ],
            });
        } else if (thirdPartyId === "google-workspaces") {
            providersFromCore.push({
                thirdPartyId,
                clients: [
                    {
                        clientId: "nonguessable-temporary-client-id",
                        additionalConfig: {
                            hd: options.req.getKeyValueFromQuery("hd"),
                        },
                    },
                ],
            });
        } else {
            providersFromCore.push({
                thirdPartyId,
            });
        }
    }

    let mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders);

    for (const mergedProvider of mergedProvidersFromCoreAndStatic) {
        if (mergedProvider.config.thirdPartyId === thirdPartyId) {
            if (mergedProvider.config.clients === undefined || mergedProvider.config.clients.length === 0) {
                mergedProvider.config.clients = [
                    {
                        clientId: "nonguessable-temporary-client-id",
                    },
                ];
            }
        }
    }

    const clients = [];
    let commonProviderConfig: ProviderConfig = {
        thirdPartyId,
    };
    let isGetAuthorisationRedirectUrlOverridden = false;
    let isExchangeAuthCodeForOAuthTokensOverridden = false;
    let isGetUserInfoOverridden = false;

    for (const provider of mergedProvidersFromCoreAndStatic) {
        if (provider.config.thirdPartyId === thirdPartyId) {
            let foundCorrectConfig = false;

            for (const client of provider.config.clients ?? []) {
                try {
                    const providerInstance = await findAndCreateProviderInstance(
                        mergedProvidersFromCoreAndStatic,
                        thirdPartyId,
                        client.clientType,
                        userContext
                    );
                    const {
                        clientId,
                        clientSecret,
                        clientType,
                        scope,
                        additionalConfig,
                        ...commonConfig
                    } = providerInstance!.config;

                    clients.push({
                        clientId,
                        clientSecret,
                        scope,
                        clientType,
                        additionalConfig,
                    });
                    commonProviderConfig = commonConfig;

                    if (provider.override !== undefined) {
                        const beforeOverride = { ...providerInstance! };
                        const afterOverride = provider.override(beforeOverride);

                        if (beforeOverride.getAuthorisationRedirectURL !== afterOverride.getAuthorisationRedirectURL) {
                            isGetAuthorisationRedirectUrlOverridden = true;
                        }
                        if (
                            beforeOverride.exchangeAuthCodeForOAuthTokens !==
                            afterOverride.exchangeAuthCodeForOAuthTokens
                        ) {
                            isExchangeAuthCodeForOAuthTokensOverridden = true;
                        }
                        if (beforeOverride.getUserInfo !== afterOverride.getUserInfo) {
                            isGetUserInfoOverridden = true;
                        }
                    }

                    foundCorrectConfig = true;
                } catch (err) {
                    // ignore the error
                    clients.push(client);
                }
            }

            if (!foundCorrectConfig) {
                commonProviderConfig = provider.config;
            }

            break;
        }
    }

    return {
        status: "OK",
        providerConfig: {
            ...commonProviderConfig,
            clients: clients.filter((client) => client.clientId !== "nonguessable-temporary-client-id"),
            isGetAuthorisationRedirectUrlOverridden,
            isExchangeAuthCodeForOAuthTokensOverridden,
            isGetUserInfoOverridden,
        },
    };
}
