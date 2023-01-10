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

import STError from "../error";
import { send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "../";
import { makeDefaultUserContextFromAPI } from "../../../utils";

export default async function signInUpAPI(apiImplementation: APIInterface, options: APIOptions): Promise<boolean> {
    if (apiImplementation.signInUpPOST === undefined) {
        return false;
    }

    const bodyParams = await options.req.getJSONBody();
    const thirdPartyId = bodyParams.thirdPartyId;
    const clientType = bodyParams.clientType;
    let tenantId = bodyParams.tenantId;

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId in request body",
        });
    }

    let redirectURIInfo:
        | undefined
        | {
              redirectURIOnProviderDashboard: string;
              redirectURIQueryParams: any;
              pkceCodeVerifier?: string;
          };
    let oAuthTokens: any;

    if (bodyParams.redirectURIInfo !== undefined) {
        if (bodyParams.redirectURIInfo.redirectURIOnProviderDashboard === undefined) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide the redirectURIOnProviderDashboard in request body",
            });
        }
        redirectURIInfo = bodyParams.redirectURIInfo;
    } else if (bodyParams.oAuthTokens !== undefined) {
        oAuthTokens = bodyParams.oAuthTokens;
    } else {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide one of redirectURIInfo or oAuthTokens in the request body",
        });
    }

    const userContext = makeDefaultUserContextFromAPI(options.req);

    // TODO tp-rework tenantId = multitenancyRecipe.getTenantId(tenantId, userContext);

    const providerResponse = await options.recipeImplementation.getProvider({ thirdPartyId, tenantId, clientType, userContext });

    if (!providerResponse.thirdPartyEnabled) {
        // TODO tp-rework throw multitenancy.recipenotenabled error
    }

    const provider = providerResponse.provider;

    let result = await apiImplementation.signInUpPOST({
        provider,
        redirectURIInfo,
        oAuthTokens,
        options,
        userContext,
    });

    if (result.status === "OK") {
        send200Response(options.res, {
            status: result.status,
            user: result.user,
            createdNewUser: result.createdNewUser,
        });
    } else if (result.status === "NO_EMAIL_GIVEN_BY_PROVIDER") {
        send200Response(options.res, {
            status: "NO_EMAIL_GIVEN_BY_PROVIDER",
        });
    } else {
        send200Response(options.res, result);
    }
    return true;
}
