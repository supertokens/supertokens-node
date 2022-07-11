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
const utils_2 = require("../utils");
const utils_3 = require("../../../utils");
function signInUpAPI(apiImplementation, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (apiImplementation.signInUpPOST === undefined) {
            return false;
        }
        let bodyParams = yield options.req.getJSONBody();
        let thirdPartyId = bodyParams.thirdPartyId;
        let code = bodyParams.code === undefined ? "" : bodyParams.code;
        let redirectURI = bodyParams.redirectURI;
        let authCodeResponse = bodyParams.authCodeResponse;
        let clientId = bodyParams.clientId;
        if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide the thirdPartyId in request body",
            });
        }
        if (typeof code !== "string") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please make sure that the code in the request body is a string",
            });
        }
        if (code === "" && authCodeResponse === undefined) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide one of code or authCodeResponse in the request body",
            });
        }
        if (authCodeResponse !== undefined && authCodeResponse.access_token === undefined) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide the access_token inside the authCodeResponse request param",
            });
        }
        if (redirectURI === undefined || typeof redirectURI !== "string") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide the redirectURI in request body",
            });
        }
        let provider = utils_2.findRightProvider(options.providers, thirdPartyId, clientId);
        if (provider === undefined) {
            if (clientId === undefined) {
                throw new error_1.default({
                    type: error_1.default.BAD_INPUT_ERROR,
                    message:
                        "The third party provider " + thirdPartyId + ` seems to be missing from the backend configs.`,
                });
            } else {
                throw new error_1.default({
                    type: error_1.default.BAD_INPUT_ERROR,
                    message:
                        "The third party provider " +
                        thirdPartyId +
                        ` seems to be missing from the backend configs. If it is configured, then please make sure that you are passing the correct clientId from the frontend.`,
                });
            }
        }
        let result = yield apiImplementation.signInUpPOST({
            provider,
            code,
            clientId,
            redirectURI,
            options,
            authCodeResponse,
            userContext: utils_3.makeDefaultUserContextFromAPI(options.req),
        });
        if (result.status === "OK") {
            utils_1.send200Response(options.res, {
                status: result.status,
                user: result.user,
                createdNewUser: result.createdNewUser,
            });
        } else if (result.status === "NO_EMAIL_GIVEN_BY_PROVIDER") {
            utils_1.send200Response(options.res, {
                status: "NO_EMAIL_GIVEN_BY_PROVIDER",
            });
        } else {
            utils_1.send200Response(options.res, result);
        }
        return true;
    });
}
exports.default = signInUpAPI;
