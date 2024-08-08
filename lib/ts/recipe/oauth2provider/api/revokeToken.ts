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

import { send200Response, sendNon200Response, sendNon200ResponseWithMessage } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";

export default async function revokeTokenPOST(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.revokeTokenPOST === undefined) {
        return false;
    }

    const body = await options.req.getBodyAsJSONOrFormData();

    if (body.token === undefined) {
        sendNon200ResponseWithMessage(options.res, "token is required in the request body", 400);
        return true;
    }

    const authorizationHeader = options.req.getHeaderValue("authorization");

    if (authorizationHeader !== undefined && (body.client_id !== undefined || body.client_secret !== undefined)) {
        sendNon200ResponseWithMessage(
            options.res,
            "Only one of authorization header or client_id and client_secret can be provided",
            400
        );
        return true;
    }

    let response = await apiImplementation.revokeTokenPOST({
        options,
        authorizationHeader,
        token: body.token,
        clientId: body.client_id,
        clientSecret: body.client_secret,
        userContext,
    });

    if ("statusCode" in response && response.statusCode !== 200) {
        sendNon200Response(options.res, response.statusCode!, response);
    } else {
        send200Response(options.res, response);
    }
    return true;
}
