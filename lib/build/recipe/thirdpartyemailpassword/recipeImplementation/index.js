"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeImplementation_1 = require("../../emailpassword/recipeImplementation");
const recipeImplementation_2 = require("../../thirdparty/recipeImplementation");
const error_1 = require("../error");
const utils_1 = require("../utils");
class RecipeImplementation {
    constructor(recipeInstance, emailPasswordRecipeInstance, thirdPartyRecipeInstance) {
        this.signUp = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.emailPasswordImplementation.signUp(email, password);
            });
        this.signIn = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signIn(email, password);
            });
        this.signInUp = (thirdPartyId, thirdPartyUserId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyImplementation === undefined) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("No thirdparty provider configured"),
                    });
                }
                return this.thirdPartyImplementation.signInUp(thirdPartyId, thirdPartyUserId, email);
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.emailPasswordImplementation.getUserById(userId);
                if (user !== undefined) {
                    return user;
                }
                if (this.thirdPartyImplementation === undefined) {
                    return undefined;
                }
                return yield this.thirdPartyImplementation.getUserById(userId);
            });
        this.getUserByThirdPartyInfo = (thirdPartyId, thirdPartyUserId) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyImplementation === undefined) {
                    return undefined;
                }
                return this.thirdPartyImplementation.getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId);
            });
        this.getEmailForUserId = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo = yield this.getUserById(userId);
                if (userInfo === undefined) {
                    throw new error_1.default({
                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                        message: "Unknown User ID provided",
                    });
                }
                return userInfo.email;
            });
        this.getUserByEmail = (email) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.getUserByEmail(email);
            });
        this.createResetPasswordToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.createResetPasswordToken(userId);
            });
        this.resetPasswordUsingToken = (token, newPassword) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.resetPasswordUsingToken(token, newPassword);
            });
        this.getUsersOldestFirst = (limit, nextPaginationTokenString) =>
            __awaiter(this, void 0, void 0, function* () {
                limit = limit === undefined ? 100 : limit;
                let nextPaginationTokens = {
                    thirdPartyPaginationToken: undefined,
                    emailPasswordPaginationToken: undefined,
                };
                if (nextPaginationTokenString !== undefined) {
                    nextPaginationTokens = utils_1.extractPaginationTokens(nextPaginationTokenString);
                }
                let emailPasswordResultPromise = this.emailPasswordImplementation.getUsersOldestFirst(
                    limit,
                    nextPaginationTokens.emailPasswordPaginationToken
                );
                let thirdPartyResultPromise =
                    this.thirdPartyImplementation === undefined
                        ? {
                              users: [],
                          }
                        : this.thirdPartyImplementation.getUsersOldestFirst(
                              limit,
                              nextPaginationTokens.thirdPartyPaginationToken
                          );
                let emailPasswordResult = yield emailPasswordResultPromise;
                let thirdPartyResult = yield thirdPartyResultPromise;
                return utils_1.combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, true);
            });
        this.getUsersNewestFirst = (limit, nextPaginationTokenString) =>
            __awaiter(this, void 0, void 0, function* () {
                limit = limit === undefined ? 100 : limit;
                let nextPaginationTokens = {
                    thirdPartyPaginationToken: undefined,
                    emailPasswordPaginationToken: undefined,
                };
                if (nextPaginationTokenString !== undefined) {
                    nextPaginationTokens = utils_1.extractPaginationTokens(nextPaginationTokenString);
                }
                let emailPasswordResultPromise = this.emailPasswordImplementation.getUsersNewestFirst(
                    limit,
                    nextPaginationTokens.emailPasswordPaginationToken
                );
                let thirdPartyResultPromise =
                    this.thirdPartyImplementation === undefined
                        ? {
                              users: [],
                          }
                        : this.thirdPartyImplementation.getUsersNewestFirst(
                              limit,
                              nextPaginationTokens.thirdPartyPaginationToken
                          );
                let emailPasswordResult = yield emailPasswordResultPromise;
                let thirdPartyResult = yield thirdPartyResultPromise;
                return utils_1.combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, false);
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                let promise1 = this.emailPasswordImplementation.getUserCount();
                let promise2 =
                    this.thirdPartyImplementation !== undefined ? this.thirdPartyImplementation.getUserCount() : 0;
                return (yield promise1) + (yield promise2);
            });
        this.recipeInstance = recipeInstance;
        this.emailPasswordImplementation = new recipeImplementation_1.default(emailPasswordRecipeInstance.getQuerier());
        if (thirdPartyRecipeInstance !== undefined) {
            this.thirdPartyImplementation = new recipeImplementation_2.default(thirdPartyRecipeInstance);
        }
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=index.js.map
