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

import { APIInterface, APIOptions } from "../";

export default async function appleRedirectHandler(
    apiImplementation: APIInterface,
    options: APIOptions
): Promise<boolean> {
    if (apiImplementation.appleRedirectHandlerPOST === undefined) {
        return false;
    }

    let body = await options.req.getFormData();

    let state = body.state;
    let code = body.code;

    // this will redirect the user...
    let response = await apiImplementation.appleRedirectHandlerPOST({
        code,
        state,
        options,
    });

    options.res.redirect(307, response.redirectTo);

    return true;
}
