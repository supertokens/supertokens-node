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
exports.userEmailVerifyTokenPost = void 0;
const error_1 = __importDefault(require("../../../../error"));
const emailverification_1 = __importDefault(require("../../../emailverification"));
const recipe_1 = __importDefault(require("../../../emailverification/recipe"));
const utils_1 = require("../../../emailverification/utils");
const userEmailVerifyTokenPost = (_, options, userContext) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const userId = requestBody.userId;
        if (userId === undefined || typeof userId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'userId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        let emailResponse = yield recipe_1.default.getInstanceOrThrowError().getEmailForUserId(userId, userContext);
        if (emailResponse.status !== "OK") {
            throw new Error("Should never come here");
        }
        let emailVerificationToken = yield emailverification_1.default.createEmailVerificationToken(
            userId,
            undefined,
            userContext
        );
        if (emailVerificationToken.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }
        const tenantId = "";
        let emailVerifyLink = utils_1.getEmailVerifyLink({
            appInfo: options.appInfo,
            token: emailVerificationToken.token,
            recipeId: recipe_1.default.RECIPE_ID,
            tenantId,
        });
        yield emailverification_1.default.sendEmail({
            type: "EMAIL_VERIFICATION",
            user: {
                id: userId,
                email: emailResponse.email,
            },
            emailVerifyLink,
        });
        return {
            status: "OK",
        };
    });
exports.userEmailVerifyTokenPost = userEmailVerifyTokenPost;
