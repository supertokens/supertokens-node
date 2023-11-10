"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getAPIInterface() {
    return {
        createDevicePOST: async function ({ deviceName, period, skew, options, session, userContext }) {
            const userId = session.getUserId();
            return await options.recipeImplementation.createDevice({
                userId,
                deviceName: deviceName,
                period: period,
                skew: skew,
                userContext: userContext,
            });
        },
        verifyDevicePOST: async function ({ deviceName, totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            return await options.recipeImplementation.verifyDevice({
                tenantId,
                userId,
                deviceName,
                totp,
                userContext,
            });
        },
        verifyTOTPPOST: async function ({ totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            return await options.recipeImplementation.verifyTOTP({
                tenantId,
                userId,
                totp,
                userContext,
            });
        },
    };
}
exports.default = getAPIInterface;
