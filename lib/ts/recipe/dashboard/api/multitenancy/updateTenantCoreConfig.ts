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
import MultitenancyRecipe from "../../../multitenancy/recipe";
import { QuerierError } from "../../../../QuerierError";

export type Response =
    | { status: "OK" }
    | { status: "UNKNOWN_TENANT_ERROR" }
    | { status: "INVALID_CONFIG_ERROR"; message: string };

export default async function updateTenantCoreConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const { name, value } = requestBody;

    const mtRecipe = MultitenancyRecipe.getInstance();

    const tenantRes = await mtRecipe!.recipeInterfaceImpl.getTenant({ tenantId, userContext });
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    try {
        await mtRecipe!.recipeInterfaceImpl.createOrUpdateTenant({
            tenantId,
            config: {
                coreConfig: {
                    [name]: value,
                },
            },
            userContext,
        });
    } catch (err) {
        if (err instanceof QuerierError) {
            console.log(err);
            if (err.statusCode === 400) {
                return {
                    status: "INVALID_CONFIG_ERROR",
                    message: err.errorMessageFromCore,
                };
            }
        }
        throw err;
    }

    return {
        status: "OK",
    };
}
