"use strict";
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
const utils_1 = require("../../../utils");
const error_1 = require("../error");
const session_1 = require("../../session");
function emailVerify(recipeInstance, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (utils_1.normaliseHttpMethod(req.method) === "post") {
            // Logic according to Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106
            // step 1
            let token = req.body.token;
            if (token === undefined) {
                throw new error_1.default(
                    {
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: "Please provide the email verification token",
                    },
                    recipeInstance.getRecipeId()
                );
            }
            if (typeof token !== "string") {
                throw new error_1.default(
                    {
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: "The email verification token must be a string",
                    },
                    recipeInstance.getRecipeId()
                );
            }
            yield recipeInstance.verifyEmailUsingToken(token);
            // step 2
            return utils_1.send200Response(res, {
                status: "OK",
            });
        } else {
            // Logic as per https://github.com/supertokens/supertokens-node/issues/62#issuecomment-751616106
            // step 1.
            yield new Promise((resolve, reject) =>
                session_1.default.verifySession()(req, res, (err) => {
                    if (err !== undefined) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            );
            let session = req.session;
            let userId = session.getUserId();
            // step 2.
            let isVerified = yield recipeInstance.isEmailVerified(userId);
            // step 3
            return utils_1.send200Response(res, {
                status: "OK",
                isVerified,
            });
        }
    });
}
exports.default = emailVerify;
//# sourceMappingURL=emailVerify.js.map
