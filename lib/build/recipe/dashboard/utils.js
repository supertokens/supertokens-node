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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiPathWithDashboardBase = exports.validateApiKey = exports.isRecipeInitialised = exports.getUserForRecipeId = exports.isValidRecipeId = exports.sendUnauthorisedAccess = exports.validateAndNormaliseUserInput = void 0;
const utils_1 = require("../../utils");
const constants_1 = require("./constants");
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../emailpassword/recipe"));
const recipe_3 = __importDefault(require("../thirdparty/recipe"));
const recipe_4 = __importDefault(require("../passwordless/recipe"));
const recipe_5 = __importDefault(require("../thirdpartyemailpassword/recipe"));
const recipe_6 = __importDefault(require("../thirdpartypasswordless/recipe"));
const logger_1 = require("../../logger");
function validateAndNormaliseUserInput(config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === undefined ? {} : config.override
    );
    if (
        (config === null || config === void 0 ? void 0 : config.apiKey) !== undefined &&
        (config === null || config === void 0 ? void 0 : config.admins) !== undefined
    ) {
        logger_1.logDebugMessage("User Dashboard: Providing 'admins' has no effect when using an apiKey.");
    }
    let admins;
    if ((config === null || config === void 0 ? void 0 : config.admins) !== undefined) {
        admins = config.admins.map((email) => utils_1.normaliseEmail(email));
    }
    return Object.assign(Object.assign({}, config), {
        override,
        authMode: config !== undefined && config.apiKey ? "api-key" : "email-password",
        admins,
    });
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function sendUnauthorisedAccess(res) {
    utils_1.sendNon200ResponseWithMessage(res, "Unauthorised access", 401);
}
exports.sendUnauthorisedAccess = sendUnauthorisedAccess;
function isValidRecipeId(recipeId) {
    return recipeId === "emailpassword" || recipeId === "thirdparty" || recipeId === "passwordless";
}
exports.isValidRecipeId = isValidRecipeId;
async function getUserForRecipeId(recipeUserId, recipeId) {
    let userResponse = await _getUserForRecipeId(recipeUserId, recipeId);
    let user = undefined;
    if (userResponse.user !== undefined) {
        user = Object.assign(Object.assign({}, userResponse.user), { firstName: "", lastName: "" });
    }
    return {
        user,
        recipe: userResponse.recipe,
    };
}
exports.getUserForRecipeId = getUserForRecipeId;
async function _getUserForRecipeId(recipeUserId, recipeId) {
    let recipe;
    const user = await recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
        userId: recipeUserId.getAsString(),
        userContext: {},
    });
    if (user === undefined) {
        return {
            user: undefined,
            recipe: undefined,
        };
    }
    const loginMethod = user.loginMethods.find(
        (m) => m.recipeId === recipeId && m.recipeUserId.getAsString() === recipeUserId.getAsString()
    );
    if (loginMethod === undefined) {
        return {
            user: undefined,
            recipe: undefined,
        };
    }
    if (recipeId === recipe_2.default.RECIPE_ID) {
        try {
            // we detect if this recipe has been init or not..
            recipe_2.default.getInstanceOrThrowError();
            recipe = "emailpassword";
        } catch (e) {
            // No - op
        }
        if (recipe === undefined) {
            try {
                // we detect if this recipe has been init or not..
                recipe_5.default.getInstanceOrThrowError();
                recipe = "thirdpartyemailpassword";
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === recipe_3.default.RECIPE_ID) {
        try {
            recipe_3.default.getInstanceOrThrowError();
            recipe = "thirdparty";
        } catch (e) {
            // No - op
        }
        if (recipe === undefined) {
            try {
                // we detect if this recipe has been init or not..
                recipe_5.default.getInstanceOrThrowError();
                recipe = "thirdpartyemailpassword";
            } catch (e) {
                // No - op
            }
        }
        if (recipe === undefined) {
            try {
                recipe_6.default.getInstanceOrThrowError();
                recipe = "thirdpartypasswordless";
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === recipe_4.default.RECIPE_ID) {
        try {
            recipe_4.default.getInstanceOrThrowError();
            recipe = "passwordless";
        } catch (e) {
            // No - op
        }
        if (recipe === undefined) {
            try {
                recipe_6.default.getInstanceOrThrowError();
                recipe = "thirdpartypasswordless";
            } catch (e) {
                // No - op
            }
        }
    }
    return {
        user,
        recipe,
    };
}
function isRecipeInitialised(recipeId) {
    let isRecipeInitialised = false;
    if (recipeId === "emailpassword") {
        try {
            recipe_2.default.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}
        if (!isRecipeInitialised) {
            try {
                recipe_5.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    } else if (recipeId === "passwordless") {
        try {
            recipe_4.default.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {}
        if (!isRecipeInitialised) {
            try {
                recipe_6.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    } else if (recipeId === "thirdparty") {
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
        if (!isRecipeInitialised) {
            try {
                recipe_6.default.getInstanceOrThrowError();
                isRecipeInitialised = true;
            } catch (_) {}
        }
    }
    return isRecipeInitialised;
}
exports.isRecipeInitialised = isRecipeInitialised;
async function validateApiKey(input) {
    let apiKeyHeaderValue = input.req.getHeaderValue("authorization");
    // We receieve the api key as `Bearer API_KEY`, this retrieves just the key
    apiKeyHeaderValue =
        apiKeyHeaderValue === null || apiKeyHeaderValue === void 0 ? void 0 : apiKeyHeaderValue.split(" ")[1];
    if (apiKeyHeaderValue === undefined) {
        return false;
    }
    return apiKeyHeaderValue === input.config.apiKey;
}
exports.validateApiKey = validateApiKey;
function getApiPathWithDashboardBase(path) {
    return constants_1.DASHBOARD_API + path;
}
exports.getApiPathWithDashboardBase = getApiPathWithDashboardBase;
