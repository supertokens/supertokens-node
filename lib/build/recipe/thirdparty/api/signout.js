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
const session_1 = require("../../session");
const utils_1 = require("../../../utils");
function signOutAPI(recipeInstance, req, res, __) {
    return __awaiter(this, void 0, void 0, function* () {
        // step 1
        let session;
        try {
            session = yield session_1.default.getSession(req, res);
        } catch (err) {
            if (
                session_1.default.Error.isErrorFromSuperTokens(err) &&
                err.type === session_1.default.Error.UNAUTHORISED
            ) {
                // The session is expired / does not exist anyway. So we return OK
                return utils_1.send200Response(res, {
                    status: "OK",
                });
            }
            throw err;
        }
        if (session === undefined) {
            throw new session_1.default.Error(
                {
                    type: session_1.default.Error.GENERAL_ERROR,
                    payload: new Error("Session is undefined. Should not come here."),
                },
                recipeInstance
            );
        }
        // step 2
        yield session.revokeSession();
        // step 3
        return utils_1.send200Response(res, {
            status: "OK",
        });
    });
}
exports.default = signOutAPI;
//# sourceMappingURL=signout.js.map
