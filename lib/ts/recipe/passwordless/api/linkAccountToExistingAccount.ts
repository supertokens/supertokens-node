/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
import { makeDefaultUserContextFromAPI } from "../../../utils";
import Session from "../../session";

export default async function linkAccountToExistingAccountAPI(
    apiImplementation: APIInterface,
    options: APIOptions
): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536

    if (apiImplementation.linkAccountToExistingAccountPOST === undefined) {
        return false;
    }

    const body = await options.req.getJSONBody();
    const preAuthSessionId = body.preAuthSessionId;
    const linkCode = body.linkCode;
    const deviceId = body.deviceId;
    const userInputCode = body.userInputCode;

    if (preAuthSessionId === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide preAuthSessionId",
        });
    }

    if (deviceId !== undefined || userInputCode !== undefined) {
        if (linkCode !== undefined) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide one of (linkCode) or (deviceId+userInputCode) and not both",
            });
        }
        if (deviceId === undefined || userInputCode === undefined) {
            throw new STError({
                type: STError.BAD_INPUT_ERROR,
                message: "Please provide both deviceId and userInputCode",
            });
        }
    } else if (linkCode === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide one of (linkCode) or (deviceId+userInputCode) and not both",
        });
    }

    let userContext = makeDefaultUserContextFromAPI(options.req);
    const session = await Session.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [] },
        userContext
    );
    let result = await apiImplementation.linkAccountToExistingAccountPOST(
        deviceId !== undefined
            ? {
                  deviceId,
                  userInputCode,
                  preAuthSessionId,
                  options,
                  userContext,
                  session,
              }
            : {
                  linkCode,
                  options,
                  preAuthSessionId,
                  userContext,
                  session,
              }
    );
    if (result.status === "OK") {
        delete (result as any).session;
    }
    send200Response(options.res, result);
    return true;
}
