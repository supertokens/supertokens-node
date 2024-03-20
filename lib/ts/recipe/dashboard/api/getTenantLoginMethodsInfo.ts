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
import { APIInterface, APIOptions } from "../types";
import MultitenancyRecipe from "../../multitenancy/recipe";
import { isFactorConfiguredForTenant } from "../../multitenancy/utils";
import { UserContext } from "../../../types";
import { TenantConfig } from "../../multitenancy/types";

type TenantLoginMethodType = {
    tenantId: string;
    firstFactors: string[];
};

export type Response = {
    status: "OK";
    tenants: TenantLoginMethodType[];
};

export default async function getTenantLoginMethodsInfo(
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: UserContext
): Promise<Response> {
    const tenantsRes = await MultitenancyRecipe.getInstanceOrThrowError().recipeInterfaceImpl.listAllTenants({
        userContext,
    });
    const finalTenants: TenantLoginMethodType[] = [];

    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];

        const loginMethods = normaliseTenantLoginMethodsWithInitConfig(currentTenant);

        finalTenants.push({
            tenantId: currentTenant.tenantId,
            firstFactors: loginMethods,
        });
    }

    return {
        status: "OK",
        tenants: finalTenants,
    };
}

function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore: TenantConfig): string[] {
    let firstFactors: string[];

    let mtInstance = MultitenancyRecipe.getInstanceOrThrowError();
    if (tenantDetailsFromCore.firstFactors !== undefined) {
        firstFactors = tenantDetailsFromCore.firstFactors; // highest priority, config from core
    } else if (mtInstance.staticFirstFactors !== undefined) {
        firstFactors = mtInstance.staticFirstFactors; // next priority, static config
    } else {
        // Fallback to all available factors (de-duplicated)
        firstFactors = Array.from(new Set(mtInstance.allAvailableFirstFactors));
    }

    // we now filter out all available first factors by checking if they are valid because
    // we want to return the ones that can work. this would be based on what recipes are enabled
    // on the core and also firstFactors configured in the core and supertokens.init
    // Also, this way, in the front end, the developer can just check for firstFactors for
    // enabled recipes in all cases irrespective of whether they are using MFA or not
    let validFirstFactors: string[] = [];
    for (const factorId of firstFactors) {
        if (
            isFactorConfiguredForTenant({
                tenantConfig: tenantDetailsFromCore,
                allAvailableFirstFactors: mtInstance.allAvailableFirstFactors,
                firstFactors: firstFactors,
                factorId,
            })
        ) {
            validFirstFactors.push(factorId);
        }
    }

    return validFirstFactors;
}
