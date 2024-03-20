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

import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, TenantConfig } from "./types";
import MultitenancyRecipe from "./recipe";
import { logDebugMessage } from "../../logger";
import { UserContext } from "../../types";
import { FactorIds } from "../multifactorauth/types";

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
    userContext: UserContext,
    tenantInfoFromCore?: Omit<TenantConfig, "coreConfig">
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

    let tenantConfig = tenantInfoFromCore;

    if (!tenantConfig) {
        tenantConfig = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
    }

    if (tenantConfig === undefined) {
        return {
            status: "TENANT_NOT_FOUND_ERROR",
        };
    }

    const firstFactorsFromMFA = mtRecipe.staticFirstFactors;

    logDebugMessage(`isValidFirstFactor got ${tenantConfig.firstFactors?.join(", ")} from tenant config`);
    logDebugMessage(`isValidFirstFactor got ${firstFactorsFromMFA} from MFA`);
    logDebugMessage(
        `isValidFirstFactor tenantconfig enables: ${Object.keys(tenantConfig).filter(
            (k) => (tenantConfig as any)[k]?.enabled
        )}`
    );

    // first factors configured in core is prioritised over the ones configured statically
    let configuredFirstFactors: string[] | undefined =
        tenantConfig.firstFactors !== undefined ? tenantConfig.firstFactors : firstFactorsFromMFA;

    if (configuredFirstFactors === undefined) {
        configuredFirstFactors = mtRecipe.allAvailableFirstFactors;
    }

    // Here we filter the array so that we only have:
    // 1. Factors that other recipes have marked as available
    // 2. Custom factors (not in the built-in FactorIds list)
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
        configuredFirstFactors = configuredFirstFactors.filter((factorId: string) => factorId !== FactorIds.THIRDPARTY);
    }

    if (configuredFirstFactors.includes(factorId)) {
        return {
            status: "OK",
        };
    }

    return {
        status: "INVALID_FIRST_FACTOR_ERROR",
    };
};

export const getValidFirstFactors = async function ({
    firstFactorsFromCore,
    staticFirstFactors,
    allAvailableFirstFactors,
    tenantId,
    userContext,
}: {
    firstFactorsFromCore: string[] | undefined;
    staticFirstFactors: string[] | undefined;
    allAvailableFirstFactors: string[];
    tenantId: string;
    userContext: UserContext;
}): Promise<string[]> {
    let firstFactors: string[];

    if (firstFactorsFromCore !== undefined) {
        firstFactors = firstFactorsFromCore; // highest priority, config from core
    } else if (staticFirstFactors !== undefined) {
        firstFactors = staticFirstFactors; // next priority, static config
    } else {
        // Fallback to all available factors (de-duplicated)
        firstFactors = Array.from(new Set(allAvailableFirstFactors));
    }

    // we now filter out all available first factors by checking if they are valid because
    // we want to return the ones that can work. this would be based on what recipes are enabled
    // on the core and also firstFactors configured in the core and supertokens.init
    // Also, this way, in the front end, the developer can just check for firstFactors for
    // enabled recipes in all cases irrespective of whether they are using MFA or not
    let validFirstFactors: string[] = [];
    for (const factorId of firstFactors) {
        let validRes = await isValidFirstFactor(tenantId, factorId, userContext);
        if (validRes.status === "OK") {
            validFirstFactors.push(factorId);
        }
        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
            throw new Error("Tenant not found");
        }
    }

    return validFirstFactors;
};
