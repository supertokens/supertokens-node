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
import { APIInterface, APIOptions } from "../../types";
import Multitenancy from "../../../multitenancy";
import { ProviderConfig } from "../../../thirdparty/types";
import SuperTokens from "../../../../supertokens";

type TenantListTenantType = {
    tenantId: string;
    emailPassword: {
        enabled: boolean;
    };
    passwordless: {
        enabled: boolean;
    };
    thirdParty: {
        enabled: boolean;
        providers: ProviderConfig[];
    };
    userCount?: number;
};

export type Response = {
    status: "OK";
    tenants: TenantListTenantType[];
};

export default async function listTenants(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const shouldIncludeUserCount = options.req.getKeyValueFromQuery("includeUserCount");
    let tenantsRes = await Multitenancy.listAllTenants(userContext);
    let finalTenants: TenantListTenantType[] = [];

    if (tenantsRes.status !== "OK") {
        return tenantsRes;
    }

    // TODO: Add an API to core to get user count for all tenants in one go
    let tenantsUserCount: Array<number> | undefined;
    if (shouldIncludeUserCount) {
        tenantsUserCount = await Promise.all(
            tenantsRes.tenants.map((tenant) => {
                return SuperTokens.getInstanceOrThrowError().getUserCount(undefined, tenant.tenantId);
            })
        );
    }

    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        let currentTenant = tenantsRes.tenants[i];
        let modifiedTenant: TenantListTenantType = {
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        };
        if (shouldIncludeUserCount && Array.isArray(tenantsUserCount)) {
            modifiedTenant.userCount = tenantsUserCount[i];
        }
        finalTenants.push(modifiedTenant);
    }

    return {
        status: "OK",
        tenants: finalTenants,
    };
}
