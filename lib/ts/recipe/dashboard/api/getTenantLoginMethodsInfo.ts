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
import { TypeNormalisedInput } from "../../passwordless/types";
import { isValidFirstFactor } from "../../multitenancy/utils";
import { UserContext } from "../../../types";
import { FactorIds } from "../../multifactorauth";

type PasswordlessContactMethod = TypeNormalisedInput["contactMethod"];

type TenantLoginMethodType = {
    tenantId: string;
    emailPassword: {
        enabled: boolean;
    };
    thirdPartyEmailPasssword: {
        enabled: boolean;
    };
    passwordless: {
        enabled: boolean;
        contactMethod?: PasswordlessContactMethod;
    };
    thirdPartyPasswordless: {
        enabled: boolean;
        contactMethod?: PasswordlessContactMethod;
    };
    thirdParty: {
        enabled: boolean;
    };
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

        const normalisedTenantLoginMethodsInfo = await normaliseTenantLoginMethodsWithInitConfig(
            {
                tenantId: currentTenant.tenantId,
                emailPassword: currentTenant.emailPassword,
                passwordless: currentTenant.passwordless,
                thirdParty: currentTenant.thirdParty,
                firstFactors: currentTenant.firstFactors,
            },
            userContext
        );

        finalTenants.push(normalisedTenantLoginMethodsInfo);
    }

    return {
        status: "OK",
        tenants: finalTenants,
    };
}

async function normaliseTenantLoginMethodsWithInitConfig(
    tenantDetailsFromCore: {
        tenantId: string;
        emailPassword: {
            enabled: boolean;
        };
        passwordless: {
            enabled: boolean;
        };
        thirdParty: {
            enabled: boolean;
        };
        firstFactors?: string[];
    },
    userContext: UserContext
): Promise<TenantLoginMethodType> {
    const normalisedTenantLoginMethodsInfo: TenantLoginMethodType = {
        tenantId: tenantDetailsFromCore.tenantId,
        emailPassword: {
            enabled: false,
        },
        thirdPartyEmailPasssword: {
            enabled: false,
        },
        passwordless: {
            enabled: false,
        },
        thirdPartyPasswordless: {
            enabled: false,
        },
        thirdParty: {
            enabled: false,
        },
    };

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
        let validRes = await isValidFirstFactor(tenantDetailsFromCore.tenantId, factorId, userContext);
        if (validRes.status === "OK") {
            validFirstFactors.push(factorId);
        }
        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
            throw new Error("Tenant not found");
        }
    }

    if (validFirstFactors.includes(FactorIds.EMAILPASSWORD)) {
        normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
    }
    if (validFirstFactors.includes(FactorIds.THIRDPARTY)) {
        normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
    }
    const pwlessEmailEnabled =
        validFirstFactors.includes(FactorIds.OTP_EMAIL) || validFirstFactors.includes(FactorIds.LINK_EMAIL);
    const pwlessPhoneEnabled =
        validFirstFactors.includes(FactorIds.OTP_PHONE) || validFirstFactors.includes(FactorIds.LINK_PHONE);
    if (pwlessEmailEnabled) {
        if (pwlessPhoneEnabled) {
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod = "EMAIL_OR_PHONE";
        } else {
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod = "EMAIL";
        }
    } else if (pwlessPhoneEnabled) {
        normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
        normalisedTenantLoginMethodsInfo.passwordless.contactMethod = "PHONE";
    }

    return normalisedTenantLoginMethodsInfo;
}
