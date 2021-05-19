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
const error_1 = require("./error");
class RecipeImplementation {
    constructor(recipeInstance) {
        this.getUserByThirdPartyInfo = (thirdPartyId, thirdPartyUserId) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.recipeInstance.recipeInterfaceImpl.getUserByThirdPartyInfo(
                    thirdPartyId,
                    thirdPartyUserId
                );
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
        this.signInUp = (thirdPartyId, thirdPartyUserId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                let result = yield this.recipeInstance.recipeInterfaceImpl.signInUp(
                    thirdPartyId,
                    thirdPartyUserId,
                    email
                );
                if (result.user.thirdParty === undefined) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: new Error("Should never come here"),
                        },
                        this.recipeInstance
                    );
                }
                return {
                    createdNewUser: result.createdNewUser,
                    user: {
                        email: result.user.email,
                        id: result.user.id,
                        timeJoined: result.user.timeJoined,
                        thirdParty: result.user.thirdParty,
                    },
                };
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.recipeInstance.recipeInterfaceImpl.getUserById(userId);
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
        this.getUsersOldestFirst = (_, __) =>
            __awaiter(this, void 0, void 0, function* () {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("Should never be called"),
                    },
                    this.recipeInstance
                );
            });
        this.getUsersNewestFirst = (_, __) =>
            __awaiter(this, void 0, void 0, function* () {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("Should never be called"),
                    },
                    this.recipeInstance
                );
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("Should never be called"),
                    },
                    this.recipeInstance
                );
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = RecipeImplementation;
//# sourceMappingURL=thirdPartyRecipeImplementation.js.map
