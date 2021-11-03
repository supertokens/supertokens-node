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

import { send200Response } from "../../../utils";
import STError from "../error";
import { APIInterface, APIOptions } from "../";
import { findRightProvider } from "../utils";

export default async function authorisationUrlAPI(
    apiImplementation: APIInterface,
    options: APIOptions
): Promise<boolean> {
    if (apiImplementation.authorisationUrlGET === undefined) {
        return false;
    }

    let thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");

    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the thirdPartyId as a GET param",
        });
    }

    let provider = findRightProvider(options.providers, thirdPartyId, undefined);
    if (provider === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message:
                "The third party provider " +
                thirdPartyId +
                ` seems to be missing from the backend configs. If it is configured, and you have multiple of them from the same provider, please mark one of them as the primary one by giving it a "primary: true" flag.`,
        });
    }

    let result = await apiImplementation.authorisationUrlGET({ provider, options });

    send200Response(options.res, result);
    return true;
}
