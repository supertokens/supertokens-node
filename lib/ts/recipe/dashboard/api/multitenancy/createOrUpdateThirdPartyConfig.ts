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
import { UserContext } from "../../../../types";

export type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | { status: "UNKNOWN_TENANT_ERROR" };

export default async function createOrUpdateThirdPartyConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const { providerConfig } = requestBody;

    let tenantRes = await Multitenancy.getTenant(tenantId, userContext);

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    if (tenantRes.thirdParty.providers.length === 0) {
        // This means that the tenant was using the static list of providers, we need to add them all before adding the new one
        const mtRecipe = MultitenancyRecipe.getInstance();
        const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];
        for (const provider of staticProviders) {
            await Multitenancy.createOrUpdateThirdPartyConfig(
                tenantId,
                {
                    thirdPartyId: provider.config.thirdPartyId,
                },
                undefined,
                userContext
            );
            // delay after each provider to avoid rate limiting
            await new Promise((r) => setTimeout(r, 500)); // 500ms
        }
    }

    const thirdPartyRes = await Multitenancy.createOrUpdateThirdPartyConfig(
        tenantId,
        providerConfig,
        undefined,
        userContext
    );

    return thirdPartyRes;
}
