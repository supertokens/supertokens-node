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
import SuperTokensError from "../../../../error";
import { FactorIds } from "../../../multifactorauth";

export type Response =
    | {
          status: "OK";
          didConfigExist: boolean;
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };

export default async function deleteThirdPartyConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");

    if (typeof tenantId !== "string" || tenantId === "" || typeof thirdPartyId !== "string" || thirdPartyId === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'tenantId' or 'thirdPartyId'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    const tenantRes = await Multitenancy.getTenant(tenantId, userContext);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    const thirdPartyIdsFromCore = tenantRes.thirdParty.providers.map((provider) => provider.thirdPartyId);

    if (thirdPartyIdsFromCore.length === 0) {
        // this means that the tenant was using the static list of providers, we need to add them all before deleting one
        const mtRecipe = MultitenancyRecipe.getInstance();
        const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];
        let staticProviderIds = staticProviders.map((provider) => provider.config.thirdPartyId);

        for (const providerId of staticProviderIds) {
            await Multitenancy.createOrUpdateThirdPartyConfig(
                tenantId,
                {
                    thirdPartyId: providerId,
                },
                undefined,
                userContext
            );
        }
    } else if (thirdPartyIdsFromCore.length === 1 && thirdPartyIdsFromCore[0] === thirdPartyId) {
        if (tenantRes.firstFactors === undefined) {
            // add all static first factors except thirdparty
            await Multitenancy.createOrUpdateTenant(tenantId, {
                firstFactors: [
                    FactorIds.EMAILPASSWORD,
                    FactorIds.OTP_PHONE,
                    FactorIds.OTP_EMAIL,
                    FactorIds.LINK_PHONE,
                    FactorIds.LINK_EMAIL,
                ],
            });
        } else if (tenantRes.firstFactors.includes("thirdparty")) {
            // add all static first factors except thirdparty
            const newFirstFactors = tenantRes.firstFactors.filter((factor) => factor !== "thirdparty");
            await Multitenancy.createOrUpdateTenant(tenantId, {
                firstFactors: newFirstFactors,
            });
        }
    }

    return await Multitenancy.deleteThirdPartyConfig(tenantId, thirdPartyId, userContext);
}
