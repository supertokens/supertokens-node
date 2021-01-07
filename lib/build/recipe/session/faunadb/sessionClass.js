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
const sessionClass_1 = require("../sessionClass");
const constants_1 = require("./constants");
class Session extends sessionClass_1.default {
    constructor(recipeInstance, accessToken, sessionHandle, userId, userDataInJWT, res) {
        super(recipeInstance, accessToken, sessionHandle, userId, userDataInJWT, res);
        this.getFaunadbToken = () =>
            __awaiter(this, void 0, void 0, function* () {
                let jwtPayload = this.getJWTPayload();
                if (jwtPayload[constants_1.FAUNADB_SESSION_KEY] !== undefined) {
                    // this operation costs nothing. So we can check
                    return jwtPayload[constants_1.FAUNADB_SESSION_KEY];
                } else {
                    let sessionData = yield this.getSessionData();
                    return sessionData[constants_1.FAUNADB_SESSION_KEY];
                }
            });
    }
}
exports.default = Session;
//# sourceMappingURL=sessionClass.js.map
