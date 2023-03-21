"use strict";
/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const querier_1 = require("../../../querier");
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
function signOut(_, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const sessionIdFormAuthHeader =
            (_a = options.req.getHeaderValue("authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
        const sessionDeleteResponse = yield querier.sendDeleteRequest(
            new normalisedURLPath_1.default("/recipe/dashboard/session"),
            {},
            { sessionId: sessionIdFormAuthHeader }
        );
        utils_1.send200Response(options.res, sessionDeleteResponse);
        return true;
    });
}
exports.default = signOut;
