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
function getRecipeInterface(recipeInterface) {
    return {
        getUserByThirdPartyInfo: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield recipeInterface.getUserByThirdPartyInfo(input);
                if (user === undefined || user.thirdParty === undefined) {
                    return undefined;
                }
                return {
                    email: user.email,
                    id: user.id,
                    timeJoined: user.timeJoined,
                    thirdParty: user.thirdParty,
                };
            });
        },
        signInUp: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield recipeInterface.thirdPartySignInUp(input);
                if (result.user.thirdParty === undefined) {
                    throw new Error("Should never come here");
                }
                return {
                    status: "OK",
                    createdNewUser: result.createdNewUser,
                    user: {
                        email: result.user.email,
                        id: result.user.id,
                        timeJoined: result.user.timeJoined,
                        thirdParty: result.user.thirdParty,
                    },
                };
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield recipeInterface.getUserById(input);
                if (user === undefined || user.thirdParty === undefined) {
                    // either user is undefined or it's an email password user.
                    return undefined;
                }
                return {
                    email: user.email,
                    id: user.id,
                    timeJoined: user.timeJoined,
                    thirdParty: user.thirdParty,
                };
            });
        },
        getUsersByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let users = yield recipeInterface.getUsersByEmail(input);
                // we filter out all non thirdparty users.
                return users.filter((u) => {
                    return u.thirdParty !== undefined;
                });
            });
        },
    };
}
exports.default = getRecipeInterface;
