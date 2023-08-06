"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockCreateEmailVerificationToken = exports.mockGetEmailVerificationTokenInfo = exports.mockReset = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
let tokenMap = {};
async function mockReset() {
    tokenMap = {};
}
exports.mockReset = mockReset;
async function mockGetEmailVerificationTokenInfo({ token }) {
    if (tokenMap[token] === undefined) {
        return {
            status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
        };
    }
    return {
        status: "OK",
        user: tokenMap[token],
    };
}
exports.mockGetEmailVerificationTokenInfo = mockGetEmailVerificationTokenInfo;
async function mockCreateEmailVerificationToken(input, querier) {
    let response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/user/email/verify/token"), {
        userId: input.recipeUserId.getAsString(),
        email: input.email,
    });
    if (response.status === "OK") {
        tokenMap[response.token] = input;
        return {
            status: "OK",
            token: response.token,
        };
    } else {
        return {
            status: "EMAIL_ALREADY_VERIFIED_ERROR",
        };
    }
}
exports.mockCreateEmailVerificationToken = mockCreateEmailVerificationToken;
