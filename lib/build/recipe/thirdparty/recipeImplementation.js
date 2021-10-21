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
const normalisedURLPath_1 = require("../../normalisedURLPath");
class RecipeImplementation {
    constructor(querier) {
        this.getUsers = (timeJoinedOrder, limit, paginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/users"), {
                    timeJoinedOrder,
                    limit,
                    paginationToken,
                });
                return {
                    users: response.users,
                    nextPaginationToken: response.nextPaginationToken,
                };
            });
        this.signInUp = ({ thirdPartyId, thirdPartyUserId, email }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
                    thirdPartyId,
                    thirdPartyUserId,
                    email,
                });
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                };
            });
        this.getUserById = ({ userId }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        this.getUsersByEmail = ({ email }) =>
            __awaiter(this, void 0, void 0, function* () {
                const { users } = yield this.querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/users/by-email"),
                    {
                        email,
                    }
                );
                return users;
            });
        this.getUserByThirdPartyInfo = ({ thirdPartyId, thirdPartyUserId }) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield this.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    thirdPartyId,
                    thirdPartyUserId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        this.querier = querier;
    }
}
exports.default = RecipeImplementation;
