/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import Multitenancy from "../../multitenancy";
import { ProviderConfig } from "../../thirdparty/types";
import PasswordlessRecipe from "../../passwordless/recipe";
import ThirdPartyPasswordlessRecipe from "../../thirdpartypasswordless/recipe";
import EmailPasswordRecipe from "../../emailpassword/recipe";
import ThirdPartyEmailPasswordRecipe from "../../thirdpartyemailpassword/recipe";
import ThirdParty from "../../thirdparty/recipe";
import { TypeNormalisedInput } from "../../passwordless/types";

type PasswordlessContactMethod = TypeNormalisedInput["contactMethod"];

type TenantListTenantType = {
    tenantId: string;
    emailPassword: {
        enabled: boolean;
    };
    passwordless: {
        enabled: boolean;
        contactMethod?: PasswordlessContactMethod;
    };
    thirdParty: {
        enabled: boolean;
        providers: ProviderConfig[];
    };
};

export type Response = {
    status: "OK";
    tenants: TenantListTenantType[];
};

export default async function getLoginMethodsInfo(
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: any
): Promise<Response> {
    let tenantsRes = await Multitenancy.listAllTenants(userContext);
    let finalTenants: TenantListTenantType[] = [];

    if (tenantsRes.status !== "OK") {
        return tenantsRes;
    }

    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        let currentTenant = tenantsRes.tenants[i];
        let tenantDetailsFromCore: TenantListTenantType = {
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        };
        const normalisedTenantLoginMethodsInfo = normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore);

        finalTenants.push(normalisedTenantLoginMethodsInfo);
    }

    return {
        status: "OK",
        tenants: finalTenants,
    };
}

// basically this function make sures that a particular login method for a tenant is configured in the core and initilaized in the recipeList on backend sdk.

function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore: TenantListTenantType): TenantListTenantType {
    const normalisedTenantLoginMethodsInfo: TenantListTenantType = {
        tenantId: tenantDetailsFromCore.tenantId,
        emailPassword: {
            enabled: false,
        },
        passwordless: {
            enabled: false,
        },
        thirdParty: {
            enabled: false,
            providers: [],
        },
    };

    if (tenantDetailsFromCore.passwordless.enabled === true) {
        try {
            const thirdpartyPasswordlessRecipe = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod =
                thirdpartyPasswordlessRecipe.config.contactMethod;
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
            normalisedTenantLoginMethodsInfo.thirdParty.providers = thirdpartyPasswordlessRecipe.config.providers.map(
                (provider) => provider.config
            );
        } catch (_) {
            try {
                const passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
                normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
                normalisedTenantLoginMethodsInfo.passwordless.contactMethod = passwordlessRecipe.config.contactMethod;
            } catch (_) {}
        }
    }

    if (tenantDetailsFromCore.emailPassword.enabled === true) {
        try {
            const thirdpartyEmailPassword = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
            normalisedTenantLoginMethodsInfo.thirdParty.providers = thirdpartyEmailPassword.config.providers.map(
                (provider) => provider.config
            );
        } catch (_) {
            try {
                EmailPasswordRecipe.getInstanceOrThrowError();
                normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
            } catch (_) {}
        }
    }

    if (tenantDetailsFromCore.thirdParty.enabled === true) {
        try {
            const thirdPartyRecipe = ThirdParty.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
            normalisedTenantLoginMethodsInfo.thirdParty.providers = thirdPartyRecipe.providers.map(
                (provider) => provider.config
            );
        } catch (_) {}
    }

    return normalisedTenantLoginMethodsInfo;
}
