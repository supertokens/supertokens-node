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
const mockCore_1 = require("./mockCore");
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
            let userId = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId,
                // we can use index 0 cause this is a new recipe user
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                userContext,
            });
            let updatedUser = await __1.getUser(userId, userContext);
            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }
            return {
                status: "OK",
                user: updatedUser,
            };
        },
        createNewRecipeUser: async function (input) {
            console.log("input ==", input);
            if (process.env.MOCK !== "true") {
                console.log("Not using Mock");
                const resp = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            input.tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : input.tenantId
                        }/recipe/signup`
                    ),
                    {
                        email: input.email,
                        password: input.password,
                    }
                );
                if (resp.status === "OK") {
                    resp.user = new user_1.User(resp.user);
                }
                return resp;
            } else {
                return mockCore_1.mockCreateRecipeUser(input);
            }
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
                }
            );
            if (response.status === "OK") {
                response.user = new user_1.User(response.user); // TODO:
                let recipeUserId = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].recipeId === "emailpassword" &&
                        response.user.loginMethods[i].hasSameEmailAs(email)
                    ) {
                        recipeUserId = response.user.loginMethods[i].recipeUserId;
                        break;
                    }
                }
                await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    tenantId,
                    recipeUserId: recipeUserId,
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
                response.user = await __1.getUser(recipeUserId.getAsString(), userContext);
            }
            return response;
        },
        createResetPasswordToken: async function ({ userId, email, tenantId }) {
            if (process.env.MOCK !== "true") {
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
                    }
                );
            } else {
                return mockCore_1.mockCreatePasswordResetToken(email, userId, tenantId);
            }
        },
        consumePasswordResetToken: async function ({ token, tenantId }) {
            if (process.env.MOCK !== "true") {
                return await querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId
                        }/recipe/user/password/reset/token/consume`
                    ),
                    {
                        method: "token",
                        token,
                    }
                );
            } else {
                return mockCore_1.mockConsumePasswordResetToken(token, tenantId, querier);
            }
        },
        updateEmailOrPassword: async function (input) {
            if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                if (input.password !== undefined) {
                    const passwordField = formFields.filter((el) => el.id === constants_1.FORM_FIELD_PASSWORD_ID)[0];
                    const error = await passwordField.validate(input.password, input.tenantIdForPasswordPolicy);
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
            let response;
            if (process.env.MOCK !== "true") {
                // the input userId must be a recipe user ID.
                response = await querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    recipeUserId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                });
            } else {
                response = await mockCore_1.mockUpdateEmailOrPassword(
                    Object.assign(Object.assign({}, input), { querier })
                );
            }
            if (response.status === "OK") {
                await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    tenantId: input.tenantIdForPasswordPolicy,
                    recipeUserId: input.recipeUserId,
                    userContext: input.userContext,
                });
            }
            return response;
        },
    };
}
exports.default = getRecipeInterface;
