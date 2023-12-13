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

import { APIInterface, APIOptions } from "../types";
import SuperTokens from "../../../supertokens";
import { Querier } from "../../../querier";
import NormalisedURLPath from "../../../normalisedURLPath";
import { version as SDKVersion } from "../../../version";
import STError from "../../../error";
import { doFetch } from "../../../utils";
import { UserContext } from "../../../types";

export type Response = {
    status: "OK";
};

export default async function analyticsPost(
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> {
    // If telemetry is disabled, dont send any event
    if (!SuperTokens.getInstanceOrThrowError().telemetryEnabled) {
        return {
            status: "OK",
        };
    }

    const { email, dashboardVersion } = await options.req.getJSONBody();

    if (email === undefined) {
        throw new STError({
            message: "Missing required property 'email'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (dashboardVersion === undefined) {
        throw new STError({
            message: "Missing required property 'dashboardVersion'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let telemetryId: string | undefined;
    let numberOfUsers: number;
    try {
        let querier = Querier.getNewInstanceOrThrowError(options.recipeId);
        let response = await querier.sendGetRequest(new NormalisedURLPath("/telemetry"), {}, userContext);
        if (response.exists) {
            telemetryId = response.telemetryId;
        }

        numberOfUsers = await SuperTokens.getInstanceOrThrowError().getUserCount(undefined, undefined, userContext);
    } catch (_) {
        // If either telemetry id API or user count fetch fails, no event should be sent
        return {
            status: "OK",
        };
    }

    const { apiDomain, getOrigin: websiteDomain, appName } = options.appInfo;
    const data = {
        websiteDomain: websiteDomain({
            request: undefined,
            userContext,
        }).getAsStringDangerous(),
        apiDomain: apiDomain.getAsStringDangerous(),
        appName,
        sdk: "node",
        sdkVersion: SDKVersion,
        telemetryId,
        numberOfUsers,
        email,
        dashboardVersion,
    };

    try {
        await doFetch("https://api.supertokens.com/0/st/telemetry", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "api-version": "3",
                "content-type": "application/json; charset=utf-8",
            },
        });
    } catch (e) {
        // Ignored
    }

    return {
        status: "OK",
    };
}
