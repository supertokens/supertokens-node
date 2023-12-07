"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThridPartyUser = void 0;
const error_1 = __importDefault(require("../../../../../error"));
const thirdparty_1 = __importDefault(require("../../../../thirdparty"));
const recipe_1 = __importDefault(require("../../../../thirdparty/recipe"));
const createThridPartyUser = async (_, tenantId, options, __) => {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (error) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const requestBody = await options.req.getJSONBody();
    const thirdPartyId = requestBody.thirdPartyId;
    const thirdPartyUserId = requestBody.thirdPartyUserId;
    const email = requestBody.email;
    const isVerified = requestBody.isVerified;
    if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'thirdPartyId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (thirdPartyUserId === undefined || typeof thirdPartyUserId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'thirdPartyUserId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (email === undefined || typeof email !== "string") {
        throw new error_1.default({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (isVerified === undefined || typeof isVerified !== "boolean") {
        throw new error_1.default({
            message: "Required parameter 'isVerified' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await thirdparty_1.default.manuallyCreateOrUpdateUser(
        tenantId,
        thirdPartyId,
        thirdPartyUserId,
        email,
        isVerified
    );
    return response;
};
exports.createThridPartyUser = createThridPartyUser;
