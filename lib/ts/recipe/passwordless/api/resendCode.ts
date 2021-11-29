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
import { APIInterface, APIOptions } from "..";

export default async function resendCode(apiImplementation: APIInterface, options: APIOptions): Promise<boolean> {
    if (apiImplementation.resendCodePOST === undefined) {
        return false;
    }

    const body = await options.req.getJSONBody();
    const preAuthSessionId = body.preAuthSessionId;
    const deviceId = body.deviceId;

    if (preAuthSessionId === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide preAuthSessionId",
        });
    }

    if (deviceId !== undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide a deviceId",
        });
    }

    let result = await apiImplementation.resendCodePOST({ deviceId, preAuthSessionId, options }, {});

    send200Response(options.res, result);
    return true;
}
