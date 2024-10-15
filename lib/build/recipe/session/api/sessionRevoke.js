"use strict";
/**
 * Defines top-level handler for revoking a session using it's handle.
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const __1 = __importDefault(require(".."));
const error_1 = __importDefault(require("../../../error"));
async function sessionRevoke(apiImplementation, options, userContext) {
    if (apiImplementation.revokeSessionPOST === undefined) {
        return false;
    }
    let sessionHandle = options.req.getKeyValueFromQuery("sessionHandle");
    if (sessionHandle === undefined || typeof sessionHandle !== "string") {
        throw new error_1.default({
            message: "Missing required parameter 'newPassword'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const session = await __1.default.getSession(options.req, options.res, {}, userContext);
    let result = await apiImplementation.revokeSessionPOST({
        sessionHandle,
        session,
        options,
        userContext,
    });
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = sessionRevoke;
