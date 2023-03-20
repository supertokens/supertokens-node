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
import STError from "../../../error";
import { Querier } from "../../../querier";
import NormalisedURLPath from "../../../normalisedURLPath";
import { version as SDKVersion } from "../../../version";
import axios from "axios";

export type Response = {
    status: "OK";
};

export default async function analyticsPost(_: APIInterface, options: APIOptions): Promise<Response> {
    // If telemetry is disabled, dont send any event
    if (!SuperTokens.getInstanceOrThrowError().telemetryEnabled) {
        return {
            status: "OK",
        };
    }

    const {
        // email will be undefined if the frontend is using the api key flow
        email,
        dashboardVersion,
    } = await options.req.getJSONBody();

    if (dashboardVersion === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Missing required parameter 'dashboardVersion'",
        });
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

    const retries = 3;
    const { apiDomain, apiBasePath, websiteDomain, websiteBasePath, appName } = options.appInfo;

    for (let i = 0; i < retries; i++) {
        try {
            let response = await axios({
                method: "POST",
                url: "https://api.supertokens.com/0/st/telemetry",
                data: {
                    websiteDomain: websiteDomain.getAsStringDangerous(),
                    websiteBasePath: websiteBasePath.getAsStringDangerous(),
                    apiDomain: apiDomain.getAsStringDangerous(),
                    apiBasePath: apiBasePath.getAsStringDangerous(),
                    appName,
                    backendSDKName: "supertokens-node",
                    backendSDKVersion: SDKVersion,
                    dashboardVersion,
                    // These can be undefined and will be skipped if not present
                    email,
                    telemetryId,
                    numberOfUsers,
                },
                headers: {
                    "api-version": 2,
                },
            });

            if (response.status === 200) {
                break;
            }
        } catch (_) {
            // ignored
        }
    }

    return {
        status: "OK",
    };
}
