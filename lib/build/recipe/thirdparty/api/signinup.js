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
const error_1 = require("../error");
const utils_1 = require("../../../utils");
const axios = require("axios");
const qs = require("querystring");
const session_1 = require("../../session");
function signInUpAPI(recipeInstance, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        let bodyParams = req.body;
        let thirdPartyId = bodyParams.thirdPartyId;
        let code = bodyParams.code;
        let redirectURI = bodyParams.redirectURI;
        if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
            throw new error_1.default(
                {
                    type: error_1.default.BAD_INPUT_ERROR,
                    message: "Please provide the thirdPartyId in request body",
                },
                recipeInstance.getRecipeId()
            );
        }
        if (code === undefined || typeof code !== "string") {
            throw new error_1.default(
                {
                    type: error_1.default.BAD_INPUT_ERROR,
                    message: "Please provide the code in request body",
                },
                recipeInstance.getRecipeId()
            );
        }
        if (redirectURI === undefined || typeof redirectURI !== "string") {
            throw new error_1.default(
                {
                    type: error_1.default.BAD_INPUT_ERROR,
                    message: "Please provide the redirectURI in request body",
                },
                recipeInstance.getRecipeId()
            );
        }
        let provider = recipeInstance.providers.find((p) => p.id === thirdPartyId);
        if (provider === undefined) {
            throw new error_1.default(
                {
                    type: error_1.default.BAD_INPUT_ERROR,
                    message:
                        "The third party provider " +
                        thirdPartyId +
                        " seems to not be configured on the backend. Please check your frontend and backend configs.",
                },
                recipeInstance.getRecipeId()
            );
        }
        let userInfo;
        let accessTokenAPIResponse;
        try {
            let providerInfo = yield provider.get(redirectURI, code);
            accessTokenAPIResponse = yield axios.default({
                method: "post",
                url: providerInfo.accessTokenAPI.url,
                data: qs.stringify(providerInfo.accessTokenAPI.params),
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    accept: "application/json",
                },
            });
            userInfo = yield providerInfo.getProfileInfo(accessTokenAPIResponse.data);
        } catch (err) {
            throw new error_1.default(
                {
                    type: "GENERAL_ERROR",
                    payload: err,
                },
                recipeInstance.getRecipeId()
            );
        }
        let emailInfo = userInfo.email;
        if (emailInfo === undefined) {
            throw new error_1.default(
                {
                    type: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    message: `Provider ${provider.id} returned no email info for the user.`,
                },
                recipeInstance.getRecipeId()
            );
        }
        let user = yield recipeInstance.signInUp(provider.id, userInfo.id, emailInfo);
        yield recipeInstance.config.signInAndUpFeature.handlePostSignUpIn(
            user.user,
            accessTokenAPIResponse.data,
            user.createdNewUser
        );
        let action = user.createdNewUser ? "signup" : "signin";
        let jwtPayloadPromise = recipeInstance.config.sessionFeature.setJwtPayload(
            user.user,
            accessTokenAPIResponse.data,
            action
        );
        let sessionDataPromise = recipeInstance.config.sessionFeature.setSessionData(
            user.user,
            accessTokenAPIResponse.data,
            action
        );
        let jwtPayload = yield jwtPayloadPromise;
        let sessionData = yield sessionDataPromise;
        yield session_1.default.createNewSession(res, user.user.id, jwtPayload, sessionData);
        return utils_1.send200Response(res, Object.assign({ status: "OK" }, user));
    });
}
exports.default = signInUpAPI;
//# sourceMappingURL=signinup.js.map
