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

import { APIInterface } from "../types";

export default function getAPIImplementation(): APIInterface {
    return {
        dashboardGET: async function (input) {
            const bundleDomain = await input.options.recipeImplementation.getDashboardBundleDomain({
                userContext: input.userContext,
            });

            return `
            <html>
                <head>
                    <script>
                        window.staticBasePath = "${bundleDomain}/static/"
                    </script>
                    <script defer src="${bundleDomain}/static/js/bundle.js"></script></head>
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
