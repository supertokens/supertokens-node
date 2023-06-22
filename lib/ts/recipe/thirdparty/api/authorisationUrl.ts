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

import { send200Response } from "../../../utils";
import STError from "../error";
import { APIInterface, APIOptions } from "../";
import MultitenancyRecipe from "../../multitenancy/recipe";
import { RecipeDisabledForTenantError } from "../../multitenancy";
import { DEFAULT_TENANT_ID } from "../../multitenancy/constants";

export default async function authorisationUrlAPI(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: any
): Promise<boolean> {
    if (apiImplementation.authorisationUrlGET === undefined) {
        return false;
    }

    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");
    const redirectURIOnProviderDashboard = options.req.getKeyValueFromQuery("redirectURIOnProviderDashboard");
    const clientType = options.req.getKeyValueFromQuery("clientType");
    let tenantId = options.req.getKeyValueFromQuery("tenantId");

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId as a GET param",
        });
    }

    if (redirectURIOnProviderDashboard === undefined || typeof redirectURIOnProviderDashboard !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the redirectURIOnProviderDashboard as a GET param",
        });
    }

    const mtRecipe = MultitenancyRecipe.getInstanceOrThrowError();
    tenantId = await mtRecipe.recipeInterfaceImpl.getTenantId({
        tenantIdFromFrontend: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
        userContext,
    });

    const providerResponse = await options.recipeImplementation.getProvider({
        thirdPartyId,
        tenantId,
        clientType,
        userContext,
    });

    if (!providerResponse.thirdPartyEnabled) {
        throw new RecipeDisabledForTenantError({
            type: "RECIPE_DISABLED_FOR_TENANT_ERROR",
            message: `The third party recipe is disabled for ${
                tenantId === undefined || tenantId === DEFAULT_TENANT_ID ? "default tenant" : tenantId
            }`,
        });
    }

    const provider = providerResponse.provider;
    let result = await apiImplementation.authorisationUrlGET({
        provider,
        redirectURIOnProviderDashboard,
        options,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
