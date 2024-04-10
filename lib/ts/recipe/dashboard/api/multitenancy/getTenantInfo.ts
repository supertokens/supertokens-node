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
// import MultitenancyRecipe from "../../../multitenancy/recipe";
// import { ProviderConfig } from "../../../thirdparty/types";
import SuperTokens from "../../../../supertokens";
import { normaliseTenantLoginMethodsWithInitConfig } from "./utils";
// import { mergeProvidersFromCoreAndStatic } from "../../../thirdparty/providers/configUtils";

export type Response =
    | {
          status: "OK";
          tenant: {
              tenantId: string;
              thirdParty: {
                  providers: string[];
              };
              firstFactors: string[];
              requiredSecondaryFactors?: string[] | null;
              coreConfig: any[]; // TODO
              userCount: number;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };

export default async function getTenantInfo(
    _: APIInterface,
    tenantId: string,
    __: APIOptions,
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

    let { status, ...tenantConfig } = tenantRes;

    let firstFactors = normaliseTenantLoginMethodsWithInitConfig(tenantConfig);

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    const userCount = await SuperTokens.getInstanceOrThrowError().getUserCount(undefined, tenantId, userContext);

    // const providersFromCore = tenantRes?.thirdParty?.providers ?? [];
    // const mtRecipe = MultitenancyRecipe.getInstance();
    // const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];

    // const mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders).map(
    //     (provider) => provider.config
    // );

    const tenant: {
        tenantId: string;
        thirdParty: {
            providers: string[];
        };
        firstFactors: string[];
        requiredSecondaryFactors?: string[] | null;
        coreConfig: any[];
        userCount: number;
    } = {
        tenantId,
        thirdParty: {
            providers: [], // TODO
        },
        firstFactors: firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        coreConfig: [], // TODO
        userCount,
    };

    return {
        status: "OK",
        tenant,
    };
}
