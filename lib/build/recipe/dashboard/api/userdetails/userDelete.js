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
exports.userDelete = void 0;
const supertokens_1 = __importDefault(require("../../../../supertokens"));
const error_1 = __importDefault(require("../../../../error"));
const userDelete = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const userId = options.req.getKeyValueFromQuery("userId");
        if (userId === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'userId'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        yield supertokens_1.default.getInstanceOrThrowError().deleteUser({
            userId,
        });
        return {
            status: "OK",
        };
    });
exports.userDelete = userDelete;
