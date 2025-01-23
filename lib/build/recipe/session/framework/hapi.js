"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySession = verifySession;
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
const supertokens_1 = __importDefault(require("../../../supertokens"));
const recipe_1 = __importDefault(require("../recipe"));
const framework_1 = require("../../../framework/hapi/framework");
const utils_1 = require("../../../utils");
function verifySession(options) {
    return async (req, h) => {
        let sessionRecipe = recipe_1.default.getInstanceOrThrowError();
        let request = new framework_1.HapiRequest(req);
        let response = new framework_1.HapiResponse(h);
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            req.session = await sessionRecipe.verifySession(options, request, response, userContext);
        } catch (err) {
            try {
                const supertokens = supertokens_1.default.getInstanceOrThrowError();
                await supertokens.errorHandler(err, request, response, userContext);
                if (response.responseSet) {
                    let resObj = response.sendResponse(true);
                    (req.app.lazyHeaders || []).forEach(({ key, value, allowDuplicateKey }) => {
                        resObj.header(key, value, { append: allowDuplicateKey });
                    });
                    return resObj.takeover();
                }
            } catch (_a) {
                // We catch and ignore since we want to re-throw the original error if handling wasn't successful
                throw err;
            }
        }
        return h.continue;
    };
}
