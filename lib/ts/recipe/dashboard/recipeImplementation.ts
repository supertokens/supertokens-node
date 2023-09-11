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

import RecipeError from "./error";
import { logDebugMessage } from "../../logger";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import { normaliseHttpMethod } from "../../utils";
import { dashboardVersion } from "../../version";
import { DASHBOARD_ANALYTICS_API, SIGN_OUT_API } from "./constants";
import { RecipeInterface } from "./types";
import { validateApiKey } from "./utils";

export default function getRecipeImplementation(): RecipeInterface {
    return {
        getDashboardBundleLocation: async function () {
            return `https://cdn.jsdelivr.net/gh/supertokens/dashboard@v${dashboardVersion}/build/`;
        },
        shouldAllowAccess: async function (input) {
            // For cases where we're not using the API key, the JWT is being used; we allow their access by default
            if (!input.config.apiKey) {
                // make the check for the API endpoint here with querier
                let querier = Querier.getNewInstanceOrThrowError(undefined);
                const authHeaderValue = input.req.getHeaderValue("authorization")?.split(" ")[1];
                const sessionVerificationResponse = await querier.sendPostRequest(
                    new NormalisedURLPath("/recipe/dashboard/session/verify"),
                    {
                        sessionId: authHeaderValue,
                    }
                );

                if (sessionVerificationResponse.status !== "OK") {
                    return false;
                }

                // For all non GET requests we also want to check if the user is allowed to perform this operation
                if (normaliseHttpMethod(input.req.getMethod()) !== "get") {
                    // We dont want to block the analytics API
                    if (input.req.getOriginalURL().endsWith(DASHBOARD_ANALYTICS_API)) {
                        return true;
                    }

                    // We do not want to block the sign out request
                    if (input.req.getOriginalURL().endsWith(SIGN_OUT_API)) {
                        return true;
                    }

                    const admins = input.config.admins;

                    if (admins === undefined) {
                        return true;
                    }

                    if (admins.length === 0) {
                        logDebugMessage("User Dashboard: Throwing OPERATION_NOT_ALLOWED because user is not an admin");
                        throw new RecipeError();
                    }

                    const userEmail = sessionVerificationResponse.email;

                    if (userEmail === undefined || typeof userEmail !== "string") {
                        logDebugMessage(
                            "User Dashboard: Returning Unauthorised because no email was provided in headers"
                        );
                        return false;
                    }

                    if (!admins.includes(userEmail)) {
                        logDebugMessage("User Dashboard: Throwing OPERATION_NOT_ALLOWED because user is not an admin");
                        throw new RecipeError();
                    }
                }

                return true;
            }
            return await validateApiKey(input);
        },
    };
}
