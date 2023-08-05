"use strict";
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
async function mockCreateNewOrUpdateEmailOfRecipeUser(thirdPartyId, thirdPartyUserId, email, tenantId, querier) {
    let thirdPartyUser = await mockCore_1.mockListUsersByAccountInfo({
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
        let userBasedOnEmail = await mockCore_1.mockListUsersByAccountInfo({
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
    let response = await querier.sendPostRequest(new normalisedURLPath_1.default(`${tenantId}/recipe/signinup`), {
        thirdPartyId,
        thirdPartyUserId,
        email: { id: email },
    });
    return {
        status: "OK",
        createdNewUser: response.createdNewUser,
        user: await mockCore_1.mockGetUser({
            userId: response.user.id,
        }),
    };
}
exports.mockCreateNewOrUpdateEmailOfRecipeUser = mockCreateNewOrUpdateEmailOfRecipeUser;
