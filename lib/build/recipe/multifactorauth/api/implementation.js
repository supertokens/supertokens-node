"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../../..");
function getAPIInterface() {
    return {
        mfaInfoGET: async ({ options, session, userContext }) => {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await __1.getUser(userId, userContext);
            if (user === undefined) {
                throw new Error("Unknown User ID provided");
            }
            const alreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                tenantId,
                user,
                userContext,
            });
            const availableFactors = await options.recipeImplementation.getAllAvailableFactorIds({ userContext });
            return {
                status: "OK",
                factors: {
                    isAllowedToSetup: availableFactors,
                    isAlreadySetup: alreadySetup,
                },
            };
        },
    };
}
exports.default = getAPIInterface;
