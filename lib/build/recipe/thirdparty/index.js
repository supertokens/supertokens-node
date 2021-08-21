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
const recipe_1 = require("./recipe");
const error_1 = require("./error");
const thirdPartyProviders = require("./providers");
// For Express
class Wrapper {
    static signInUp(thirdPartyId, thirdPartyUserId, email) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({
                thirdPartyId,
                thirdPartyUserId,
                email,
            });
            if (result.status === "OK") {
                return result;
            }
            throw new global.Error(result.error);
        });
    }
    static getUserById(userId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId });
    }
    static getUsersByEmail(email) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email });
    }
    static getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
        });
    }
    /**
     * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersOldestFirst(limit, nextPaginationToken) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersOldestFirst({
            limit,
            nextPaginationToken,
        });
    }
    /**
     * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersNewestFirst(limit, nextPaginationToken) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersNewestFirst({
            limit,
            nextPaginationToken,
        });
    }
    /**
     * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
     *   */
    static getUserCount() {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserCount();
    }
    static createEmailVerificationToken(userId) {
        return recipe_1.default.getInstanceOrThrowError().createEmailVerificationToken(userId);
    }
    static verifyEmailUsingToken(token) {
        return recipe_1.default.getInstanceOrThrowError().verifyEmailUsingToken(token);
    }
    static isEmailVerified(userId) {
        return recipe_1.default.getInstanceOrThrowError().isEmailVerified(userId);
    }
    static revokeEmailVerificationTokens(userId, email) {
        return __awaiter(this, void 0, void 0, function* () {
            yield recipe_1.default
                .getInstanceOrThrowError()
                .emailVerificationRecipe.recipeInterfaceImpl.revokeEmailVerificationTokens({ userId, email });
        });
    }
    static unverifyEmail(userId, email) {
        return __awaiter(this, void 0, void 0, function* () {
            yield recipe_1.default
                .getInstanceOrThrowError()
                .emailVerificationRecipe.recipeInterfaceImpl.unverifyEmail({ userId, email });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
Wrapper.Google = thirdPartyProviders.Google;
Wrapper.Github = thirdPartyProviders.Github;
Wrapper.Facebook = thirdPartyProviders.Facebook;
Wrapper.Apple = thirdPartyProviders.Apple;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.signInUp = Wrapper.signInUp;
exports.getUserById = Wrapper.getUserById;
exports.getUsersByEmail = Wrapper.getUsersByEmail;
exports.getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
exports.revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;
exports.unverifyEmail = Wrapper.unverifyEmail;
/**
 * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
 *   */
exports.getUsersOldestFirst = Wrapper.getUsersOldestFirst;
/**
 * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
 *   */
exports.getUsersNewestFirst = Wrapper.getUsersNewestFirst;
/**
 * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
 *   */
exports.getUserCount = Wrapper.getUserCount;
exports.Google = Wrapper.Google;
exports.Github = Wrapper.Github;
exports.Facebook = Wrapper.Facebook;
exports.Apple = Wrapper.Apple;
//# sourceMappingURL=index.js.map
