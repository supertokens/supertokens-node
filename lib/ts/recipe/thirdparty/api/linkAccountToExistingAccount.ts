/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
import { APIInterface, APIOptions } from "..";
import STError from "../error";
import { findRightProvider } from "../utils";
import { makeDefaultUserContextFromAPI } from "../../../utils";
import Session from "../../session";

export default async function linkAccountToExistingAccountAPI(
    apiImplementation: APIInterface,
    options: APIOptions
): Promise<boolean> {
    if (apiImplementation.linkAccountToExistingAccountPOST === undefined) {
        return false;
    }

    let bodyParams = await options.req.getJSONBody();
    let thirdPartyId = bodyParams.thirdPartyId;
    let code = bodyParams.code === undefined ? "" : bodyParams.code;
    let redirectURI = bodyParams.redirectURI;
    let authCodeResponse = bodyParams.authCodeResponse;
    let clientId = bodyParams.clientId;

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId in request body",
        });
    }

    if (typeof code !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please make sure that the code in the request body is a string",
        });
    }

    if (code === "" && authCodeResponse === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide one of code or authCodeResponse in the request body",
        });
    }

    if (authCodeResponse !== undefined && authCodeResponse.access_token === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the access_token inside the authCodeResponse request param",
        });
    }

    if (redirectURI === undefined || typeof redirectURI !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the redirectURI in request body",
        });
    }

    let provider = findRightProvider(options.providers, thirdPartyId, clientId);
    if (provider === undefined) {
        if (clientId === undefined) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "The third party provider " + thirdPartyId + ` seems to be missing from the backend configs.`,
            });
        } else {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message:
                    "The third party provider " +
                    thirdPartyId +
                    ` seems to be missing from the backend configs. If it is configured, then please make sure that you are passing the correct clientId from the frontend.`,
            });
        }
    }
    let userContext = makeDefaultUserContextFromAPI(options.req);
    const session = await Session.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [] },
        userContext
    );
    let result = await apiImplementation.linkAccountToExistingAccountPOST({
        provider,
        code,
        redirectURI,
        authCodeResponse,
        clientId,
        session: session,
        options,
        userContext,
    });
    if (result.status === "OK") {
        send200Response(options.res, {
            status: "OK",
            user: result.user,
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
