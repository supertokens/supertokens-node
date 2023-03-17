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
import SuperTokens from "../../../supertokens";
import { DASHBOARD_API } from "../constants";
import { APIInterface, AuthMode } from "../types";
import { version as SDKVersion } from "../../../version";
import { Querier } from "../../../querier";

type TelemetryAPIResponse =
    | {
          exists: false;
      }
    | {
          exists: true;
          telemetryId: string;
      };

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
                connectionURI = superTokensInstance.supertokens.connectionURI;
            }

            let telemetryId = "";
            try {
                let querier = Querier.getNewInstanceOrThrowError(input.options.recipeId);
                const response = await querier.sendGetRequest<TelemetryAPIResponse>(
                    new NormalisedURLPath("/telemetry"),
                    {}
                );

                if (response.exists === true) {
                    telemetryId = response.telemetryId;
                }
            } catch (_) {
                telemetryId = "failed";
            }

            const { apiDomain, apiBasePath, websiteDomain, websiteBasePath, appName } = input.options.appInfo;

            return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script>
                        window.staticBasePath = "${bundleDomain}/static"
                        window.dashboardAppPath = "${apiBasePath
                            .appendPath(new NormalisedURLPath(DASHBOARD_API))
                            .getAsStringDangerous()}"
                        window.connectionURI = "${connectionURI}"
                        window.authMode = "${authMode}"
                        window.analyticsInfo = {
                            apiDomain: "${apiDomain.getAsStringDangerous()}",
                            apiBasePath: "${apiBasePath.getAsStringDangerous()}",
                            websiteDomain: "${websiteDomain.getAsStringDangerous()}",
                            websiteBasePath: "${websiteBasePath.getAsStringDangerous()}",
                            appName: "${appName}",
                            backendSDKName: "supertokens-node",
                            backendSDKVersion: "${SDKVersion}",
                            coreTelemetryId: "${telemetryId}"
                        }
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
