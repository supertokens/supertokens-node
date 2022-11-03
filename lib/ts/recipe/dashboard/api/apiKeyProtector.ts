/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import { makeDefaultUserContextFromAPI } from "../../../utils";
import { APIFunction, APIInterface, APIOptions } from "../types";
import { sendUnauthorisedAccess } from "../utils";

export default async function apiKeyProtector(
    apiImplementation: APIInterface,
    options: APIOptions,
    apiFunction: APIFunction
): Promise<boolean> {
    const shouldAllowAccess = await options.recipeImplementation.shouldAllowAccess({
        req: options.req,
        config: options.config,
        userContext: makeDefaultUserContextFromAPI(options.req),
    });

    if (!shouldAllowAccess) {
        sendUnauthorisedAccess(options.res);
        return true;
    }

    await apiFunction(apiImplementation, options);
    return true;
}
