"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userGet = void 0;
const error_1 = __importDefault(require("../../../../error"));
const userGet = async ({ stInstance, options, userContext }) => {
    const userId = options.req.getKeyValueFromQuery("userId");
    if (userId === undefined || userId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'userId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let user = await stInstance
        .getRecipeInstanceOrThrow("accountlinking")
        .recipeInterfaceImpl.getUser({ userId, userContext });
    if (user === undefined) {
        return {
            status: "NO_USER_FOUND_ERROR",
        };
    }
    let usermetadataRecipe = stInstance.getRecipeInstance("usermetadata");
    if (usermetadataRecipe === undefined) {
        return {
            status: "OK",
            user: Object.assign(Object.assign({}, user.toJson()), {
                firstName: "FEATURE_NOT_ENABLED",
                lastName: "FEATURE_NOT_ENABLED",
            }),
        };
    }
    const userMetaData = await usermetadataRecipe.recipeInterfaceImpl.getUserMetadata({ userId, userContext });
    const { first_name, last_name } = userMetaData.metadata;
    return {
        status: "OK",
        user: Object.assign(Object.assign({}, user.toJson()), {
            firstName: first_name === undefined ? "" : first_name,
            lastName: last_name === undefined ? "" : last_name,
        }),
    };
};
exports.userGet = userGet;
