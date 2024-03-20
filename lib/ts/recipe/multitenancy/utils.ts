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

    if (
        isFactorConfiguredForTenant({
            tenantConfig,
            allAvailableFirstFactors: mtRecipe.allAvailableFirstFactors,
            firstFactors: configuredFirstFactors,
            factorId,
        })
    ) {
        return {
            status: "OK",
        };
    }

    return {
        status: "INVALID_FIRST_FACTOR_ERROR",
    };
};

export function isFactorConfiguredForTenant({
    tenantConfig,
    allAvailableFirstFactors,
    firstFactors,
    factorId,
}: {
    tenantConfig: TenantConfig;
    allAvailableFirstFactors: string[];
    firstFactors: string[];
    factorId: string;
}) {
    // Here we filter the array so that we only have:
    // 1. Factors that other recipes have marked as available
    // 2. Custom factors (not in the built-in FactorIds list)
    let configuredFirstFactors = firstFactors.filter(
        (factorId: string) =>
            allAvailableFirstFactors.includes(factorId) || !Object.values(FactorIds).includes(factorId)
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

    return configuredFirstFactors.includes(factorId);
}
