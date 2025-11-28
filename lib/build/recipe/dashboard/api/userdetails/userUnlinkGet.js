"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userUnlink = void 0;
const error_1 = __importDefault(require("../../../../error"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const userUnlink = async ({ stInstance, options, userContext }) => {
    const recipeUserId = options.req.getKeyValueFromQuery("recipeUserId");
    if (recipeUserId === undefined) {
        throw new error_1.default({
            message: "Required field recipeUserId is missing",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    await stInstance
        .getRecipeInstanceOrThrow("accountlinking")
        .recipeInterfaceImpl.unlinkAccount({ recipeUserId: new recipeUserId_1.default(recipeUserId), userContext });
    return {
        status: "OK",
    };
};
exports.userUnlink = userUnlink;
