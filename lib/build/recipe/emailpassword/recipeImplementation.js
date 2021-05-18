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
const coreAPICalls_1 = require("./coreAPICalls");
class RecipeImplementation {
    constructor(recipeInstance) {
        this.signUp = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.signUp(this.recipeInstance, email, password);
            });
        this.signIn = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.signIn(this.recipeInstance, email, password);
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUserById(this.recipeInstance, userId);
            });
        this.getUserByEmail = (email) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUserByEmail(this.recipeInstance, email);
            });
        this.createResetPasswordToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.createResetPasswordToken(this.recipeInstance, userId);
            });
        this.resetPasswordUsingToken = (token, newPassword) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.resetPasswordUsingToken(this.recipeInstance, token, newPassword);
            });
        this.getUsersOldestFirst = (limit, nextPaginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUsers(this.recipeInstance, "ASC", limit, nextPaginationToken);
            });
        this.getUsersNewestFirst = (limit, nextPaginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUsers(this.recipeInstance, "DESC", limit, nextPaginationToken);
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUsersCount(this.recipeInstance);
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=recipeImplementation.js.map
