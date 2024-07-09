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
import MultifactorAuthRecipe from "../../../multifactorauth/recipe";
import { factorIdToRecipe, getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigAndSDKInit } from "./utils";
import { UserContext } from "../../../../types";

export type Response =
    | { status: "OK"; isMFARequirementsForAuthOverridden: boolean }
    | { status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR"; message: string }
    | { status: "MFA_NOT_INITIALIZED_ERROR" }
    | { status: "UNKNOWN_TENANT_ERROR" };

export default async function updateTenantSecondaryFactor(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const { factorId, enable } = requestBody;

    const mtRecipe = MultitenancyRecipe.getInstance();
    const mfaInstance = MultifactorAuthRecipe.getInstance();

    if (mfaInstance === undefined) {
        return {
            status: "MFA_NOT_INITIALIZED_ERROR",
        };
    }

    const tenantRes = await mtRecipe?.recipeInterfaceImpl.getTenant({ tenantId, userContext });

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    if (enable === true) {
        const allAvailableSecondaryFactors = mfaInstance.getAllAvailableSecondaryFactorIds(tenantRes);

        if (!allAvailableSecondaryFactors.includes(factorId)) {
            return {
                status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR",
                message: `Please initialise ${factorIdToRecipe(factorId)} recipe to be able to use this login method`,
            };
        }
    }

    let secondaryFactors = getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigAndSDKInit(tenantRes);

    if (enable === true) {
        if (!secondaryFactors.includes(factorId)) {
            secondaryFactors.push(factorId);
        }
    } else {
        secondaryFactors = secondaryFactors.filter((f) => f !== factorId);
    }

    await mtRecipe?.recipeInterfaceImpl.createOrUpdateTenant({
        tenantId,
        config: {
            requiredSecondaryFactors: secondaryFactors.length > 0 ? secondaryFactors : null,
        },
        userContext,
    });

    return {
        status: "OK",
        isMFARequirementsForAuthOverridden: mfaInstance.isGetMfaRequirementsForAuthOverridden,
    };
}
