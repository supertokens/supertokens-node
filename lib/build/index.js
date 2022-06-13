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
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = require("./supertokens");
const error_1 = require("./error");
// For Express
class SuperTokensWrapper {
    static getAllCORSHeaders() {
        return supertokens_1.default.getInstanceOrThrowError().getAllCORSHeaders();
    }
    static getUserCount(includeRecipeIds) {
        return supertokens_1.default.getInstanceOrThrowError().getUserCount(includeRecipeIds);
    }
    static getUsersOldestFirst(input) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .getUsers(Object.assign({ timeJoinedOrder: "ASC" }, input));
    }
    static getUsersNewestFirst(input) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .getUsers(Object.assign({ timeJoinedOrder: "DESC" }, input));
    }
    static deleteUser(userId) {
        return supertokens_1.default.getInstanceOrThrowError().deleteUser({
            userId,
        });
    }
}
exports.default = SuperTokensWrapper;
SuperTokensWrapper.init = supertokens_1.default.init;
SuperTokensWrapper.Error = error_1.default;
exports.init = SuperTokensWrapper.init;
exports.getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders;
exports.getUserCount = SuperTokensWrapper.getUserCount;
exports.getUsersOldestFirst = SuperTokensWrapper.getUsersOldestFirst;
exports.getUsersNewestFirst = SuperTokensWrapper.getUsersNewestFirst;
exports.deleteUser = SuperTokensWrapper.deleteUser;
exports.Error = SuperTokensWrapper.Error;
