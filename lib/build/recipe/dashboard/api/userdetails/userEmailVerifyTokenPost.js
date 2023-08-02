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
const __1 = require("../../../..");
const userEmailVerifyTokenPost = (_, tenantId, options, userContext) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const recipeUserId = requestBody.recipeUserId;
        if (recipeUserId === undefined || typeof recipeUserId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'recipeUserId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        const user = yield __1.getUser(recipeUserId, userContext);
        if (!user) {
            throw new error_1.default({
                message: "Unknown 'recipeUserId'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        return yield emailverification_1.default.sendEmailVerificationEmail(
            tenantId,
            user.id,
            __1.convertToRecipeUserId(recipeUserId),
            undefined,
            userContext
        );
    });
exports.userEmailVerifyTokenPost = userEmailVerifyTokenPost;
