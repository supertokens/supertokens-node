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
const implementation_1 = require("../thirdparty/api/implementation");
function isUsingDevelopmentClientId(recipeModules) {
    var recipeModules_1, recipeModules_1_1;
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        let isUsingDevelopmentClientId = false;
        try {
            for (
                recipeModules_1 = __asyncValues(recipeModules);
                (recipeModules_1_1 = yield recipeModules_1.next()), !recipeModules_1_1.done;

            ) {
                const recipeModule = recipeModules_1_1.value;
                if (
                    recipeModule.getRecipeId() === "thirdparty" ||
                    recipeModule.getRecipeId() === "thirdpartyemailpassword"
                ) {
                    if (recipeModule.getClientIds) {
                        let clientIds = yield recipeModule.getClientIds();
                        clientIds.forEach((clientId) => {
                            if (clientId.startsWith(implementation_1.DEV_KEY_IDENTIFIER)) {
                                isUsingDevelopmentClientId = true;
                            }
                        });
                    }
                }
            }
        } catch (e_1_1) {
            e_1 = { error: e_1_1 };
        } finally {
            try {
                if (recipeModules_1_1 && !recipeModules_1_1.done && (_a = recipeModules_1.return))
                    yield _a.call(recipeModules_1);
            } finally {
                if (e_1) throw e_1.error;
            }
        }
        return isUsingDevelopmentClientId;
    });
}
exports.isUsingDevelopmentClientId = isUsingDevelopmentClientId;
