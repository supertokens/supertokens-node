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
import { APIInterface, APIOptions } from "..";
import Session from "../../session";

export default async function mfaInfo(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<boolean> {
    let result;

    if (apiImplementation.mfaInfoGET === undefined) {
        return false;
    }

    const session = await Session.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [], sessionRequired: true },
        userContext
    );

    let response = await apiImplementation.mfaInfoGET({
        tenantId,
        options,
        session,
        userContext,
    });
    if (response.status === "OK") {
        // if there is a new session, it will be
        // automatically added to the response by the createNewSession function call
        // inside the verifyEmailPOST function.
        result = { status: "OK" };
    } else {
        result = response;
    }
    send200Response(options.res, result);
    return true;
}
