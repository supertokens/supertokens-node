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
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("../emailpassword/recipe");
const recipe_2 = require("../thirdparty/recipe");
const recipe_3 = require("../passwordless/recipe");
const emailpassword_1 = require("../emailpassword");
const thirdparty_1 = require("../thirdparty");
const passwordless_1 = require("../passwordless");
const thirdpartyemailpassword_1 = require("../thirdpartyemailpassword");
const thirdpartypasswordless_1 = require("../thirdpartypasswordless");
function defaultOnAccountLinked(_user, _newAccountInfo, _userContext) {
    return __awaiter(this, void 0, void 0, function* () {});
}
function defaultShouldDoAutomaticAccountLinking(_newAccountInfo, _user, _session, _userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            shouldAutomaticallyLink: false,
        };
    });
}
function validateAndNormaliseUserInput(_, config) {
    let onAccountLinked = config.onAccountLinked || defaultOnAccountLinked;
    let shouldDoAutomaticAccountLinking =
        config.shouldDoAutomaticAccountLinking || defaultShouldDoAutomaticAccountLinking;
    let override = Object.assign({ functions: (originalImplementation) => originalImplementation }, config.override);
    return {
        override,
        onAccountLinked,
        shouldDoAutomaticAccountLinking,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function getUserForRecipeId(userId, recipeId) {
    return __awaiter(this, void 0, void 0, function* () {
        let user;
        let recipe;
        if (recipeId === recipe_1.default.RECIPE_ID) {
            try {
                const userResponse = yield emailpassword_1.default.getUserById(userId);
                if (userResponse !== undefined) {
                    user = Object.assign(Object.assign({}, userResponse), { recipeId: "emailpassword" });
                    recipe = "emailpassword";
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartyemailpassword_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { recipeId: "emailpassword" });
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
                    user = Object.assign(Object.assign({}, userResponse), { recipeId: "thirdparty" });
                    recipe = "thirdparty";
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartyemailpassword_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { recipeId: "thirdparty" });
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
                        user = Object.assign(Object.assign({}, userResponse), { recipeId: "thirdparty" });
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
                    user = Object.assign(Object.assign({}, userResponse), { recipeId: "passwordless" });
                    recipe = "passwordless";
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartypasswordless_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { recipeId: "passwordless" });
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
