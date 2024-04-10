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
import MultitenancyRecipe from "../../../multitenancy/recipe";
import SuperTokens from "../../../../supertokens";
import { normaliseTenantLoginMethodsWithInitConfig } from "./utils";
import { mergeProvidersFromCoreAndStatic } from "../../../thirdparty/providers/configUtils";

export type Response =
    | {
          status: "OK";
          tenant: {
              tenantId: string;
              thirdParty: {
                  providers: string[];
              };
              firstFactors: string[];
              requiredSecondaryFactors?: string[] | null;
              coreConfig: any[]; // TODO
              userCount: number;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };

export default async function getTenantInfo(
    _: APIInterface,
    tenantId: string,
    __: APIOptions,
    userContext: any
): Promise<Response> {
    let tenantRes;

    try {
        tenantRes = await Multitenancy.getTenant(tenantId, userContext);
    } catch (_) {}

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    let { status, ...tenantConfig } = tenantRes;

    let firstFactors = normaliseTenantLoginMethodsWithInitConfig(tenantConfig);

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    const userCount = await SuperTokens.getInstanceOrThrowError().getUserCount(undefined, tenantId, userContext);

    const providersFromCore = tenantRes?.thirdParty?.providers ?? [];
    const mtRecipe = MultitenancyRecipe.getInstance();
    const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];

    const mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders).map(
        (provider) => provider.config
    );

    // const coreConfig = await SuperTokens.getInstanceOrThrowError().listAllCoreConfigProperties({
    //     tenantId,
    //     userContext,
    // });

    const tenant: {
        tenantId: string;
        thirdParty: {
            providers: string[];
        };
        firstFactors: string[];
        requiredSecondaryFactors?: string[] | null;
        coreConfig: any[];
        userCount: number;
    } = {
        tenantId,
        thirdParty: {
            providers: mergedProvidersFromCoreAndStatic.map((provider) => provider.thirdPartyId),
        },
        firstFactors: firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        // coreConfig: coreConfig.config,
        coreConfig: [
            {
                key: "password_reset_token_lifetime",
                valueType: "number",
                value: 3600000,
                description: "The time in milliseconds for which the password reset token is valid.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: 3600000,
                isNullable: false,
                isPluginProperty: false,
            },
            {
                key: "access_token_blacklisting",
                valueType: "boolean",
                value: false,
                description: "Whether to blacklist access tokens or not.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: false,
                isNullable: false,
                isPluginProperty: false,
            },
            {
                key: "ip_allow_regex",
                valueType: "string",
                value: null,
                description: "The regex to match the IP address of the user.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: null,
                isNullable: true,
                isPluginProperty: false,
            },
            {
                key: "postgresql_emailpassword_users_table_name",
                valueType: "string",
                value: null,
                description: "The name of the table where the emailpassword users are stored.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: 3600000,
                isNullable: true,
                isPluginProperty: true,
            },
        ],
        userCount,
    };

    return {
        status: "OK",
        tenant,
    };
}
