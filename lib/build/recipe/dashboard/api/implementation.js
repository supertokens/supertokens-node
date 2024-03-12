"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLDomain_1 = __importDefault(require("../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const querier_1 = require("../../../querier");
const supertokens_1 = __importDefault(require("../../../supertokens"));
const recipe_1 = __importDefault(require("../../../recipe/emailpassword/recipe"));
const recipe_2 = __importDefault(require("../../../recipe/passwordless/recipe"));
const recipe_3 = __importDefault(require("../../../recipe/thirdparty/recipe"));
const recipe_4 = __importDefault(require("../../../recipe/thirdpartyemailpassword/recipe"));
const recipe_5 = __importDefault(require("../../../recipe/thirdpartypasswordless/recipe"));
const utils_1 = require("../../../utils");
const constants_1 = require("../constants");
function getAPIImplementation() {
    return {
        dashboardGET: async function (input) {
            const bundleBasePathString = await input.options.recipeImplementation.getDashboardBundleLocation({
                userContext: input.userContext,
            });
            const bundleDomain =
                new normalisedURLDomain_1.default(bundleBasePathString).getAsStringDangerous() +
                new normalisedURLPath_1.default(bundleBasePathString).getAsStringDangerous();
            let connectionURI = "";
            const superTokensInstance = supertokens_1.default.getInstanceOrThrowError();
            const authMode = input.options.config.authMode;
            if (superTokensInstance.supertokens !== undefined) {
                connectionURI = new normalisedURLDomain_1.default(
                    superTokensInstance.supertokens.connectionURI.split(";")[0]
                ).getAsStringDangerous();
            }
            let isSearchEnabled = false;
            const cdiVersion = await querier_1.Querier.getNewInstanceOrThrowError(
                input.options.recipeId
            ).getAPIVersion();
            if (utils_1.maxVersion("2.20", cdiVersion) === cdiVersion) {
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
                recipe_1.default.getInstanceOrThrowError();
                loginMethods.emailPassword = true;
            } catch (_) {}
            try {
                const instance = recipe_2.default.getInstanceOrThrowError();
                loginMethods.passwordless = {
                    enabled: true,
                    contactMethod: instance.config.contactMethod,
                    flowType: instance.config.flowType,
                };
            } catch (_) {}
            try {
                recipe_3.default.getInstanceOrThrowError();
                loginMethods.thirdParty = true;
            } catch (_) {}
            try {
                recipe_4.default.getInstanceOrThrowError();
                loginMethods.thirdParty = true;
                loginMethods.emailPassword = true;
            } catch (_) {}
            try {
                const instance = recipe_5.default.getInstanceOrThrowError();
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
                            .appendPath(new normalisedURLPath_1.default(constants_1.DASHBOARD_API))
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
exports.default = getAPIImplementation;
