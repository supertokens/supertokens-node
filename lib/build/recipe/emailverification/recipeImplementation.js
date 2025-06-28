"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const __1 = require("../..");
function getRecipeInterface(querier, getEmailForRecipeUserId) {
    return {
        createEmailVerificationToken: async function ({ recipeUserId, email, tenantId, userContext }) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/email/verify/token",
                    params: {
                        tenantId,
                    },
                },
                {
                    userId: recipeUserId.getAsString(),
                    email,
                },
                userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    token: response.token,
                };
            } else {
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                };
            }
        },
        verifyEmailUsingToken: async function ({ token, attemptAccountLinking, tenantId, userContext }) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/email/verify",
                    params: {
                        tenantId,
                    },
                },
                {
                    method: "token",
                    token,
                },
                userContext
            );
            if (response.status === "OK") {
                const recipeUserId = new recipeUserId_1.default(response.userId);
                if (attemptAccountLinking) {
                    // TODO: this should ideally come from the api response
                    const updatedUser = await (0, __1.getUser)(recipeUserId.getAsString());
                    if (updatedUser) {
                        // before attempting this, we must check that the email that got verified
                        // from the ID is the one that is currently associated with the ID (since
                        // email verification can be done for any combination of (user id, email)
                        // and not necessarily the email that is currently associated with the ID)
                        let emailInfo = await getEmailForRecipeUserId(updatedUser, recipeUserId, userContext);
                        if (emailInfo.status === "OK" && emailInfo.email === response.email) {
                            // we do this here to prevent cyclic dependencies.
                            // TODO: Fix this.
                            let AccountLinking = require("../accountlinking/recipe").default.getInstanceOrThrowError();
                            await AccountLinking.tryLinkingByAccountInfoOrCreatePrimaryUser({
                                tenantId,
                                inputUser: updatedUser,
                                session: undefined,
                                userContext,
                            });
                        }
                    }
                }
                return {
                    status: "OK",
                    user: {
                        recipeUserId,
                        email: response.email,
                    },
                };
            } else {
                return {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                };
            }
        },
        isEmailVerified: async function ({ recipeUserId, email, userContext }) {
            let response = await querier.sendGetRequest(
                "/recipe/user/email/verify",
                {
                    userId: recipeUserId.getAsString(),
                    email,
                },
                userContext
            );
            return response.isVerified;
        },
        revokeEmailVerificationTokens: async function (input) {
            await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/email/verify/token/remove",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                },
                input.userContext
            );
            return { status: "OK" };
        },
        unverifyEmail: async function (input) {
            await querier.sendPostRequest(
                "/recipe/user/email/verify/remove",
                {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                },
                input.userContext
            );
            return { status: "OK" };
        },
    };
}
