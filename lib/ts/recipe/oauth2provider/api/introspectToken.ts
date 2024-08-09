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

import { send200Response, sendNon200ResponseWithMessage } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";

export default async function introspectTokenPOST(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.introspectTokenPOST === undefined) {
        return false;
    }

    const body = await options.req.getBodyAsJSONOrFormData();

    if (body.token === undefined) {
        sendNon200ResponseWithMessage(options.res, "token is required in the request body", 400);
        return true;
    }

    const scopes: string[] = body.scope ? body.scope.split(" ") : [];

    let response = await apiImplementation.introspectTokenPOST({
        options,
        token: body.token,
        scopes,
        userContext,
    });

    send200Response(options.res, response);
    return true;
}
