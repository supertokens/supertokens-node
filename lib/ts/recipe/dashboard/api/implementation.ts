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

import NormalisedURLDomain from "../../../normalisedURLDomain";
import NormalisedURLPath from "../../../normalisedURLPath";
import { Querier } from "../../../querier";
import SuperTokens from "../../../supertokens";
import EmailPassword from "../../../recipe/emailpassword/recipe";
import Passwordless from "../../../recipe/passwordless/recipe";
import ThirdParty from "../../../recipe/thirdparty/recipe";
import ThirdPartyEmailPassword from "../../../recipe/thirdpartyemailpassword/recipe";
import ThirdPartyPasswordless from "../../../recipe/thirdpartypasswordless/recipe";
import { maxVersion } from "../../../utils";
import { DASHBOARD_API } from "../constants";
import { APIInterface, AuthMode } from "../types";

export default function getAPIImplementation(): APIInterface {
    return {
        dashboardGET: async function (input) {
            const bundleBasePathString = await input.options.recipeImplementation.getDashboardBundleLocation({
                userContext: input.userContext,
            });

            const bundleDomain =
                new NormalisedURLDomain(bundleBasePathString).getAsStringDangerous() +
                new NormalisedURLPath(bundleBasePathString).getAsStringDangerous();

            let connectionURI: string = "";
            const superTokensInstance = SuperTokens.getInstanceOrThrowError();

            const authMode: AuthMode = input.options.config.authMode;

            if (superTokensInstance.supertokens !== undefined) {
                connectionURI = new NormalisedURLDomain(
                    superTokensInstance.supertokens.connectionURI.split(";")[0]
                ).getAsStringDangerous();
            }

            let isSearchEnabled = false;
            const cdiVersion = await Querier.getNewInstanceOrThrowError(input.options.recipeId).getAPIVersion();
            if (maxVersion("2.20", cdiVersion) === cdiVersion) {
                // Only enable search if CDI version is 2.20 or above
                isSearchEnabled = true;
            }

            const loginMethods = {
                emailPassword: false,
                passwordless: {
                    enabled: false,
                    contactMethod: "",
                    flowType: "",
                },
                thirdParty: false,
            };

            try {
                EmailPassword.getInstanceOrThrowError();
                loginMethods.emailPassword = true;
            } catch (_) {}

            try {
                const instance = Passwordless.getInstanceOrThrowError();
                loginMethods.passwordless = {
                    enabled: true,
                    contactMethod: instance.config.contactMethod,
                    flowType: instance.config.flowType,
                };
            } catch (_) {}

            try {
                ThirdParty.getInstanceOrThrowError();
                loginMethods.thirdParty = true;
            } catch (_) {}

            try {
                ThirdPartyEmailPassword.getInstanceOrThrowError();
                loginMethods.thirdParty = true;
                loginMethods.emailPassword = true;
            } catch (_) {}

            try {
                const instance = ThirdPartyPasswordless.getInstanceOrThrowError();
                loginMethods.thirdParty = true;
                loginMethods.passwordless = {
                    enabled: true,
                    contactMethod: instance.config.contactMethod,
                    flowType: instance.config.flowType,
                };
            } catch (_) {}

            return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script>
                        window.staticBasePath = "${bundleDomain}/static"
                        window.dashboardAppPath = "${input.options.appInfo.apiBasePath
                            .appendPath(new NormalisedURLPath(DASHBOARD_API))
                            .getAsStringDangerous()}"
                        window.connectionURI = "${connectionURI}"
                        window.authMode = "${authMode}"
                        window.isSearchEnabled = "${isSearchEnabled}"
                        window.loginMethods = ${JSON.stringify(loginMethods)}
                    </script>
                    <script defer src="${bundleDomain}/static/js/bundle.js"></script></head>
                    <link href="${bundleDomain}/static/css/main.css" rel="stylesheet" type="text/css">
                    <link rel="icon" type="image/x-icon" href="${bundleDomain}/static/media/favicon.ico">
                </head>
                <body>
                    <noscript>You need to enable JavaScript to run this app.</noscript>
                    <div id="root"></div>
                </body>
            </html>
            `;
        },
    };
}
