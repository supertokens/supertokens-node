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
exports.default = getAPIImplementation;
const normalisedURLDomain_1 = __importDefault(require("../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const querier_1 = require("../../../querier");
const supertokens_1 = __importDefault(require("../../../supertokens"));
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
                connectionURI =
                    new normalisedURLDomain_1.default(
                        superTokensInstance.supertokens.connectionURI.split(";")[0]
                    ).getAsStringDangerous() +
                    new normalisedURLPath_1.default(
                        superTokensInstance.supertokens.connectionURI.split(";")[0]
                    ).getAsStringDangerous();
            }
            let isSearchEnabled = false;
            const cdiVersion = await querier_1.Querier.getNewInstanceOrThrowError(input.options.recipeId).getAPIVersion(
                input.userContext
            );
            if ((0, utils_1.maxVersion)("2.20", cdiVersion) === cdiVersion) {
                // Only enable search if CDI version is 2.20 or above
                isSearchEnabled = true;
            }
            const htmlContent = `
            '<div class="csp-screen-container">' +
            '<div>' +
            '<p>It looks like you have encountered a <u>Content Security Policy (CSP) </u> violation while trying to load a resource. Here is the breakdown of the details:</p>' +
            '<span class="csp-screen-point"><strong>Blocked URI:</strong> ' + event.blockedURI + '<br></span>' +
            '<span class="csp-screen-point"><strong>Violated Directive:</strong> ' + event.violatedDirective + '<br></span>' +
            '<span class="csp-screen-point"><strong>Original Policy:</strong> ' + event.originalPolicy + '<br></span>' +
            '<p>To resolve this issue, you will need to update your CSP configuration to allow the blocked URI.</p>' +
            '</div>' +
            '</div>'`;
            return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script>
                        window.addEventListener('securitypolicyviolation', function (event) {
                            const root = document.getElementById("root");
                            root.innerHTML = ${htmlContent}
                        });
                        window.staticBasePath = "${bundleDomain}/static"
                        window.dashboardAppPath = "${input.options.appInfo.apiBasePath
                            .appendPath(new normalisedURLPath_1.default(constants_1.DASHBOARD_API))
                            .getAsStringDangerous()}"
                        window.connectionURI = "${connectionURI}"
                        window.authMode = "${authMode}"
                        window.isSearchEnabled = "${isSearchEnabled}"
                    </script>
                    
                    <style>
                        .csp-screen-container{
                            display: flex;
                            height: 100vh;
                            align-items: center;
                            justify-content: center;
                            max-width: 480px;
                            margin: auto;

                            font-size: 16px;
                        }
                        .csp-screen-point{
                            display: inline-block;
                            margin: 4px 0px;
                        }
                    </style>

                    <script defer src="${bundleDomain}/static/js/bundle.js"></script>
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
