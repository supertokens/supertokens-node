"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../recipe"));
const error_1 = __importDefault(require("../../session/error"));
const recipe_2 = __importDefault(require("../../multifactorauth/recipe"));
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
            const mfaInstance = recipe_2.default.getInstance();
            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // TOTP can't work without MFA
            }
            const validateMfaRes = await mfaInstance.validateForMultifactorAuthBeforeFactorCompletion({
                tenantId,
                factorIdInProgress: "totp",
                session,
                isAlreadySetup: false,
                userContext,
            });
            if (validateMfaRes.status === "DISALLOWED_FIRST_FACTOR_ERROR") {
                throw new Error("Should never come here"); // TOTP is never a first factor
            }
            if (validateMfaRes.status !== "OK") {
                return validateMfaRes;
            }
            const res = await options.recipeImplementation.verifyDevice({
                tenantId,
                userId,
                deviceName,
                totp,
                userContext,
            });
            if (res.status === "OK") {
                const sessionRes = await mfaInstance.createOrUpdateSessionForMultifactorAuthAfterFactorCompletion({
                    req: options.req,
                    res: options.res,
                    tenantId,
                    factorIdInProgress: "totp",
                    isAlreadySetup: false,
                    userContext,
                });
                if (sessionRes.status != "OK") {
                    return sessionRes;
                }
            }
            return res;
        },
        verifyTOTPPOST: async function ({ totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const mfaInstance = recipe_2.default.getInstance();
            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // TOTP can't work without MFA
            }
            const res = await options.recipeImplementation.verifyTOTP({
                tenantId,
                userId,
                totp,
                userContext,
            });
            if (res.status === "OK") {
                const sessionRes = await mfaInstance.createOrUpdateSessionForMultifactorAuthAfterFactorCompletion({
                    req: options.req,
                    res: options.res,
                    tenantId,
                    factorIdInProgress: "totp",
                    isAlreadySetup: true,
                    userContext,
                });
                if (sessionRes.status != "OK") {
                    return sessionRes;
                }
            }
            return res;
        },
    };
}
exports.default = getAPIInterface;
