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
    let staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];

    let additionalConfig = null;

    // filter out providers that is not matching thirdPartyId
    providersFromCore = providersFromCore.filter((provider) => provider.thirdPartyId === thirdPartyId);

    // if none left, add one to this list so that it takes priority while merging
    if (providersFromCore.length === 0) {
        providersFromCore.push({
            thirdPartyId,
        });
    }

    // At this point, providersFromCore.length === 1

    if (providersFromCore[0].clients === undefined) {
        providersFromCore[0].clients = [
            {
                clientId: "nonguessable-temporary-client-id",
            },
        ];

        if (thirdPartyId === "apple") {
            providersFromCore[0].clients[0].additionalConfig = {
                teamId: "team-id",
                keyId: "key-id",

                // we need a proper private key otherwise creating of the provider instance fails in signing the key
                privateKey:
                    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
            };
            additionalConfig = {
                teamId: "",
                keyId: "",
                privateKey: "",
            };
        }
    }

    // query param may be passed if we are creating a new third party config, check and update accordingly

    if (["okta", "active-directory", "boxy-saml", "google-workspaces"].includes(thirdPartyId)) {
        if (thirdPartyId === "okta") {
            const oktaDomain = options.req.getKeyValueFromQuery("oktaDomain");
            if (oktaDomain !== undefined) {
                additionalConfig = { oktaDomain };
            }
        } else if (thirdPartyId === "active-directory") {
            const directoryId = options.req.getKeyValueFromQuery("directoryId");
            if (directoryId !== undefined) {
                additionalConfig = { directoryId };
            }
        } else if (thirdPartyId === "boxy-saml") {
            let boxyURL = options.req.getKeyValueFromQuery("boxyUrl");
            if (boxyURL !== undefined) {
                additionalConfig = { boxyURL };
            }
        } else if (thirdPartyId === "google-workspaces") {
            const hd = options.req.getKeyValueFromQuery("hd");
            if (hd !== undefined) {
                additionalConfig = { hd };
            }
        }

        if (additionalConfig !== null) {
            providersFromCore[0].oidcDiscoveryEndpoint = undefined;
            providersFromCore[0].authorizationEndpoint = undefined;
            providersFromCore[0].tokenEndpoint = undefined;
            providersFromCore[0].userInfoEndpoint = undefined;

            for (let j = 0; j < (providersFromCore[0].clients ?? []).length; j++) {
                providersFromCore[0].clients![j].additionalConfig = {
                    ...providersFromCore[0].clients![j].additionalConfig,
                    ...additionalConfig,
                };
            }
        }
    }

    // filter out other providers from static
    staticProviders = staticProviders.filter((provider) => provider.config.thirdPartyId === thirdPartyId);
    if (staticProviders.length === 1) {
        // modify additional config if query param is passed
        if (additionalConfig !== null) {
            // we set these to undefined so that these can be computed using the query param that was provided
            staticProviders[0].config.oidcDiscoveryEndpoint = undefined;
            staticProviders[0].config.authorizationEndpoint = undefined;
            staticProviders[0].config.tokenEndpoint = undefined;
            staticProviders[0].config.userInfoEndpoint = undefined;

            for (let j = 0; j < (staticProviders[0].config.clients ?? []).length; j++) {
                staticProviders[0].config.clients![j].additionalConfig = {
                    ...staticProviders[0].config.clients![j].additionalConfig,
                    ...additionalConfig,
                };
            }
        }
    }

    let mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders);

    if (mergedProvidersFromCoreAndStatic.length !== 1) {
        throw new Error("should never come here!");
    }

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

    const finalClients = clients.filter((client) => client.clientId !== "nonguessable-temporary-client-id");
    if (finalClients.length === 0) {
        finalClients.push({
            clientId: "",
            additionalConfig: additionalConfig === null ? undefined : additionalConfig,
        });
    }

    return {
        status: "OK",
        providerConfig: {
            ...commonProviderConfig,
            clients: finalClients,
            isGetAuthorisationRedirectUrlOverridden,
            isExchangeAuthCodeForOAuthTokensOverridden,
            isGetUserInfoOverridden,
        },
    };
}
