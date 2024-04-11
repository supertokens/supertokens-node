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
    userContext: any
): Promise<Response> {
    let tenantRes;

    try {
        tenantRes = await Multitenancy.getTenant(tenantId, userContext);
    } catch (_) {}

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");

    if (thirdPartyId === undefined) {
        throw new Error("Please provide thirdPartyId");
    }

    const providersFromCore = tenantRes?.thirdParty?.providers ?? [];
    const mtRecipe = MultitenancyRecipe.getInstance();
    const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];

    let mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders);

    const clients = [];
    let commonProviderConfig: ProviderConfig = {
        thirdPartyId,
    };
    let isGetAuthorisationRedirectUrlOverridden = false;
    let isExchangeAuthCodeForOAuthTokensOverridden = false;
    let isGetUserInfoOverridden = false;

    mergedProvidersFromCoreAndStatic = [
        ...mergedProvidersFromCoreAndStatic,
        {
            config: {
                thirdPartyId,
                clients: [
                    {
                        clientId: "client-id",
                        ...(thirdPartyId === "apple"
                            ? {
                                  additionalConfig: {
                                      teamId: "team-id",
                                      keyId: "key-id",
                                      privateKey:
                                          "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                                  },
                              }
                            : undefined),
                        ...(thirdPartyId === "google-workspaces"
                            ? {
                                  additionalConfig: {
                                      hd: options.req.getKeyValueFromQuery("hd"),
                                  },
                              }
                            : undefined),
                    },
                ],
                ...(thirdPartyId === "active-directory"
                    ? {
                          oidcDiscoveryEndpoint: `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                              "tenantId"
                          )}/v2.0/`,
                      }
                    : undefined),
                ...(thirdPartyId === "okta"
                    ? {
                          oidcDiscoveryEndpoint: options.req.getKeyValueFromQuery("oktaDomain"),
                      }
                    : undefined),
            },
        },
    ];

    for (const provider of mergedProvidersFromCoreAndStatic) {
        if (provider.config.thirdPartyId === thirdPartyId) {
            for (const client of provider.config.clients ?? []) {
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
                        beforeOverride.exchangeAuthCodeForOAuthTokens !== afterOverride.exchangeAuthCodeForOAuthTokens
                    ) {
                        isExchangeAuthCodeForOAuthTokensOverridden = true;
                    }
                    if (beforeOverride.getUserInfo !== afterOverride.getUserInfo) {
                        isGetUserInfoOverridden = true;
                    }
                }
            }
        }
    }

    return {
        status: "OK",
        providerConfig: {
            ...commonProviderConfig,
            clients,
            isGetAuthorisationRedirectUrlOverridden,
            isExchangeAuthCodeForOAuthTokensOverridden,
            isGetUserInfoOverridden,
        },
    };
}
