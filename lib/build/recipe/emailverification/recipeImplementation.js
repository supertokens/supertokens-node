"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
function getRecipeInterface(querier, getEmailForRecipeUserId) {
    return {
        createEmailVerificationToken: async function ({ recipeUserId, email, tenantId }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${tenantId}/recipe/user/email/verify/token`),
                {
                    userId: recipeUserId.getAsString(),
                    email,
                }
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
                new normalisedURLPath_1.default(`/${tenantId}/recipe/user/email/verify`),
                {
                    method: "token",
                    token,
                }
            );
            if (response.status === "OK") {
                if (attemptAccountLinking) {
                    // before attempting this, we must check that the email that got verified
                    // from the ID is the one that is currently associated with the ID (since
                    // email verification can be done for any combination of (user id, email)
                    // and not necessarily the email that is currently associated with the ID)
                    let emailInfo = await getEmailForRecipeUserId(
                        new recipeUserId_1.default(response.userId),
                        userContext
                    );
                    if (emailInfo.status === "OK" && emailInfo.email === response.email) {
                        // we do this here to prevent cyclic dependencies.
                        // TODO: Fix this.
                        let AccountLinking = require("../accountlinking");
                        await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                            recipeUserId: new recipeUserId_1.default(response.userId),
                            userContext,
                        });
                    }
                }
                return {
                    status: "OK",
                    user: {
                        recipeUserId: new recipeUserId_1.default(response.userId),
                        email: response.email,
                    },
                };
            } else {
                return {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
                };
            }
        },
        isEmailVerified: async function ({ recipeUserId, email }) {
            let response = await querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user/email/verify"), {
                userId: recipeUserId.getAsString(),
                email,
            });
            return response.isVerified;
        },
        revokeEmailVerificationTokens: async function (input) {
            await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/user/email/verify/token/remove`),
                {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                }
            );
            return { status: "OK" };
        },
        unverifyEmail: async function (input) {
            await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/user/email/verify/remove"), {
                userId: input.recipeUserId.getAsString(),
                email: input.email,
            });
            return { status: "OK" };
        },
    };
}
exports.default = getRecipeInterface;
