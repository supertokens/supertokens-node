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
const normalisedURLPath_1 = require("../../normalisedURLPath");
const error_1 = require("./error");
function createEmailVerificationToken(recipeInstance, userId, email) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(
                new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/user/email/verify/token"),
                {
                    userId,
                    email,
                }
            );
        if (response.status === "OK") {
            return response.token;
        } else {
            throw new error_1.default(
                {
                    type: error_1.default.EMAIL_ALREADY_VERIFIED_ERROR,
                    message: "Failed to generated email verification token as the user ID is unknown",
                },
                recipeInstance.getRecipeId()
            );
        }
    });
}
exports.createEmailVerificationToken = createEmailVerificationToken;
function verifyEmailUsingToken(recipeInstance, token) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(
                new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/user/email/verify"),
                {
                    method: "token",
                    token,
                }
            );
        if (response.status === "OK") {
            return Object.assign({}, response.user);
        } else {
            throw new error_1.default(
                {
                    type: error_1.default.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR,
                    message: "Failed to verify email as the the token has expired or is invalid",
                },
                recipeInstance.getRecipeId()
            );
        }
    });
}
exports.verifyEmailUsingToken = verifyEmailUsingToken;
function isEmailVerified(recipeInstance, userId, email) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(
                new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/user/email/verify"),
                {
                    userId,
                    email,
                }
            );
        return response.isVerified;
    });
}
exports.isEmailVerified = isEmailVerified;
//# sourceMappingURL=coreAPICalls.js.map
