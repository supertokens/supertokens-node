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

import { send200Response, normaliseHttpMethod } from "../../../utils";
import STError from "../error";
import { APIInterface, APIOptions } from "../";
import Session from "../../session";
import { UserContext } from "../../../types";

export default async function emailVerify(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    let result;

    if (normaliseHttpMethod(options.req.getMethod()) === "post") {
        // Logic according to Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106

        if (apiImplementation.verifyEmailPOST === undefined) {
            return false;
        }

        const requestBody = await options.req.getJSONBody();

        let token = requestBody.token;
        if (token === undefined || token === null) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide the email verification token",
            });
        }
        if (typeof token !== "string") {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "The email verification token must be a string",
            });
        }

        const session = await Session.getSession(
            options.req,
            options.res,
            { overrideGlobalClaimValidators: () => [], sessionRequired: false },
            userContext
        );

        let response = await apiImplementation.verifyEmailPOST({
            token,
            tenantId,
            options,
            session,
            userContext,
        });
        if (response.status === "OK") {
            // if there is a new session, it will be
            // automatically added to the response by the createNewSession function call
            // inside the verifyEmailPOST function.
            result = { status: "OK" };
        } else {
            result = response;
        }
    } else {
        if (apiImplementation.isEmailVerifiedGET === undefined) {
            return false;
        }

        const session = await Session.getSession(
            options.req,
            options.res,
            { overrideGlobalClaimValidators: () => [] },
            userContext
        );
        result = await apiImplementation.isEmailVerifiedGET({
            options,
            session,
            userContext,
        });
    }
    send200Response(options.res, result);
    return true;
}
