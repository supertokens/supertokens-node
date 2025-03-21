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

import {
    getBackwardsCompatibleUserInfo,
    getNormalisedShouldTryLinkingWithSessionUserFlag,
    send200Response,
} from "../../../utils";
import STError from "../error";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import { AuthUtils } from "../../../authUtils";

export default async function consumeCode(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.consumeCodePOST === undefined) {
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

    const shouldTryLinkingWithSessionUser = getNormalisedShouldTryLinkingWithSessionUserFlag(options.req, body);

    const session = await AuthUtils.loadSessionInAuthAPIIfNeeded(
        options.req,
        options.res,
        shouldTryLinkingWithSessionUser,
        userContext
    );

    if (session !== undefined) {
        tenantId = session.getTenantId();
    }

    let result = await apiImplementation.consumeCodePOST(
        deviceId !== undefined
            ? {
                  deviceId,
                  userInputCode,
                  preAuthSessionId,
                  tenantId,
                  session,
                  shouldTryLinkingWithSessionUser,
                  options,
                  userContext,
              }
            : {
                  linkCode,
                  options,
                  preAuthSessionId,
                  tenantId,
                  session,
                  shouldTryLinkingWithSessionUser,
                  userContext,
              }
    );

    if (result.status === "OK") {
        result = {
            ...result,
            ...getBackwardsCompatibleUserInfo(options.req, result, userContext),
        };
        delete (result as any).session;
    }

    send200Response(options.res, result);
    return true;
}
