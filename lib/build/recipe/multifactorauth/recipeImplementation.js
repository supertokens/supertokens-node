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
const recipe_2 = __importDefault(require("../totp/recipe"));
function getRecipeInterface(querier, recipeInstance) {
    return {
        getFactorsSetupForUser: async function ({ tenantId, user, userContext }) {
            const setupFactorsFromOtherRecipes = recipeInstance.getFactorsSetupByOtherRecipes();
            const factorsSetupForUser = new Set();
            for (const loginMethod of user.loginMethods) {
                if (!loginMethod.tenantIds.includes(tenantId)) {
                    continue;
                }
                if (
                    loginMethod.recipeId === "emailpassword" &&
                    setupFactorsFromOtherRecipes.includes("emailpassword")
                ) {
                    factorsSetupForUser.add("emailpassword");
                }
                if (loginMethod.recipeId === "thirdparty" && setupFactorsFromOtherRecipes.includes("thirdparty")) {
                    factorsSetupForUser.add("thirdparty");
                }
                if (loginMethod.email !== undefined && loginMethod.verified) {
                    if (setupFactorsFromOtherRecipes.includes("otp-email")) {
                        factorsSetupForUser.add("otp-email");
                    }
                    if (setupFactorsFromOtherRecipes.includes("link-email")) {
                        factorsSetupForUser.add("link-email");
                    }
                }
                if (loginMethod.phoneNumber !== undefined) {
                    if (setupFactorsFromOtherRecipes.includes("otp-phone")) {
                        factorsSetupForUser.add("otp-phone");
                    }
                    if (setupFactorsFromOtherRecipes.includes("link-phone")) {
                        factorsSetupForUser.add("link-phone");
                    }
                }
            }
            const totpRecipeInstance = recipe_2.default.getInstance();
            if (totpRecipeInstance !== undefined) {
                const deviceRes = await totpRecipeInstance.recipeInterfaceImpl.listDevices({
                    userId: user.id,
                    userContext,
                });
                for (const device of deviceRes.devices) {
                    if (device.verified) {
                        factorsSetupForUser.add("totp");
                        break;
                    }
                }
            }
            return [...factorsSetupForUser];
        },
        getMFARequirementsForAuth: async function ({
            defaultRequiredFactorIdsForUser,
            defaultRequiredFactorIdsForTenant,
        }) {
            const allFactors = new Set();
            for (const factor of defaultRequiredFactorIdsForUser) {
                allFactors.add(factor);
            }
            for (const factor of defaultRequiredFactorIdsForTenant) {
                allFactors.add(factor);
            }
            return [{ oneOf: [...allFactors] }];
        },
        isAllowedToSetupFactor: async function ({
            factorId,
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
            const nextFactors = multiFactorAuthClaim_1.MultiFactorAuthClaim.buildNextArray(
                completedFactors,
                mfaRequirementsForAuth
            );
            return nextFactors.length === 0 || nextFactors.includes(factorId);
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
        addToDefaultRequiredFactorsForUser: async function ({ tenantId, user, factorId, userContext }) {
            var _a, _b, _c, _d;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });
            const factorIds =
                (_c =
                    (_b =
                        (_a = metadata.metadata._supertokens) === null || _a === void 0
                            ? void 0
                            : _a.defaultRequiredFactorIdsForUser) === null || _b === void 0
                        ? void 0
                        : _b[tenantId]) !== null && _c !== void 0
                    ? _c
                    : [];
            if (factorIds.includes(factorId)) {
                return;
            }
            factorIds.push(factorId);
            const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
                _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                    defaultRequiredFactorIdsForUser: Object.assign(
                        Object.assign(
                            {},
                            (_d = metadata.metadata._supertokens) === null || _d === void 0 ? void 0 : _d.factors
                        ),
                        { [tenantId]: factorIds }
                    ),
                }),
            });
            await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
                userId: user.id,
                metadataUpdate,
                userContext,
            });
        },
        getDefaultRequiredFactorsForUser: async function ({ tenantId, user, userContext }) {
            var _a, _b, _c;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });
            return (_c =
                (_b =
                    (_a = metadata.metadata._supertokens) === null || _a === void 0
                        ? void 0
                        : _a.defaultRequiredFactorIdsForUser) === null || _b === void 0
                    ? void 0
                    : _b[tenantId]) !== null && _c !== void 0
                ? _c
                : [];
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
