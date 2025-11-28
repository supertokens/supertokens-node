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
import { APIFunction } from "../../types";
import { getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit } from "./utils";

type TenantWithLoginMethods = {
    tenantId: string;
    firstFactors: string[];
};

export type Response = {
    status: "OK";
    tenants: TenantWithLoginMethods[];
};

export default async function listAllTenantsWithLoginMethods({
    stInstance,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> {
    const mtRecipe = stInstance.getRecipeInstanceOrThrow("multitenancy");
    const tenantsRes = await mtRecipe.recipeInterfaceImpl.listAllTenants({
        userContext,
    });
    const finalTenants: TenantWithLoginMethods[] = [];

    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];

        const loginMethods = getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(stInstance, currentTenant);

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
