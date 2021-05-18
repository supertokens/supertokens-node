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
        this.signInUp = (thirdPartyId, thirdPartyUserId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield coreAPICalls_1.signInUp(this.recipeInstance, thirdPartyId, thirdPartyUserId, email);
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUserById(this.recipeInstance, userId);
            });
        this.getUserByThirdPartyInfo = (thirdPartyId, thirdPartyUserId) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUserByThirdPartyInfo(this.recipeInstance, thirdPartyId, thirdPartyUserId);
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=recipeImplementation.js.map
