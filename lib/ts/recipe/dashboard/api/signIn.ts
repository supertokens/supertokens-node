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

import { APIFunction } from "../types";
import { send200Response } from "../../../utils";
import STError from "../../../error";
import { Querier } from "../../../querier";

export default async function signIn(input: Parameters<APIFunction>[0]): Promise<boolean> {
    const options = input.options;
    const userContext = input.userContext;
    const { email, password } = await options.req.getJSONBody();

    if (email === undefined) {
        throw new STError({
            message: "Missing required parameter 'email'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (password === undefined) {
        throw new STError({
            message: "Missing required parameter 'password'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let querier = Querier.getNewInstanceOrThrowError(input.stInstance);
    const signInResponse = await querier.sendPostRequest(
        "/recipe/dashboard/signin",
        {
            email,
            password,
        },
        userContext
    );

    send200Response(options.res, signInResponse);

    return true;
}
