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
exports.getApiPathWithDashboardBase = exports.validateApiKey = exports.isRecipeInitialised = exports.getUserForRecipeId = exports.isValidRecipeId = exports.sendUnauthorisedAccess = exports.getApiIdIfMatched = exports.isApiPath = exports.validateAndNormaliseUserInput = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const utils_1 = require("../../utils");
const constants_1 = require("./constants");
const recipe_1 = __importDefault(require("../emailpassword/recipe"));
const recipe_2 = __importDefault(require("../thirdparty/recipe"));
const recipe_3 = __importDefault(require("../passwordless/recipe"));
const emailpassword_1 = __importDefault(require("../emailpassword"));
const thirdparty_1 = __importDefault(require("../thirdparty"));
const passwordless_1 = __importDefault(require("../passwordless"));
const thirdpartyemailpassword_1 = __importDefault(require("../thirdpartyemailpassword"));
const recipe_4 = __importDefault(require("../thirdpartyemailpassword/recipe"));
const thirdpartypasswordless_1 = __importDefault(require("../thirdpartypasswordless"));
const recipe_5 = __importDefault(require("../thirdpartypasswordless/recipe"));
function validateAndNormaliseUserInput(config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === undefined ? {} : config.override
    );
    return {
        override,
        authMode: config !== undefined && config.apiKey ? "api-key" : "email-password",
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function isApiPath(path, appInfo) {
    const dashboardRecipeBasePath = appInfo.apiBasePath.appendPath(
        new normalisedURLPath_1.default(constants_1.DASHBOARD_API)
    );
    if (!path.startsWith(dashboardRecipeBasePath)) {
        return false;
    }
    let pathWithoutDashboardPath = path.getAsStringDangerous().split(constants_1.DASHBOARD_API)[1];
    if (pathWithoutDashboardPath.charAt(0) === "/") {
        pathWithoutDashboardPath = pathWithoutDashboardPath.substring(1, pathWithoutDashboardPath.length);
    }
    if (pathWithoutDashboardPath.split("/")[0] === "api") {
        return true;
    }
    return false;
}
exports.isApiPath = isApiPath;
function getApiIdIfMatched(path, method) {
    if (path.getAsStringDangerous().endsWith(constants_1.VALIDATE_KEY_API) && method === "post") {
        return constants_1.VALIDATE_KEY_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.SIGN_IN_API) && method === "post") {
        return constants_1.SIGN_IN_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.SIGN_OUT_API) && method === "post") {
        return constants_1.SIGN_OUT_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USERS_LIST_GET_API) && method === "get") {
        return constants_1.USERS_LIST_GET_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USERS_COUNT_API) && method === "get") {
        return constants_1.USERS_COUNT_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_API)) {
        if (method === "get" || method === "delete" || method === "put") {
            return constants_1.USER_API;
        }
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_EMAIL_VERIFY_API)) {
        if (method === "get" || method === "put") {
            return constants_1.USER_EMAIL_VERIFY_API;
        }
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_METADATA_API)) {
        if (method === "get" || method === "put") {
            return constants_1.USER_METADATA_API;
        }
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_SESSIONS_API)) {
        if (method === "get" || method === "post") {
            return constants_1.USER_SESSIONS_API;
        }
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_PASSWORD_API) && method === "put") {
        return constants_1.USER_PASSWORD_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_EMAIL_VERIFY_TOKEN_API) && method === "post") {
        return constants_1.USER_EMAIL_VERIFY_TOKEN_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.USER_PASSWORD_API) && method === "put") {
        return constants_1.USER_PASSWORD_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.SEARCH_TAGS_API) && method === "get") {
        return constants_1.SEARCH_TAGS_API;
    }
    if (path.getAsStringDangerous().endsWith(constants_1.DASHBOARD_ANALYTICS_API) && method === "post") {
        return constants_1.DASHBOARD_ANALYTICS_API;
    }
    return undefined;
}
exports.getApiIdIfMatched = getApiIdIfMatched;
function sendUnauthorisedAccess(res) {
    utils_1.sendNon200ResponseWithMessage(res, "Unauthorised access", 401);
}
exports.sendUnauthorisedAccess = sendUnauthorisedAccess;
function isValidRecipeId(recipeId) {
    return recipeId === "emailpassword" || recipeId === "thirdparty" || recipeId === "passwordless";
}
exports.isValidRecipeId = isValidRecipeId;
function getUserForRecipeId(userId, recipeId) {
    return __awaiter(this, void 0, void 0, function* () {
        let user;
        let recipe;
        if (recipeId === recipe_1.default.RECIPE_ID) {
            try {
                const userResponse = yield emailpassword_1.default.getUserById(userId);
                if (userResponse !== undefined) {
                    user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                    recipe = "emailpassword";
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartyemailpassword_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                        recipe = "thirdpartyemailpassword";
                    }
                } catch (e) {
                    // No - op
                }
            }
        } else if (recipeId === recipe_2.default.RECIPE_ID) {
            try {
                const userResponse = yield thirdparty_1.default.getUserById(userId);
                if (userResponse !== undefined) {
                    user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                    recipe = "thirdparty";
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartyemailpassword_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                        recipe = "thirdpartyemailpassword";
                    }
                } catch (e) {
                    // No - op
                }
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartypasswordless_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                        recipe = "thirdpartypasswordless";
                    }
                } catch (e) {
                    // No - op
                }
            }
        } else if (recipeId === recipe_3.default.RECIPE_ID) {
            try {
                const userResponse = yield passwordless_1.default.getUserById({
                    userId,
                });
                if (userResponse !== undefined) {
                    user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                    recipe = "passwordless";
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartypasswordless_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                        recipe = "thirdpartypasswordless";
                    }
                } catch (e) {
                    // No - op
                }
            }
        }
        return {
            user,
            recipe,
        };
    });
}
exports.getUserForRecipeId = getUserForRecipeId;
function isRecipeInitialised(recipeId) {
    let isRecipeInitialised = false;
    if (recipeId === "emailpassword") {
        try {
            recipe_1.default.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}
        if (!isRecipeInitialised) {
            try {
                recipe_4.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    } else if (recipeId === "passwordless") {
        try {
            recipe_3.default.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}
        if (!isRecipeInitialised) {
            try {
                recipe_5.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    } else if (recipeId === "thirdparty") {
        try {
            recipe_2.default.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}
        if (!isRecipeInitialised) {
            try {
                recipe_4.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
        if (!isRecipeInitialised) {
            try {
                recipe_5.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    }
    return isRecipeInitialised;
}
exports.isRecipeInitialised = isRecipeInitialised;
function validateApiKey(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let apiKeyHeaderValue = input.req.getHeaderValue("authorization");
        // We receieve the api key as `Bearer API_KEY`, this retrieves just the key
        apiKeyHeaderValue =
            apiKeyHeaderValue === null || apiKeyHeaderValue === void 0 ? void 0 : apiKeyHeaderValue.split(" ")[1];
        if (apiKeyHeaderValue === undefined) {
            return false;
        }
        return apiKeyHeaderValue === input.config.apiKey;
    });
}
exports.validateApiKey = validateApiKey;
function getApiPathWithDashboardBase(path) {
    return constants_1.DASHBOARD_API + path;
}
exports.getApiPathWithDashboardBase = getApiPathWithDashboardBase;
