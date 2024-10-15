"use strict";
/**
 * This file contains the top-level handler definition for password update
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
const session_1 = __importDefault(require("../../session"));
async function updatePassword(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.updatePasswordPOST === undefined) {
        return false;
    }
    const { newPassword, oldPassword } = await options.req.getJSONBody();
    if (newPassword === undefined) {
        throw new error_1.default({
            message: "Missing required parameter 'newPassword'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (oldPassword === undefined) {
        throw new error_1.default({
            message: "Missing required parameter 'oldPassword'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const session = await session_1.default.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [] },
        userContext
    );
    let result = await apiImplementation.updatePasswordPOST({
        newPassword,
        oldPassword,
        session,
        options,
        userContext,
        tenantId,
    });
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = updatePassword;
