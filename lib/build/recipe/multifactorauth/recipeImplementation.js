"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../usermetadata/recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const user_1 = require("../../user");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier) {
    return {
        isAllowedToSetupFactor: async function ({
            session,
            completedFactors,
            defaultRequiredFactorIdsForTenant,
            defaultRequiredFactorIdsForUser,
            factorsSetUpByTheUser,
            userContext,
        }) {
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                completedFactors,
                defaultRequiredFactorIdsForTenant,
                defaultRequiredFactorIdsForUser,
                factorsSetUpByTheUser,
                userContext,
            });
            console.log(mfaRequirementsForAuth);
            return false; // TODO
        },
        getMFARequirementsForAuth: async function ({
            factorsSetUpByTheUser,
            defaultRequiredFactorIdsForUser,
            defaultRequiredFactorIdsForTenant,
            completedFactors,
        }) {
            const factors = [];
            const allFactors = [...defaultRequiredFactorIdsForUser];
            for (const factor of defaultRequiredFactorIdsForTenant) {
                if (!allFactors.includes(factor)) {
                    allFactors.push(factor);
                }
            }
            for (const factor of allFactors) {
                if (factorsSetUpByTheUser.includes(factor) && !completedFactors[factor]) {
                    factors.push(factor);
                }
            }
            return [{ oneOf: factors }];
        },
        markFactorAsCompleteInSession: async function ({ session, factorId, userContext }) {
            const currentValue = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim);
            const completed = Object.assign(
                Object.assign({}, currentValue === null || currentValue === void 0 ? void 0 : currentValue.c),
                { [factorId]: Math.floor(Date.now() / 1000) }
            );
            const setupUserFactors = await this.recipeInterfaceImpl.getFactorsSetupForUser({
                userId: session.getUserId(),
                tenantId: session.getTenantId(),
                userContext,
            });
            const requirements = await this.config.getMFARequirementsForAuth(
                session,
                setupUserFactors,
                completed,
                userContext
            );
            const next = multiFactorAuthClaim_1.MultiFactorAuthClaim.buildNextArray(completed, requirements);
            await session.setClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, {
                c: completed,
                n: next,
            });
        },
        getFactorsSetupForUser: async function ({ tenantId, user, userContext }) {
            var _a, _b;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });
            if (metadata.status === "OK" && metadata.metadata !== undefined && metadata.metadata !== null) {
                const factors =
                    (_b = (_a = metadata.metadata._supertokens) === null || _a === void 0 ? void 0 : _a.factors) ===
                        null || _b === void 0
                        ? void 0
                        : _b[tenantId];
                if (factors !== undefined) {
                    return factors;
                }
            }
            return []; // no factors setup
        },
        addToDefaultRequiredFactorsForUser: async function ({ tenantId, user, factorId, userContext }) {
            var _a, _b, _c, _d;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });
            const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
                _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                    factors: Object.assign(
                        Object.assign(
                            {},
                            (_a = metadata.metadata._supertokens) === null || _a === void 0 ? void 0 : _a.factors
                        ),
                        {
                            [tenantId]: [
                                ...((_d =
                                    (_c =
                                        (_b = metadata.metadata._supertokens) === null || _b === void 0
                                            ? void 0
                                            : _b.factors) === null || _c === void 0
                                        ? void 0
                                        : _c[tenantId]) !== null && _d !== void 0
                                    ? _d
                                    : []),
                                factorId,
                            ],
                        }
                    ),
                }),
            });
            await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
                userId: user.id,
                metadataUpdate,
                userContext,
            });
        },
        createPrimaryUser: async function ({ recipeUserId }) {
            let response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/mfa/user/primary"), {
                recipeUserId: recipeUserId.getAsString(),
            });
            if (response.status === "OK") {
                response.user = new user_1.User(response.user);
            }
            return response;
        },
        linkAccounts: async function ({ recipeUserId, primaryUserId }) {
            const accountsLinkingResult = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                }
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
