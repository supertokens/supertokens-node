"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = apiKeyProtector;
const error_1 = __importDefault(require("../error"));
const utils_1 = require("../utils");
async function apiKeyProtector(apiImplementation, tenantId, options, apiFunction, userContext) {
    let shouldAllowAccess = false;
    try {
        shouldAllowAccess = await options.recipeImplementation.shouldAllowAccess({
            req: options.req,
            config: options.config,
            userContext,
        });
    } catch (e) {
        if (error_1.default.isErrorFromSuperTokens(e) && e.type === error_1.default.OPERATION_NOT_ALLOWED) {
            options.res.setStatusCode(403);
            options.res.sendJSONResponse({
                message: e.message,
            });
            return true;
        }
        throw e;
    }
    if (!shouldAllowAccess) {
        (0, utils_1.sendUnauthorisedAccess)(options.res);
        return true;
    }
    const response = await apiFunction(apiImplementation, tenantId, options, userContext);
    options.res.sendJSONResponse(response);
    return true;
}
