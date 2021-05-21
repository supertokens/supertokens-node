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
const error_1 = require("../error");
class RecipeImplementation {
    constructor(recipeInstance) {
        this.signUp = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.recipeInstance.recipeInterfaceImpl.signUp(email, password);
            });
        this.signIn = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.recipeInterfaceImpl.signIn(email, password);
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.recipeInstance.recipeInterfaceImpl.getUserById(userId);
                if (user === undefined || user.thirdParty !== undefined) {
                    // either user is undefined or it's a thirdparty user.
                    return undefined;
                }
                return user;
            });
        this.getUserByEmail = (email) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.recipeInterfaceImpl.getUserByEmail(email);
            });
        this.createResetPasswordToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.recipeInterfaceImpl.createResetPasswordToken(userId);
            });
        this.resetPasswordUsingToken = (token, newPassword) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.recipeInterfaceImpl.resetPasswordUsingToken(token, newPassword);
            });
        this.getUsersOldestFirst = (_, __) =>
            __awaiter(this, void 0, void 0, function* () {
                throw new error_1.default({
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("Should never be called"),
                });
            });
        this.getUsersNewestFirst = (_, __) =>
            __awaiter(this, void 0, void 0, function* () {
                throw new error_1.default({
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("Should never be called"),
                });
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                throw new error_1.default({
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("Should never be called"),
                });
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=emailPasswordRecipeImplementation.js.map
