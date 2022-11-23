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
const recipeModule_1 = require("../../recipeModule");
const __1 = require("../..");
class AccountLinkingRecipe extends recipeModule_1.default {
    constructor() {
        // recipeInterfaceImpl: RecipeInterface; TODO
        super(...arguments);
        this.isSignUpAllowed = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield __1.default.getUserByAccountInfo(input);
                if (user === undefined || !user.isPrimaryUser) {
                    return true;
                }
                let shouldRequireVerification = false; // TOOD: call shouldRequireVerification from config
                if (!shouldRequireVerification) {
                    return true;
                }
                // /**
                //  * for each linked recipes, get all the verified identifying info
                //  *
                //  * if the input identifyingInfo is found in the above generated list
                //  * of verified identifyingInfos, return true else false.
                //  */
                return true;
            });
        this.createPrimaryUserIdOrLinkAccountPostSignUp = (_input) =>
            __awaiter(this, void 0, void 0, function* () {
                // TODO
            });
        this.accountLinkPostSignInViaSession = (_input) =>
            __awaiter(this, void 0, void 0, function* () {
                // let userId = session.getUserId();
                return {
                    createRecipeUser: true,
                };
            });
    }
    getAPIsHandled() {
        throw new Error("Method not implemented.");
    }
    handleAPIRequest(_id, _req, _response, _path, _method) {
        throw new Error("Method not implemented.");
    }
    handleError(_error, _request, _response) {
        throw new Error("Method not implemented.");
    }
    getAllCORSHeaders() {
        throw new Error("Method not implemented.");
    }
    isErrorFromThisRecipe(_err) {
        throw new Error("Method not implemented.");
    }
}
exports.default = AccountLinkingRecipe;
