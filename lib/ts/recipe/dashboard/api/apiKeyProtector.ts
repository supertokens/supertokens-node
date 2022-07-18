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
import { sendNon200Response } from "../../../utils";
import { APIFunction, APIInterface, APIOptions } from "../types";
import { isValidApiKey } from "../utils";

export default async function apiKeyProtector(
    apiImplementation: APIInterface,
    options: APIOptions,
    apiFunction: APIFunction
): Promise<boolean> {
    const apiKeyFromHeaders = options.req.getHeaderValue("api-key");

    if (apiKeyFromHeaders === undefined) {
        sendNon200Response(options.res, "Unauthorised Access", 401);
        return true;
    }

    if (!isValidApiKey(apiKeyFromHeaders, options.config)) {
        sendNon200Response(options.res, "Unauthorised Access", 401);
        return true;
    }

    return await apiFunction(apiImplementation, options);
}
