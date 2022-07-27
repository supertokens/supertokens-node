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
const recipe_1 = require("../useridmapping/recipe");
const index_1 = require("./../useridmapping/index");
function getRecipeImplementation(querier) {
    return {
        signInUp: function ({ thirdPartyId, thirdPartyUserId, email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
                    thirdPartyId,
                    thirdPartyUserId,
                    email,
                });
                if (recipe_1.isUserIdMappingRecipeInitialized) {
                    let userIdMappingResponse = yield index_1.getUserIdMapping(response.user.id, "ANY", userContext);
                    if (userIdMappingResponse.status === "OK") {
                        response.user.id = userIdMappingResponse.externalUserId;
                    }
                }
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                };
            });
        },
        getUserById: function ({ userId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let externalId = undefined;
                if (recipe_1.isUserIdMappingRecipeInitialized) {
                    let userIdMappingResponse = yield index_1.getUserIdMapping(userId, "ANY", userContext);
                    if (userIdMappingResponse.status === "OK") {
                        userId = userIdMappingResponse.superTokensUserId;
                        externalId = userIdMappingResponse.externalUserId;
                    }
                }
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    if (externalId !== undefined) {
                        response.user.id = externalId;
                    }
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
        getUsersByEmail: function ({ email, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const { users } = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/users/by-email"),
                    {
                        email,
                    }
                );
                if (recipe_1.isUserIdMappingRecipeInitialized) {
                    for (let i = 0; i < users.length; i++) {
                        let userIdMappingResponse = yield index_1.getUserIdMapping(users[i].id, "ANY", userContext);
                        if (userIdMappingResponse.status === "OK") {
                            users[i].id = userIdMappingResponse.externalUserId;
                        }
                    }
                }
                return users;
            });
        },
        getUserByThirdPartyInfo: function ({ thirdPartyId, thirdPartyUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    thirdPartyId,
                    thirdPartyUserId,
                });
                if (response.status === "OK") {
                    if (recipe_1.isUserIdMappingRecipeInitialized) {
                        let userIdMappingResponse = yield index_1.getUserIdMapping(
                            response.user.id,
                            "ANY",
                            userContext
                        );
                        if (userIdMappingResponse.status === "OK") {
                            response.user.id = userIdMappingResponse.externalUserId;
                        }
                    }
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
    };
}
exports.default = getRecipeImplementation;
