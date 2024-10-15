"use strict";
/**
 * This defines the top-level handler for allSessionsGET type.
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const __1 = __importDefault(require(".."));
async function sessionsGet(apiImplementation, options, userContext, tenantId) {
    if (apiImplementation.allSessionsGET === undefined) {
        return false;
    }
    const session = await __1.default.getSession(options.req, options.res, {}, userContext);
    let result = await apiImplementation.allSessionsGET({
        session,
        options,
        tenantId,
        userContext,
    });
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = sessionsGet;
