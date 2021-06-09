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
class RecipeImplementation {
    constructor(recipeImplementation) {
        this.signUp = ({ email, password }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.recipeImplementation.signUp({ email, password });
            });
        this.signIn = ({ email, password }) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeImplementation.signIn({ email, password });
            });
        this.getUserById = ({ userId }) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.recipeImplementation.getUserById({ userId });
                if (user === undefined || user.thirdParty !== undefined) {
                    // either user is undefined or it's a thirdparty user.
                    return undefined;
                }
                return user;
            });
        this.getUserByEmail = ({ email }) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeImplementation.getUserByEmail({ email });
            });
        this.createResetPasswordToken = ({ userId }) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeImplementation.createResetPasswordToken({ userId });
            });
        this.resetPasswordUsingToken = ({ token, newPassword }) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeImplementation.resetPasswordUsingToken({ token, newPassword });
            });
        this.getUsersOldestFirst = (_) =>
            __awaiter(this, void 0, void 0, function* () {
                throw new Error("Should never be called");
            });
        this.getUsersNewestFirst = (_) =>
            __awaiter(this, void 0, void 0, function* () {
                throw new Error("Should never be called");
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                throw new Error("Should never be called");
            });
        this.recipeImplementation = recipeImplementation;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=emailPasswordRecipeImplementation.js.map
