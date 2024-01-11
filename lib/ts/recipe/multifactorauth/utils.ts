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

import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, MFAClaimValue } from "./types";
import MultiFactorAuthRecipe from "./recipe";
import Multitenancy from "../multitenancy";
import { UserContext } from "../../types";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    if (config?.firstFactors !== undefined && config?.firstFactors.length === 0) {
        throw new Error("'firstFactors' can be either undefined or a non-empty array");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        firstFactors: config?.firstFactors,
        override,
    };
}

export function checkFactorRequirement(req: string, completedFactors: MFAClaimValue["c"]) {
    return {
        id: req,
        isValid: completedFactors !== undefined && completedFactors[req] !== undefined,
        message: "Not completed",
    };
}

export const isValidFirstFactor = async function (
    tenantId: string,
    factorId: string,
    userContext: UserContext
): Promise<boolean> {
    const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
    if (tenantInfo === undefined) {
        throw new Error("tenant not found");
    }
    const { status: _, ...tenantConfig } = tenantInfo;

    // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config

    // if validFirstFactors is undefined, we assume it's valid. We assume it's valid because we will still get errors
    // if the loginMethod is disabled in core, or not initialised in the recipeList

    // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
    // so we don't need to do additional checks here
    let validFirstFactors =
        tenantConfig.firstFactors !== undefined
            ? tenantConfig.firstFactors
            : MultiFactorAuthRecipe.getInstanceOrThrowError().config.firstFactors;

    if (validFirstFactors !== undefined && !validFirstFactors.includes(factorId)) {
        return false;
    }

    return true;
};
