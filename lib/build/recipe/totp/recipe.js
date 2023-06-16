"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const error_1 = __importDefault(require("./error"));
const querier_1 = require("../../querier");
const createDevice_1 = __importDefault(require("./api/createDevice"));
const verifyDevice_1 = __importDefault(require("./api/verifyDevice"));
const verifyCode_1 = __importDefault(require("./api/verifyCode"));
const removeDevice_1 = __importDefault(require("./api/removeDevice"));
const listDevices_1 = __importDefault(require("./api/listDevices"));
const utils_2 = require("../../utils");
const error_2 = __importDefault(require("./error"));
const __1 = require("../..");
class TotpRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    id: constants_1.CREATE_DEVICE_API,
                    disabled: this.apiImpl.createDevicePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.CREATE_DEVICE_API),
                },
                {
                    id: constants_1.VERIFY_DEVICE_API,
                    disabled: this.apiImpl.verifyDevicePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.VERIFY_DEVICE_API),
                },
                {
                    id: constants_1.VERIFY_CODE_API,
                    disabled: this.apiImpl.verifyCodePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.VERIFY_CODE_API),
                },
                {
                    id: constants_1.REMOVE_DEVICE_API,
                    disabled: this.apiImpl.removeDevicePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.REMOVE_DEVICE_API),
                },
                {
                    id: constants_1.LIST_DEVICE_API,
                    disabled: this.apiImpl.listDevicesGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LIST_DEVICE_API),
                },
            ];
        };
        this.handleAPIRequest = (id, req, res, _, __) =>
            __awaiter(this, void 0, void 0, function* () {
                const options = {
                    config: this.config,
                    recipeId: this.getRecipeId(),
                    isInServerlessEnv: this.isInServerlessEnv,
                    recipeImplementation: this.recipeInterfaceImpl,
                    req,
                    res,
                    appInfo: this.getAppInfo(),
                };
                if (id === constants_1.CREATE_DEVICE_API) {
                    return yield createDevice_1.default(this.apiImpl, options);
                } else if (id == constants_1.VERIFY_DEVICE_API) {
                    return yield verifyDevice_1.default(this.apiImpl, options);
                } else if (id == constants_1.VERIFY_CODE_API) {
                    return yield verifyCode_1.default(this.apiImpl, options);
                } else if (id == constants_1.REMOVE_DEVICE_API) {
                    return yield removeDevice_1.default(this.apiImpl, options);
                } else if (id == constants_1.LIST_DEVICE_API) {
                    return yield listDevices_1.default(this.apiImpl, options);
                }
                return false;
            });
        this.handleError = (err, _, res) =>
            __awaiter(this, void 0, void 0, function* () {
                if (err.fromRecipe === TotpRecipe.RECIPE_ID) {
                    if (err.type === error_2.default.TOTP_NOT_ENABLED_ERROR) {
                        utils_2.sendNon200ResponseWithMessage(res, "TOTP is not enabled for the user", 403); // bad req
                    }
                }
                throw err;
            });
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === TotpRecipe.RECIPE_ID;
        };
        this.getUserIdentifierInfoForUserId = (userId, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.config.getUserIdentifierInfoForUserId !== undefined) {
                    const userRes = yield this.config.getUserIdentifierInfoForUserId(userId, userContext);
                    if (userRes.status !== "UNKNOWN_USER_ID_ERROR") {
                        return userRes;
                    }
                }
                let user = yield __1.getUser(userId, userContext);
                if (user === undefined) {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
                const primaryLoginMethod = user.loginMethods.find(
                    (method) => method.recipeUserId.getAsString() === user.id
                );
                if (primaryLoginMethod === undefined) {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
                if (primaryLoginMethod.email !== undefined) {
                    return {
                        info: primaryLoginMethod.email,
                        status: "OK",
                    };
                } else if (user.emails.length > 0) {
                    // fallback on trying the first email
                    return { info: user.emails[0], status: "OK" };
                } else if (primaryLoginMethod.phoneNumber !== undefined) {
                    return {
                        info: primaryLoginMethod.phoneNumber,
                        status: "OK",
                    };
                } else if (user.phoneNumbers.length > 0) {
                    return { info: user.phoneNumbers[0], status: "OK" };
                }
                return {
                    status: "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR",
                };
            });
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    static getInstanceOrThrowError() {
        if (TotpRecipe.instance !== undefined) {
            return TotpRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init or totp.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (TotpRecipe.instance === undefined) {
                TotpRecipe.instance = new TotpRecipe(
                    TotpRecipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config !== null && config !== void 0 ? config : {}
                );
                return TotpRecipe.instance;
            } else {
                throw new Error("TOTP recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        TotpRecipe.instance = undefined;
    }
}
exports.default = TotpRecipe;
TotpRecipe.instance = undefined;
TotpRecipe.RECIPE_ID = "totp";
