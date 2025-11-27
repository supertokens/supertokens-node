"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMetaDataGet = void 0;
const error_1 = __importDefault(require("../../../../error"));
const userMetaDataGet = async ({ stInstance, options, userContext }) => {
    const userId = options.req.getKeyValueFromQuery("userId");
    if (userId === undefined || userId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'userId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let usermetadataRecipe = undefined;
    try {
        usermetadataRecipe = stInstance.getRecipeInstanceOrThrow("usermetadata");
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const metaDataResponse = usermetadataRecipe.recipeInterfaceImpl.getUserMetadata({ userId, userContext });
    return {
        status: "OK",
        data: (await metaDataResponse).metadata,
    };
};
exports.userMetaDataGet = userMetaDataGet;
