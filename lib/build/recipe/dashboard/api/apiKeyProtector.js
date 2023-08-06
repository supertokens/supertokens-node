"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
async function apiKeyProtector(apiImplementation, tenantId, options, apiFunction, userContext) {
    const shouldAllowAccess = await options.recipeImplementation.shouldAllowAccess({
        req: options.req,
        config: options.config,
        userContext,
    });
    if (!shouldAllowAccess) {
        utils_1.sendUnauthorisedAccess(options.res);
        return true;
    }
    const response = await apiFunction(apiImplementation, tenantId, options, userContext);
    options.res.sendJSONResponse(response);
    return true;
}
exports.default = apiKeyProtector;
