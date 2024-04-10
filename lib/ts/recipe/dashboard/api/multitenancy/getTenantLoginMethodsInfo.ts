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
import MultitenancyRecipe from "../../../multitenancy/recipe";
import { UserContext } from "../../../../types";
import { normaliseTenantLoginMethodsWithInitConfig } from "./utils";

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
