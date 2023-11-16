"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../recipe"));
const error_1 = __importDefault(require("../../session/error"));
function getAPIInterface() {
    return {
        createDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();
            let userIdentifierInfo = undefined;
            const emailOrPhoneInfo = await recipe_1.default
                .getInstanceOrThrowError()
                .getUserIdentifierInfoForUserId(session.getUserId(), userContext);
            if (emailOrPhoneInfo.status === "OK") {
                userIdentifierInfo = emailOrPhoneInfo.info;
            } else if (emailOrPhoneInfo.status === "UNKNOWN_USER_ID_ERROR") {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Unknown User ID provided",
                });
            } else if (emailOrPhoneInfo.status === "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR") {
                // Ignore since UserIdentifierInfo is optional
            }
            return await options.recipeImplementation.createDevice({
                userId,
                userIdentifierInfo,
                deviceName: deviceName,
                userContext: userContext,
            });
        },
        listDevicesGET: async function ({ options, session, userContext }) {
            const userId = session.getUserId();
            return await options.recipeImplementation.listDevices({
                userId,
                userContext,
            });
        },
        removeDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();
            return await options.recipeImplementation.removeDevice({
                userId,
                deviceName,
                userContext,
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
