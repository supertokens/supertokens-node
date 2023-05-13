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
exports.mockCreateRecipeUser = void 0;
const axios_1 = __importDefault(require("axios"));
const mockCore_1 = require("../accountlinking/mockCore");
function mockCreateRecipeUser(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedInputMap = {};
        normalizedInputMap[input.email] = input.email.toLowerCase().trim();
        let response = yield axios_1.default(`http://localhost:8080/recipe/signup`, {
            method: "post",
            headers: {
                rid: "emailpassword",
                "content-type": "application/json",
            },
            data: {
                email: input.email,
                password: input.password,
            },
        });
        if (response.data.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return response.data;
        }
        let user = response.data.user;
        return {
            status: "OK",
            user: mockCore_1.createUserObject({
                id: user.id,
                emails: [user.email],
                timeJoined: user.timeJoined,
                isPrimaryUser: false,
                phoneNumbers: [],
                thirdParty: [],
                loginMethods: [
                    {
                        recipeId: "emailpassword",
                        recipeUserId: user.id,
                        timeJoined: user.timeJoined,
                        verified: false,
                        email: user.email,
                    },
                ],
                normalizedInputMap,
            }),
        };
    });
}
exports.mockCreateRecipeUser = mockCreateRecipeUser;
