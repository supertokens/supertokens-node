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

import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import { dashboardVersion } from "../../version";
import { RecipeInterface } from "./types";
import { validateApiKey } from "./utils";
import RecipeError from "./error";
import { logDebugMessage } from "../../logger";
import { DASHBOARD_ANALYTICS_API } from "./constants";

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
                if (input.req.getMethod() !== "get") {
                    // We dont want to block the analytics API
                    if (input.req.getOriginalURL().endsWith(DASHBOARD_ANALYTICS_API)) {
                        return true;
                    }

                    const admins = input.config.admins;

                    // If the user has provided no admins, allow
                    if (admins.length === 0) {
                        return true;
                    }

                    const emailFromResponse = sessionVerificationResponse.email;

                    // This is possible if they are using an older core, in which case we log and fail
                    if (emailFromResponse === undefined) {
                        // TODO NEMI: Should we provide a minimum supported version here?
                        logDebugMessage(
                            "User Dashboard: You are using an older version of SuperTokens core, to use the 'admins' property when initialising the Dashboard recipe please upgrade to the latest SuperTokens core version."
                        );
                        throw new RecipeError();
                    }

                    // Allow only if the email is present in the admin list
                    if (!admins.includes(emailFromResponse)) {
                        throw new RecipeError();
                    }
                }

                return true;
            }
            return await validateApiKey(input);
        },
    };
}
