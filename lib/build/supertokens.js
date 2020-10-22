"use strict";
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const utils_1 = require("./utils");
const querier_1 = require("./querier");
class SuperTokens {
    constructor(config) {
        try {
            this.appInfo = utils_1.normaliseInputAppInfo(config.appInfo);
            querier_1.Querier.init(
                config.supertokens.connectionURI.split(";").map((h) => utils_1.normaliseURLDomainOrThrowError(h)),
                config.supertokens.apiKey
            );
            config.recipeList.forEach((func) => {
                func(this.appInfo);
            });
        } catch (err) {
            if (error_1.default.isErrorFromSuperTokens(err)) {
                throw err;
            }
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                rId: "",
                payload: err,
            });
        }
    }
    static init(config) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
        } else {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                rId: "",
                payload: new Error("SuperTokens has already been initialised. Please check your code for bugs."),
            });
        }
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                rId: "",
                message: "calling testing function in non testing env",
            });
        }
        querier_1.Querier.reset();
        SuperTokens.instance = undefined;
    }
}
exports.default = SuperTokens;
//# sourceMappingURL=supertokens.js.map
