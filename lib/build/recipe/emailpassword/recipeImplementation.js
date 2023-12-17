"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const __1 = require("../..");
const constants_1 = require("./constants");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_2 = require("../multitenancy/constants");
const user_1 = require("../../user");
function getRecipeInterface(querier, getEmailPasswordConfig) {
    return {
        signUp: async function ({ email, password, tenantId, userContext }) {
            const response = await this.createNewRecipeUser({
                email,
                password,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }
            let updatedUser = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId,
                user: response.user,
                userContext,
            });
            return {
                status: "OK",
                user: updatedUser,
                recipeUserId: response.recipeUserId,
            };
        },
        createNewRecipeUser: async function (input) {
            const resp = await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${input.tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : input.tenantId}/recipe/signup`
                ),
                {
                    email: input.email,
                    password: input.password,
                },
                input.userContext
            );
            if (resp.status === "OK") {
                resp.user = new user_1.User(resp.user);
                resp.recipeUserId = new recipeUserId_1.default(resp.recipeUserId);
            }
            return resp;
            // we do not do email verification here cause it's a new user and email password
            // users are always initially unverified.
        },
        signIn: async function ({ email, password, tenantId, userContext }) {
            const response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId}/recipe/signin`
                ),
                {
                    email,
                    password,
                },
                userContext
            );
            if (response.status === "OK") {
                response.user = new user_1.User(response.user);
                response.recipeUserId = new recipeUserId_1.default(response.recipeUserId);
                const loginMethod = response.user.loginMethods.find(
                    (lm) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
                );
                if (!loginMethod.verified) {
                    await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
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
                    response.user = await __1.getUser(response.recipeUserId.getAsString(), userContext);
                }
            }
            return response;
        },
        createResetPasswordToken: async function ({ userId, email, tenantId, userContext }) {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${
                        tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId
                    }/recipe/user/password/reset/token`
                ),
                {
                    userId,
                    email,
                },
                userContext
            );
        },
        consumePasswordResetToken: async function ({ token, tenantId, userContext }) {
            return await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${
                        tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId
                    }/recipe/user/password/reset/token/consume`
                ),
                {
                    method: "token",
                    token,
                },
                userContext
            );
        },
        updateEmailOrPassword: async function (input) {
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
                new normalisedURLPath_1.default(`${input.tenantIdForPasswordPolicy}/recipe/user`),
                {
                    recipeUserId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                },
                input.userContext
            );
            if (response.status === "OK") {
                const user = await __1.getUser(input.recipeUserId.getAsString(), input.userContext);
                if (user === undefined) {
                    // This means that the user was deleted between the put and get requests
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
                await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    user,
                    recipeUserId: input.recipeUserId,
                    userContext: input.userContext,
                });
            }
            return response;
        },
    };
}
exports.default = getRecipeInterface;
