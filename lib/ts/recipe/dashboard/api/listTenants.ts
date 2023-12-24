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

export default async function listTenants(
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: any
): Promise<Response> {
    let tenantsRes = await Multitenancy.listAllTenants(userContext);
    let finalTenants: TenantListTenantType[] = [];
    let passwordlessContactMethod: PasswordlessContactMethod | undefined = undefined;

    try {
        const passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
        passwordlessContactMethod = passwordlessRecipe.config.contactMethod;
    } catch (_) {
        try {
            const thirdpartyPasswordlessRecipe = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
            passwordlessContactMethod = thirdpartyPasswordlessRecipe.config.contactMethod;
        } catch (_) {}
    }

    if (tenantsRes.status !== "OK") {
        return tenantsRes;
    }

    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        let currentTenant = tenantsRes.tenants[i];
        let modifiedTenant: TenantListTenantType = {
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        };

        if (passwordlessContactMethod !== undefined) {
            modifiedTenant.passwordless.contactMethod = passwordlessContactMethod;
        }

        if (tenantsRes.tenants[i].tenantId === "public") {
            const publicTenantLoginMethodsInfo = getPublicTenantLoginMethodsInfo();
            modifiedTenant.emailPassword = publicTenantLoginMethodsInfo.emailPassword;
            modifiedTenant.passwordless = publicTenantLoginMethodsInfo.passwordless;
            modifiedTenant.thirdParty = publicTenantLoginMethodsInfo.thirdParty;
        }

        finalTenants.push(modifiedTenant);
    }

    return {
        status: "OK",
        tenants: finalTenants,
    };
}

function getPublicTenantLoginMethodsInfo() {
    const passwordless: TenantListTenantType["passwordless"] = {
        enabled: false,
    };
    const emailPassword: TenantListTenantType["emailPassword"] = {
        enabled: false,
    };
    const thirdParty: TenantListTenantType["thirdParty"] = {
        enabled: false,
        providers: [],
    };

    try {
        const thirdpartyPasswordlessRecipe = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
        passwordless.enabled = true;
        passwordless.contactMethod = thirdpartyPasswordlessRecipe.config.contactMethod;
        thirdParty.enabled = true;
        thirdParty.providers = thirdpartyPasswordlessRecipe.config.providers.map((provider) => provider.config);
    } catch (_) {
        try {
            const passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
            passwordless.enabled = true;
            passwordless.contactMethod = passwordlessRecipe.config.contactMethod;
        } catch (_) {}
    }

    try {
        const thirdpartyEmailPassword = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
        emailPassword.enabled = true;
        thirdParty.enabled = true;
        thirdParty.providers = thirdpartyEmailPassword.config.providers.map((provider) => provider.config);
    } catch (_) {
        try {
            EmailPasswordRecipe.getInstanceOrThrowError();
            emailPassword.enabled = true;
        } catch (_) {}
    }

    try {
        const thirdPartyRecipe = ThirdParty.getInstanceOrThrowError();
        thirdParty.enabled = true;
        thirdParty.providers = thirdPartyRecipe.providers.map((provider) => provider.config);
    } catch (_) {}

    return {
        emailPassword,
        passwordless,
        thirdParty,
    };
}
