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

export default async function signInUpAPI(apiImplementation: APIInterface, options: APIOptions) {
    if (apiImplementation.signInUpPOST === undefined) {
        return options.next();
    }

    let bodyParams = options.req.body;
    let thirdPartyId = bodyParams.thirdPartyId;
    let code = bodyParams.code;
    let redirectURI = bodyParams.redirectURI;

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId in request body",
        });
    }

    if (code === undefined || typeof code !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the code in request body",
        });
    }

    if (redirectURI === undefined || typeof redirectURI !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the redirectURI in request body",
        });
    }

    let provider = options.providers.find((p) => p.id === thirdPartyId);
    if (provider === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message:
                "The third party provider " +
                thirdPartyId +
                " seems to not be configured on the backend. Please check your frontend and backend configs.",
        });
    }

    let result = await apiImplementation.signInUpPOST(provider, code, redirectURI, options);

    if (result.status === "OK") {
        return send200Response(options.res, {
            status: result.status,
            user: result.user,
            createdNewUser: result.createdNewUser,
        });
    } else if (result.status === "NO_EMAIL_GIVEN_BY_PROVIDER") {
        send200Response(options.res, {
            status: "NO_EMAIL_GIVEN_BY_PROVIDER",
        });
    } else {
        send200Response(options.res, {
            status: "FIELD_ERROR",
            error: result.error,
        });
    }
}
