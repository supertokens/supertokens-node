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
import { getBackwardsCompatibleUserInfo, send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import Session from "../../session";

export default async function signInUpAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.signInUpPOST === undefined) {
        return false;
    }

    const bodyParams = await options.req.getJSONBody();
    const thirdPartyId = bodyParams.thirdPartyId;
    const clientType = bodyParams.clientType;

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

    const providerResponse = await options.recipeImplementation.getProvider({
        thirdPartyId,
        tenantId,
        clientType,
        userContext,
    });

    if (providerResponse === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: `the provider ${thirdPartyId} could not be found in the configuration`,
        });
    }

    const provider = providerResponse;

    let session = await Session.getSession(
        options.req,
        options.res,
        {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        },
        userContext
    );

    if (session !== undefined) {
        tenantId = session.getTenantId();
    }

    let result = await apiImplementation.signInUpPOST({
        provider,
        redirectURIInfo,
        oAuthTokens,
        tenantId,
        session,
        options,
        userContext,
    });

    if (result.status === "OK") {
        send200Response(options.res, {
            status: result.status,
            ...getBackwardsCompatibleUserInfo(options.req, result),
        });
    } else {
        send200Response(options.res, result);
    }
    return true;
}
