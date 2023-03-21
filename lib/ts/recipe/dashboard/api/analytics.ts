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

export type Response = {
    status: "OK";
    data?: {
        websiteDomain: string;
        websiteBasePath: string;
        apiDomain: string;
        apiBasePath: string;
        appName: string;
        backendSDKName: string;
        backendSDKVersion: string;
        // These can be undefined and will be skipped if not present
        telemetryId: string | undefined;
        numberOfUsers: number | undefined;
    };
};

export default async function analyticsPost(_: APIInterface, options: APIOptions): Promise<Response> {
    // If telemetry is disabled, dont send any event
    if (!SuperTokens.getInstanceOrThrowError().telemetryEnabled) {
        return {
            status: "OK",
        };
    }

    let telemetryId: string | undefined;
    try {
        let querier = Querier.getNewInstanceOrThrowError(options.recipeId);
        let response = await querier.sendGetRequest(new NormalisedURLPath("/telemetry"), {});
        if (response.exists) {
            telemetryId = response.telemetryId;
        }
    } catch (_) {
        // Ignored
    }

    let numberOfUsers: number | undefined;

    try {
        numberOfUsers = await SuperTokens.getInstanceOrThrowError().getUserCount();
    } catch (_) {
        // ignored
    }

    const { apiDomain, apiBasePath, websiteDomain, websiteBasePath, appName } = options.appInfo;

    return {
        status: "OK",
        data: {
            websiteDomain: websiteDomain.getAsStringDangerous(),
            websiteBasePath: websiteBasePath.getAsStringDangerous(),
            apiDomain: apiDomain.getAsStringDangerous(),
            apiBasePath: apiBasePath.getAsStringDangerous(),
            appName,
            backendSDKName: "supertokens-node",
            backendSDKVersion: SDKVersion,
            telemetryId,
            numberOfUsers,
        },
    };
}
