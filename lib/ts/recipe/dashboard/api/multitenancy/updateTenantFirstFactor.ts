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
import { factorIdToRecipe, normaliseTenantLoginMethodsWithInitConfig } from "./utils";

export type Response =
    | { status: "OK" }
    | { status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR"; message: string }
    | { status: "UNKNOWN_TENANT_ERROR" };

export default async function updateTenantFirstFactor(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const { factorId, enable } = requestBody;

    const mtRecipe = MultitenancyRecipe.getInstance();

    if (enable === true) {
        if (!mtRecipe?.allAvailableFirstFactors.includes(factorId)) {
            return {
                status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR",
                message: `Please initialise ${factorIdToRecipe(factorId)} recipe to be able to use this login method`,
            };
        }
    }

    const tenantRes = await mtRecipe?.recipeInterfaceImpl.getTenant({ tenantId, userContext });

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    let firstFactors = normaliseTenantLoginMethodsWithInitConfig(tenantRes);

    if (enable === true) {
        if (!firstFactors.includes(factorId)) {
            firstFactors.push(factorId);
        }
    } else {
        firstFactors = firstFactors.filter((f) => f !== factorId);
    }

    await mtRecipe?.recipeInterfaceImpl.createOrUpdateTenant({
        tenantId,
        config: {
            firstFactors,
        },
        userContext,
    });

    return {
        status: "OK",
    };
}
