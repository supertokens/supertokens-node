import { APIInterface } from "../";
import TotpRecipe from "../recipe";
import SessionError from "../../session/error";
import MultiFactorAuthRecipe from "../../multifactorauth/recipe";
import { getUser } from "../../..";

export default function getAPIInterface(): APIInterface {
    return {
        createDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();

            let userIdentifierInfo: string | undefined = undefined;
            const emailOrPhoneInfo = await TotpRecipe.getInstanceOrThrowError().getUserIdentifierInfoForUserId(
                session.getUserId(),
                userContext
            );
            if (emailOrPhoneInfo.status === "OK") {
                userIdentifierInfo = emailOrPhoneInfo.info;
            } else if (emailOrPhoneInfo.status === "UNKNOWN_USER_ID_ERROR") {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
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

            const mfaInstance = MultiFactorAuthRecipe.getInstance();
            let mfaContext;
            if (mfaInstance !== undefined) {
                mfaContext = await mfaInstance.recipeInterfaceImpl.checkAndCreateMFAContext({
                    req: options.req,
                    res: options.res,
                    tenantId,
                    factorIdInProgress: "totp",
                    session,
                    userLoggingIn: undefined,
                    isAlreadySetup: false, // since this is a sign up
                    userContext,
                });
                if (mfaContext.status !== "OK") {
                    throw new Error("Throw proper errors here!" + mfaContext.status); // TODO
                }
            }

            const res = await options.recipeImplementation.verifyDevice({
                tenantId,
                userId,
                deviceName,
                totp,
                userContext,
            });

            if (res.status === "OK" && mfaInstance && mfaContext) {
                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: session,
                    factorId: "totp",
                    userContext,
                });
                await mfaInstance.recipeInterfaceImpl.addToDefaultRequiredFactorsForUser({
                    user: mfaContext.sessionUser!,
                    tenantId: mfaContext.tenantId,
                    factorId: mfaContext.factorIdInProgress,
                    userContext,
                });
            }

            return res;
        },

        verifyTOTPPOST: async function ({ totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();

            const res = await options.recipeImplementation.verifyTOTP({
                tenantId,
                userId,
                totp,
                userContext,
            });

            const mfaInstance = MultiFactorAuthRecipe.getInstance();
            if (res.status === "OK" && mfaInstance) {
                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: session,
                    factorId: "totp",
                    userContext,
                });
                await mfaInstance.recipeInterfaceImpl.addToDefaultRequiredFactorsForUser({
                    user: (await getUser(userId))!,
                    tenantId: tenantId,
                    factorId: "totp",
                    userContext,
                });
            }

            return res;
        },
    };
}
