"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailVerifyGet = void 0;
const error_1 = __importDefault(require("../../../../error"));
const emailverification_1 = __importDefault(require("../../../emailverification"));
const recipe_1 = __importDefault(require("../../../emailverification/recipe"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const userEmailVerifyGet = async (_, ___, options, userContext) => {
    const req = options.req;
    const recipeUserId = req.getKeyValueFromQuery("recipeUserId");
    if (recipeUserId === undefined) {
        throw new error_1.default({
            message: "Missing required parameter 'recipeUserId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const response = await emailverification_1.default.isEmailVerified(
        new recipeUserId_1.default(recipeUserId),
        undefined,
        userContext
    );
    return {
        status: "OK",
        isVerified: response,
    };
};
exports.userEmailVerifyGet = userEmailVerifyGet;
