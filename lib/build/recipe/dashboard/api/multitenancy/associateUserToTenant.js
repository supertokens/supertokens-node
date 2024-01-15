"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
async function associateUserToTenant(_, __, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { tenantId, userId } = requestBody;
    if (typeof tenantId !== "string" || tenantId === "" || typeof userId !== "string" || userId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId' or 'userId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const recipeUserId = new recipeUserId_1.default(userId);
    const response = await multitenancy_1.default.associateUserToTenant(tenantId, recipeUserId, userContext);
    return response;
}
exports.default = associateUserToTenant;
