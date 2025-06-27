"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const __1 = require("../..");
const constants_1 = require("./constants");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_2 = require("../multitenancy/constants");
const user_1 = require("../../user");
const authUtils_1 = require("../../authUtils");
function getRecipeInterface(querier, getEmailPasswordConfig) {
    return {
        signUp: async function ({ email, password, tenantId, session, shouldTryLinkingWithSessionUser, userContext }) {
            const response = await this.createNewRecipeUser({
                email,
                password,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }
            let updatedUser = response.user;
            const linkResult =
                await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                    tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session,
                    shouldTryLinkingWithSessionUser,
                    userContext,
                });
            if (linkResult.status != "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;
            return {
                status: "OK",
                user: updatedUser,
                recipeUserId: response.recipeUserId,
            };
        },
        createNewRecipeUser: async function (input) {
            const resp = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signup",
                    params: {
                        tenantId: input.tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : input.tenantId,
                    },
                },
                {
                    email: input.email,
                    password: input.password,
                },
                input.userContext
            );
            if (resp.status === "OK") {
                return {
                    status: "OK",
                    user: new user_1.User(resp.user),
                    recipeUserId: new recipeUserId_1.default(resp.recipeUserId),
                };
            }
            return resp;
            // we do not do email verification here cause it's a new user and email password
            // users are always initially unverified.
        },
        signIn: async function ({ email, password, tenantId, session, shouldTryLinkingWithSessionUser, userContext }) {
            const response = await this.verifyCredentials({ email, password, tenantId, userContext });
            if (response.status === "OK") {
                const loginMethod = response.user.loginMethods.find(
                    (lm) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
                );
                if (!loginMethod.verified) {
                    await recipe_1.default
                        .getInstanceOrThrowError()
                        .verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                            user: response.user,
                            recipeUserId: response.recipeUserId,
                            userContext,
                        });
                    // Unlike in the sign up recipe function, we do not do account linking here
                    // cause we do not want sign in to change the potentially user ID of a user
                    // due to linking when this function is called by the dev in their API -
                    // for example in their update password API. If we did account linking
                    // then we would have to ask the dev to also change the session
                    // in such API calls.
                    // In the case of sign up, since we are creating a new user, it's fine
                    // to link there since there is no user id change really from the dev's
                    // point of view who is calling the sign up recipe function.
                    // We do this so that we get the updated user (in case the above
                    // function updated the verification status) and can return that
                    response.user = await (0, __1.getUser)(response.recipeUserId.getAsString(), userContext);
                }
                const linkResult =
                    await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                        tenantId,
                        inputUser: response.user,
                        recipeUserId: response.recipeUserId,
                        session,
                        shouldTryLinkingWithSessionUser,
                        userContext,
                    });
                if (linkResult.status === "LINKING_TO_SESSION_USER_FAILED") {
                    return linkResult;
                }
                response.user = linkResult.user;
            }
            return response;
        },
        verifyCredentials: async function ({ email, password, tenantId, userContext }) {
            const response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signin",
                    params: {
                        tenantId: tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    email,
                    password,
                },
                userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    user: new user_1.User(response.user),
                    recipeUserId: new recipeUserId_1.default(response.recipeUserId),
                };
            }
            return {
                status: "WRONG_CREDENTIALS_ERROR",
            };
        },
        createResetPasswordToken: async function ({ userId, email, tenantId, userContext }) {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/password/reset/token",
                    params: {
                        tenantId: tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    userId,
                    email,
                },
                userContext
            );
        },
        consumePasswordResetToken: async function ({ token, tenantId, userContext }) {
            return await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/user/password/reset/token/consume",
                    params: {
                        tenantId: tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    token,
                },
                userContext
            );
        },
        updateEmailOrPassword: async function (input) {
            const accountLinking = recipe_1.default.getInstanceOrThrowError();
            if (input.email) {
                const user = await (0, __1.getUser)(input.recipeUserId.getAsString(), input.userContext);
                if (user === undefined) {
                    return { status: "UNKNOWN_USER_ID_ERROR" };
                }
                const evInstance = recipe_2.default.getInstance();
                let isEmailVerified = false;
                if (evInstance) {
                    isEmailVerified = await evInstance.recipeInterfaceImpl.isEmailVerified({
                        recipeUserId: input.recipeUserId,
                        email: input.email,
                        userContext: input.userContext,
                    });
                }
                const isEmailChangeAllowed = await accountLinking.isEmailChangeAllowed({
                    user,
                    isVerified: isEmailVerified,
                    newEmail: input.email,
                    session: undefined,
                    userContext: input.userContext,
                });
                if (!isEmailChangeAllowed.allowed) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason:
                            isEmailChangeAllowed.reason === "ACCOUNT_TAKEOVER_RISK"
                                ? "New email cannot be applied to existing account because of account takeover risks."
                                : "New email cannot be applied to existing account because of there is another primary user with the same email address.",
                    };
                }
            }
            if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                if (input.password !== undefined) {
                    const passwordField = formFields.filter((el) => el.id === constants_1.FORM_FIELD_PASSWORD_ID)[0];
                    const error = await passwordField.validate(
                        input.password,
                        input.tenantIdForPasswordPolicy,
                        input.userContext
                    );
                    if (error !== undefined) {
                        return {
                            status: "PASSWORD_POLICY_VIOLATED_ERROR",
                            failureReason: error,
                        };
                    }
                }
            }
            // We do not check for AccountLinking.isEmailChangeAllowed here cause
            // that may return false if the user's email is not verified, and this
            // function should not fail due to lack of email verification - since it's
            // really up to the developer to decide what should be the pre condition for
            // a change in email. The check for email verification should actually go in
            // an update email API (post login update).
            let response = await querier.sendPutRequest(
                "/recipe/user",
                {
                    recipeUserId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                },
                {},
                input.userContext
            );
            if (response.status === "OK") {
                const user = await (0, __1.getUser)(input.recipeUserId.getAsString(), input.userContext);
                if (user === undefined) {
                    // This means that the user was deleted between the put and get requests
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
                await recipe_1.default.getInstanceOrThrowError().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    user,
                    recipeUserId: input.recipeUserId,
                    userContext: input.userContext,
                });
            }
            return response;
        },
    };
}
