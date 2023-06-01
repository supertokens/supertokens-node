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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userGet = void 0;
const error_1 = __importDefault(require("../../../../error"));
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("../../../usermetadata/recipe"));
const usermetadata_1 = __importDefault(require("../../../usermetadata"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const userGet = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const recipeUserId = options.req.getKeyValueFromQuery("recipeUserId"); // TODO: this needs to change to just be user ID
        const recipeId = options.req.getKeyValueFromQuery("recipeId"); // TODO: remove recipeId
        if (recipeUserId === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'recipeUserId'",
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
        if (!utils_1.isRecipeInitialised(recipeId)) {
            return {
                status: "RECIPE_NOT_INITIALISED",
            };
        }
        let user = (yield utils_1.getUserForRecipeId(new recipeUserId_1.default(recipeUserId), recipeId)).user;
        if (user === undefined) {
            return {
                status: "NO_USER_FOUND_ERROR",
            };
        }
        try {
            recipe_1.default.getInstanceOrThrowError();
        } catch (_) {
            user = Object.assign(Object.assign({}, user), {
                firstName: "FEATURE_NOT_ENABLED",
                lastName: "FEATURE_NOT_ENABLED",
            });
            return {
                status: "OK",
                recipeId: recipeId,
                user,
            };
        }
        const userMetaData = yield usermetadata_1.default.getUserMetadata(recipeUserId);
        const { first_name, last_name } = userMetaData.metadata;
        user = Object.assign(Object.assign({}, user), {
            firstName: first_name === undefined ? "" : first_name,
            lastName: last_name === undefined ? "" : last_name,
        });
        return {
            status: "OK",
            recipeId: recipeId,
            user,
        };
    });
exports.userGet = userGet;
