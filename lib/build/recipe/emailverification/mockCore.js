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
exports.mockCreateEmailVerificationToken = exports.mockGetEmailVerificationTokenInfo = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
let tokenMap = {};
function mockGetEmailVerificationTokenInfo({ token }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (tokenMap[token] === undefined) {
            return {
                status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
            };
        }
        return {
            status: "OK",
            user: tokenMap[token],
        };
    });
}
exports.mockGetEmailVerificationTokenInfo = mockGetEmailVerificationTokenInfo;
function mockCreateEmailVerificationToken(input, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/user/email/verify/token"),
            {
                userId: input.recipeUserId.getAsString(),
                email: input.email,
            }
        );
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
    });
}
exports.mockCreateEmailVerificationToken = mockCreateEmailVerificationToken;
