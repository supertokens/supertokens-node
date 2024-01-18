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
import Multitenancy from "../../../multitenancy";
import PasswordlessRecipe from "../../../passwordless/recipe";
import ThirdPartyPasswordlessRecipe from "../../../thirdpartypasswordless/recipe";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import ThirdPartyEmailPasswordRecipe from "../../../thirdpartyemailpassword/recipe";
import ThirdParty from "../../../thirdparty/recipe";
import { TypeNormalisedInput } from "../../../passwordless/types";

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
    userContext: any
): Promise<Response> {
    const tenantsRes = await Multitenancy.listAllTenants(userContext);
    const finalTenants: TenantLoginMethodType[] = [];

    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];

        const normalisedTenantLoginMethodsInfo = normaliseTenantLoginMethodsWithInitConfig({
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        });

        finalTenants.push(normalisedTenantLoginMethodsInfo);
    }

    return {
        status: "OK",
        tenants: finalTenants,
    };
}

function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore: {
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
}): TenantLoginMethodType {
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

    if (tenantDetailsFromCore.passwordless.enabled === true) {
        try {
            const passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod = passwordlessRecipe.config.contactMethod;
        } catch (_) {}
    }

    if (tenantDetailsFromCore.thirdParty.enabled === true || tenantDetailsFromCore.passwordless.enabled === true) {
        try {
            const thirdpartyPasswordlessRecipe = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.thirdPartyPasswordless.enabled = true;
            normalisedTenantLoginMethodsInfo.thirdPartyPasswordless.contactMethod =
                thirdpartyPasswordlessRecipe.config.contactMethod;
        } catch (_) {}
    }

    if (tenantDetailsFromCore.emailPassword.enabled === true) {
        try {
            EmailPasswordRecipe.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
        } catch (_) {}
    }

    if (tenantDetailsFromCore.thirdParty.enabled === true || tenantDetailsFromCore.emailPassword.enabled === true) {
        try {
            ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.thirdPartyEmailPasssword.enabled = true;
        } catch (_) {}
    }

    if (tenantDetailsFromCore.thirdParty.enabled === true) {
        try {
            ThirdParty.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
        } catch (_) {}
    }

    return normalisedTenantLoginMethodsInfo;
}
