"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../userroles"));
const recipe_1 = __importDefault(require("../../../userroles/recipe"));
const error_1 = __importDefault(require("../../../../error"));
const getRolesForUser = async (_, tenantId, options, __) => {
    const userId = options.req.getKeyValueFromQuery("userId");
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    if (userId === undefined || typeof userId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await userroles_1.default.getRolesForUser(tenantId, userId);
    return response;
};
exports.default = getRolesForUser;
