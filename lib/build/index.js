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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Error = exports.getRequestFromUserContext = exports.updateOrDeleteUserIdMappingInfo = exports.deleteUserIdMapping = exports.getUserIdMapping = exports.createUserIdMapping = exports.deleteUser = exports.getUsersNewestFirst = exports.getUsersOldestFirst = exports.getUserCount = exports.getAllCORSHeaders = exports.init = void 0;
const supertokens_1 = __importDefault(require("./supertokens"));
const error_1 = __importDefault(require("./error"));
// For Express
class SuperTokensWrapper {
    static getAllCORSHeaders() {
        return supertokens_1.default.getInstanceOrThrowError().getAllCORSHeaders();
    }
    static getUserCount(includeRecipeIds, tenantId) {
        return supertokens_1.default.getInstanceOrThrowError().getUserCount(includeRecipeIds, tenantId);
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
    static createUserIdMapping(input) {
        return supertokens_1.default.getInstanceOrThrowError().createUserIdMapping(input);
    }
    static getUserIdMapping(input) {
        return supertokens_1.default.getInstanceOrThrowError().getUserIdMapping(input);
    }
    static deleteUserIdMapping(input) {
        return supertokens_1.default.getInstanceOrThrowError().deleteUserIdMapping(input);
    }
    static updateOrDeleteUserIdMappingInfo(input) {
        return supertokens_1.default.getInstanceOrThrowError().updateOrDeleteUserIdMappingInfo(input);
    }
    static getRequestFromUserContext(userContext) {
        return supertokens_1.default.getInstanceOrThrowError().getRequestFromUserContext(userContext);
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
exports.createUserIdMapping = SuperTokensWrapper.createUserIdMapping;
exports.getUserIdMapping = SuperTokensWrapper.getUserIdMapping;
exports.deleteUserIdMapping = SuperTokensWrapper.deleteUserIdMapping;
exports.updateOrDeleteUserIdMappingInfo = SuperTokensWrapper.updateOrDeleteUserIdMappingInfo;
exports.getRequestFromUserContext = SuperTokensWrapper.getRequestFromUserContext;
exports.Error = SuperTokensWrapper.Error;
