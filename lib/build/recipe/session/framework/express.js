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
const recipe_1 = __importDefault(require("../recipe"));
const framework_1 = require("../../../framework/express/framework");
const supertokens_1 = __importDefault(require("../../../supertokens"));
const utils_1 = require("../../../utils");
function verifySession(options) {
    return async (req, res, next) => {
        const request = new framework_1.ExpressRequest(req);
        const response = new framework_1.ExpressResponse(res);
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            const sessionRecipe = recipe_1.default.getInstanceOrThrowError();
            req.session = await sessionRecipe.verifySession(options, request, response, userContext);
            next();
        } catch (err) {
            try {
                const supertokens = supertokens_1.default.getInstanceOrThrowError();
                await supertokens.errorHandler(err, request, response, userContext);
            } catch (_a) {
                next(err);
            }
        }
    };
}
