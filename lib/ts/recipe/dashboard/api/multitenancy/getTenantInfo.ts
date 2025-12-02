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
import { APIFunction, CoreConfigFieldInfo } from "../../types";
import { getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit } from "./utils";
import {
    findAndCreateProviderInstance,
    mergeProvidersFromCoreAndStatic,
} from "../../../thirdparty/providers/configUtils";
import { Querier } from "../../../../querier";
import { DEFAULT_TENANT_ID } from "../../../multitenancy/constants";

export type Response =
    | {
          status: "OK";
          tenant: {
              tenantId: string;
              thirdParty: {
                  providers: { thirdPartyId: string; name: string }[];
              };
              firstFactors: string[];
              requiredSecondaryFactors?: string[] | null;
              coreConfig: CoreConfigFieldInfo[];
              userCount: number;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };

export default async function getTenantInfo({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> {
    const mtRecipe = stInstance.getRecipeInstanceOrThrow("multitenancy");
    let tenantRes = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    let { status, ...tenantConfig } = tenantRes;

    let firstFactors = getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(stInstance, tenantConfig);

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    const userCount = await stInstance.getUserCount(undefined, tenantId, userContext);

    const providersFromCore = tenantRes?.thirdParty?.providers;
    const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];

    const mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(
        providersFromCore,
        staticProviders,
        tenantId === DEFAULT_TENANT_ID
    );

    let querier = Querier.getNewInstanceOrThrowError(stInstance, options.recipeId);
    let coreConfig = await querier.sendGetRequest(
        {
            path: "/<tenantId>/recipe/dashboard/tenant/core-config",
            params: {
                tenantId,
            },
        },
        {},
        userContext
    );

    const tenant: {
        tenantId: string;
        thirdParty: {
            providers: { thirdPartyId: string; name: string }[];
        };
        firstFactors: string[];
        requiredSecondaryFactors?: string[] | null;
        coreConfig: any[];
        userCount: number;
    } = {
        tenantId,
        thirdParty: {
            providers: await Promise.all(
                mergedProvidersFromCoreAndStatic.map(async (provider) => {
                    try {
                        const providerInstance = await findAndCreateProviderInstance(
                            tenantId,
                            mergedProvidersFromCoreAndStatic,
                            provider.config.thirdPartyId,
                            provider.config.clients![0].clientType,
                            userContext
                        );

                        return { thirdPartyId: provider.config.thirdPartyId, name: providerInstance?.config.name! };
                    } catch (_) {
                        return {
                            thirdPartyId: provider.config.thirdPartyId,
                            name: provider.config.thirdPartyId,
                        };
                    }
                })
            ),
        },
        firstFactors: firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        coreConfig: coreConfig.config,
        userCount,
    };

    return {
        status: "OK",
        tenant,
    };
}
