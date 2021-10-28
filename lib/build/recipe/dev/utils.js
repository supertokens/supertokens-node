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
var __asyncValues =
    (this && this.__asyncValues) ||
    function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator],
            i;
        return m
            ? m.call(o)
            : ((o = typeof __values === "function" ? __values(o) : o[Symbol.iterator]()),
              (i = {}),
              verb("next"),
              verb("throw"),
              verb("return"),
              (i[Symbol.asyncIterator] = function () {
                  return this;
              }),
              i);
        function verb(n) {
            i[n] =
                o[n] &&
                function (v) {
                    return new Promise(function (resolve, reject) {
                        (v = o[n](v)), settle(resolve, reject, v.done, v.value);
                    });
                };
        }
        function settle(resolve, reject, d, v) {
            Promise.resolve(v).then(function (v) {
                resolve({ value: v, done: d });
            }, reject);
        }
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
    "467101b197249757c71f",
];
const DEV_KEY_IDENTIFIER = "4398792-";
function isUsingDevelopmentClientId() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            for (
                var clientIdsForDevRecipe_1 = __asyncValues(utils_1.clientIdsForDevRecipe), clientIdsForDevRecipe_1_1;
                (clientIdsForDevRecipe_1_1 = yield clientIdsForDevRecipe_1.next()), !clientIdsForDevRecipe_1_1.done;

            ) {
                const clientId = clientIdsForDevRecipe_1_1.value;
                if (clientId.startsWith(DEV_KEY_IDENTIFIER) || DEV_OAUTH_CLIENT_IDS.includes(clientId)) {
                    return true;
                }
            }
        } catch (e_1_1) {
            e_1 = { error: e_1_1 };
        } finally {
            try {
                if (
                    clientIdsForDevRecipe_1_1 &&
                    !clientIdsForDevRecipe_1_1.done &&
                    (_a = clientIdsForDevRecipe_1.return)
                )
                    yield _a.call(clientIdsForDevRecipe_1);
            } finally {
                if (e_1) throw e_1.error;
            }
        }
        return false;
    });
}
exports.isUsingDevelopmentClientId = isUsingDevelopmentClientId;
