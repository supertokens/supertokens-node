"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailVerifyTokenPost = void 0;
const error_1 = __importDefault(require("../../../../error"));
const emailverification_1 = __importDefault(require("../../../emailverification"));
const __1 = require("../../../..");
const userEmailVerifyTokenPost = async (_, tenantId, options, userContext) => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;
    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const user = await (0, __1.getUser)(recipeUserId, userContext);
    if (!user) {
        throw new error_1.default({
            message: "Unknown 'recipeUserId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    return await emailverification_1.default.sendEmailVerificationEmail(
        tenantId,
        user.id,
        (0, __1.convertToRecipeUserId)(recipeUserId),
        undefined,
        userContext
    );
};
exports.userEmailVerifyTokenPost = userEmailVerifyTokenPost;
