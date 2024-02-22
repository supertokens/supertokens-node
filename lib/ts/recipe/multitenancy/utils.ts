/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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

import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import MultitenancyRecipe from "./recipe";
import { logDebugMessage } from "../../logger";
import { UserContext } from "../../types";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        getAllowedDomainsForTenantId: config?.getAllowedDomainsForTenantId,
        override,
    };
}

export const isValidFirstFactor = async function (
    tenantId: string,
    factorId: string,
    userContext: UserContext
): Promise<
    | {
          status: "OK";
      }
    | {
          status: "INVALID_FIRST_FACTOR_ERROR";
      }
    | {
          status: "TENANT_NOT_FOUND_ERROR";
      }
> {
    const mtRecipe = MultitenancyRecipe.getInstance();
    if (mtRecipe === undefined) {
        throw new Error("Should never happen");
    }

    const tenantInfo = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
    if (tenantInfo === undefined) {
        return {
            status: "TENANT_NOT_FOUND_ERROR",
        };
    }
    const { status: _, ...tenantConfig } = tenantInfo;

    const MultiFactorAuthRecipe = require("../multifactorauth/recipe").default;
    const { FactorIds } = require("../multifactorauth");

    const firstFactorsFromMFA = MultiFactorAuthRecipe.getInstance()?.config.firstFactors;

    logDebugMessage(`isValidFirstFactor got ${tenantConfig.firstFactors?.join(", ")} from tenant config`);
    logDebugMessage(`isValidFirstFactor got ${firstFactorsFromMFA} from tenant config`);

    // first factors configured in core is prioritised over the ones configured statically
    let configuredFirstFactors: string[] | undefined =
        tenantConfig.firstFactors !== undefined ? tenantConfig.firstFactors : firstFactorsFromMFA;

    if (configuredFirstFactors === undefined) {
        // check if the factorId is available from the initialised recipes
        if (mtRecipe.allAvailableFirstFactors.includes(factorId)) {
            return {
                status: "OK",
            };
        }
    } else {
        // Filter factors by available factors (from supertokens.init), but also allow custom factors
        configuredFirstFactors = configuredFirstFactors.filter(
            (factorId: string) =>
                mtRecipe.allAvailableFirstFactors.includes(factorId) || !Object.values(FactorIds).includes(factorId)
        );

        // Filter based on enabled recipes in the core
        if (tenantConfig.emailPassword.enabled === false) {
            configuredFirstFactors = configuredFirstFactors.filter(
                (factorId: string) => factorId !== FactorIds.EMAILPASSWORD
            );
        }

        if (tenantConfig.passwordless.enabled === false) {
            configuredFirstFactors = configuredFirstFactors.filter(
                (factorId: string) =>
                    ![FactorIds.LINK_EMAIL, FactorIds.LINK_PHONE, FactorIds.OTP_EMAIL, FactorIds.OTP_PHONE].includes(
                        factorId
                    )
            );
        }
        if (tenantConfig.thirdParty.enabled === false) {
            configuredFirstFactors = configuredFirstFactors.filter(
                (factorId: string) => factorId !== FactorIds.THIRDPARTY
            );
        }

        if (configuredFirstFactors.includes(factorId)) {
            return {
                status: "OK",
            };
        }
    }

    return {
        status: "INVALID_FIRST_FACTOR_ERROR",
    };
};
