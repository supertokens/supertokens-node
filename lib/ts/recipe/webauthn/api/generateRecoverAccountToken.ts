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
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import STError from "../error";

export default async function generateRecoverAccountToken(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.generateRecoverAccountTokenPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();

    const email = requestBody.email;
    if (email === undefined || typeof email !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the email",
        });
    }

    const result = await apiImplementation.generateRecoverAccountTokenPOST({
        email,
        tenantId,
        options,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
