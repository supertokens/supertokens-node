"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = require("../../user");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier) {
    return {
        // markFactorAsCompleteInSession: async ({ session, factor, userContext }) => {
        //     const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
        //     const completed = {
        //         ...currentValue?.c,
        //         [factor]: Math.floor(Date.now() / 1000),
        //     };
        //     const setupUserFactors = await this.recipeInterfaceImpl.getFactorsSetupForUser({
        //         userId: session.getUserId(),
        //         tenantId: session.getTenantId(),
        //         userContext,
        //     });
        //     const requirements = await this.config.getMFARequirementsForAuth(
        //         session,
        //         setupUserFactors,
        //         completed,
        //         userContext
        //     );
        //     const next = MultiFactorAuthClaim.buildNextArray(completed, requirements);
        //     await session.setClaimValue(MultiFactorAuthClaim, {
        //         c: completed,
        //         n: next,
        //     });
        // },
        createPrimaryUser: async function ({ recipeUserId, userContext }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/mfa/user/primary"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            if (response.status === "OK") {
                response.user = new user_1.User(response.user);
            }
            return response;
        },
        linkAccounts: async function ({ recipeUserId, primaryUserId, userContext }) {
            const accountsLinkingResult = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                },
                userContext
            );
            if (
                ["OK", "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"].includes(
                    accountsLinkingResult.status
                )
            ) {
                accountsLinkingResult.user = new user_1.User(accountsLinkingResult.user);
            }
            // TODO check if the code below is required
            // if (accountsLinkingResult.status === "OK") {
            //     let user: UserType = accountsLinkingResult.user;
            //     if (!accountsLinkingResult.accountsAlreadyLinked) {
            //         await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
            //             user: user,
            //             recipeUserId,
            //             userContext,
            //         });
            //         const updatedUser = await this.getUser({
            //             userId: primaryUserId,
            //             userContext,
            //         });
            //         if (updatedUser === undefined) {
            //             throw Error("this error should never be thrown");
            //         }
            //         user = updatedUser;
            //         let loginMethodInfo = user.loginMethods.find(
            //             (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
            //         );
            //         if (loginMethodInfo === undefined) {
            //             throw Error("this error should never be thrown");
            //         }
            //         // await config.onAccountLinked(user, loginMethodInfo, userContext);
            //     }
            //     accountsLinkingResult.user = user;
            // }
            return accountsLinkingResult;
        },
    };
}
exports.default = getRecipeInterface;
