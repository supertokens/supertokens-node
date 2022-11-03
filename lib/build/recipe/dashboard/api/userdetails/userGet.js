"use strict";
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
const error_1 = require("../../../../error");
const utils_1 = require("../../utils");
const recipe_1 = require("../../../emailpassword/recipe");
const recipe_2 = require("../../../thirdparty/recipe");
const recipe_3 = require("../../../passwordless/recipe");
const emailpassword_1 = require("../../../emailpassword");
const thirdparty_1 = require("../../../thirdparty");
const passwordless_1 = require("../../../passwordless");
const thirdpartyemailpassword_1 = require("../../../thirdpartyemailpassword");
const thirdpartypasswordless_1 = require("../../../thirdpartypasswordless");
const usermetadata_1 = require("../../../usermetadata");
exports.userGet = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const userId = options.req.getKeyValueFromQuery("userId");
        const recipeId = options.req.getKeyValueFromQuery("recipeId");
        if (userId === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'userId'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (recipeId === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'recipeId'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (!utils_1.isValidRecipeId(recipeId)) {
            throw new error_1.default({
                message: "Invalid recipe id",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        let user;
        if (recipeId === recipe_1.default.RECIPE_ID) {
            try {
                const userResponse = yield emailpassword_1.default.getUserById(userId);
                if (userResponse !== undefined) {
                    user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartyemailpassword_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
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
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartyemailpassword_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
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
                }
            } catch (e) {
                // No - op
            }
            if (user === undefined) {
                try {
                    const userResponse = yield thirdpartypasswordless_1.default.getUserById(userId);
                    if (userResponse !== undefined) {
                        user = Object.assign(Object.assign({}, userResponse), { firstName: "", lastName: "" });
                    }
                } catch (e) {
                    // No - op
                }
            }
        }
        if (user === undefined) {
            return {
                status: "NO_USER_FOUND_ERROR",
            };
        }
        try {
            const userMetaData = yield usermetadata_1.default.getUserMetadata(userId);
            const { first_name, last_name } = userMetaData.metadata;
            if (first_name !== undefined) {
                user = Object.assign(Object.assign({}, user), { firstName: first_name });
            }
            if (last_name !== undefined) {
                user = Object.assign(Object.assign({}, user), { lastName: last_name });
            }
        } catch (_a) {
            user = Object.assign(Object.assign({}, user), {
                firstName: "FEATURE_NOT_ENABLED",
                lastName: "FEATURE_NOT_ENABLED",
            });
        }
        return {
            status: "OK",
            recipeId: recipeId,
            user,
        };
    });
