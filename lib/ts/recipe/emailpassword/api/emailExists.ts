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

export default async function emailExists(apiImplementation: APIInterface, options: APIOptions): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/47#issue-751571692

    if (apiImplementation.emailExistsGET === undefined) {
        return false;
    }

    let email = options.req.getKeyValueFromQuery("email");

    if (email === undefined || typeof email !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the email as a GET param",
        });
    }

    let result = await apiImplementation.emailExistsGET({ email, options, userContext: {} });

    send200Response(options.res, result);
    return true;
}
