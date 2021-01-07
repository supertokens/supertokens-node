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
function generateEmailVerifyToken(recipeInstance, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
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
        let user = yield recipeInstance.getUserById(userId);
        if (user === undefined) {
            throw new error_1.default(
                {
                    type: error_1.default.UNKNOWN_USER_ID_ERROR,
                    message: "Failed to generated email verification token as the user ID is unknown",
                },
                recipeInstance.getRecipeId()
            );
        }
        // step 2
        let token;
        try {
            token = yield recipeInstance.createEmailVerificationToken(user.id);
        } catch (err) {
            if (
                error_1.default.isErrorFromSuperTokens(err) &&
                err.type === error_1.default.EMAIL_ALREADY_VERIFIED_ERROR
            ) {
                return utils_1.send200Response(res, {
                    status: "OK",
                });
            }
            throw err;
        }
        // step 3
        let emailVerifyLink =
            (yield recipeInstance.config.emailVerificationFeature.getEmailVerificationURL(user)) +
            "?token=" +
            token +
            "&rid=" +
            recipeInstance.getRecipeId();
        // step 4
        utils_1.send200Response(res, {
            status: "OK",
        });
        // step 5 & 6
        try {
            yield recipeInstance.config.emailVerificationFeature.createAndSendCustomEmail(user, emailVerifyLink);
        } catch (ignored) {}
    });
}
exports.default = generateEmailVerifyToken;
//# sourceMappingURL=generateEmailVerifyToken.js.map
