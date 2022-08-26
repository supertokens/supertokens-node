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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLDomain_1 = require("../../../normalisedURLDomain");
const normalisedURLPath_1 = require("../../../normalisedURLPath");
const supertokens_1 = require("../../../supertokens");
const constants_1 = require("../constants");
function getAPIImplementation() {
    return {
        dashboardGET: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const bundleBasePathString = yield input.options.recipeImplementation.getDashboardBundleLocation({
                    userContext: input.userContext,
                });
                const bundleDomain =
                    new normalisedURLDomain_1.default(bundleBasePathString).getAsStringDangerous() +
                    new normalisedURLPath_1.default(bundleBasePathString).getAsStringDangerous();
                let connectionURI = "";
                const superTokensInstance = supertokens_1.default.getInstanceOrThrowError();
                if (superTokensInstance.supertokens !== undefined) {
                    connectionURI = superTokensInstance.supertokens.connectionURI;
                }
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
            });
        },
    };
}
exports.default = getAPIImplementation;
