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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockCreateNewOrUpdateEmailOfRecipeUser = void 0;
const mockCore_1 = require("../accountlinking/mockCore");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const assert_1 = __importDefault(require("assert"));
function mockCreateNewOrUpdateEmailOfRecipeUser(thirdPartyId, thirdPartyUserId, email, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let thirdPartyUser = yield mockCore_1.mockListUsersByAccountInfo({
            accountInfo: {
                thirdParty: {
                    id: thirdPartyId,
                    userId: thirdPartyUserId,
                },
            },
            doUnionOfAccountInfo: false,
        });
        if (thirdPartyUser.length > 0) {
            assert_1.default(thirdPartyUser.length === 1);
            let userBasedOnEmail = yield mockCore_1.mockListUsersByAccountInfo({
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
            });
            if (thirdPartyUser[0].isPrimaryUser === true) {
                for (let i = 0; i < userBasedOnEmail.length; i++) {
                    if (userBasedOnEmail[i].isPrimaryUser) {
                        if (userBasedOnEmail[i].id !== thirdPartyUser[0].id) {
                            return {
                                status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                                reason: "Email already associated with another primary user.",
                            };
                        }
                    }
                }
            }
        }
        let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
            thirdPartyId,
            thirdPartyUserId,
            email: { id: email },
        });
        return {
            status: "OK",
            createdNewUser: response.createdNewUser,
            user: yield mockCore_1.mockGetUser({
                userId: response.user.id,
            }),
        };
    });
}
exports.mockCreateNewOrUpdateEmailOfRecipeUser = mockCreateNewOrUpdateEmailOfRecipeUser;