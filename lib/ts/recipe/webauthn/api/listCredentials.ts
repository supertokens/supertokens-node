/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
import { UserContext } from "../../../types";
import { AuthUtils } from "../../../authUtils";

export default async function listCredentialsAPI(
    apiImplementation: APIInterface,
    _: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.listCredentialsGET === undefined) {
        return false;
    }

    const session = await AuthUtils.loadSessionInAuthAPIIfNeeded(options.req, options.res, undefined, userContext);
    if (session === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "A valid session is required to register a credential",
        });
    }

    const result = await apiImplementation.listCredentialsGET({
        options,
        userContext: userContext,
        session,
    });

    if (result.status === "OK") {
        send200Response(options.res, result);
    } else {
        send200Response(options.res, result);
    }

    return true;
}
