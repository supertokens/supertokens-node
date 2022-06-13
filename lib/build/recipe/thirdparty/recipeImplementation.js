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
function getRecipeImplementation(querier) {
    return {
        signInUp: function ({ thirdPartyId, thirdPartyUserId, email }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
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
        },
        getUserById: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
        getUsersByEmail: function ({ email }) {
            return __awaiter(this, void 0, void 0, function* () {
                const { users } = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/users/by-email"),
                    {
                        email,
                    }
                );
                return users;
            });
        },
        getUserByThirdPartyInfo: function ({ thirdPartyId, thirdPartyUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    thirdPartyId,
                    thirdPartyUserId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
    };
}
exports.default = getRecipeImplementation;
