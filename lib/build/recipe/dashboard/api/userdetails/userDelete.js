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
const error_1 = require("../../../../error");
const __1 = require("../../../..");
exports.userDelete = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const userId = options.req.getKeyValueFromQuery("userId");
        let removeAllLinkedAccountsQueryValue = options.req.getKeyValueFromQuery("removeAllLinkedAccounts");
        if (removeAllLinkedAccountsQueryValue !== undefined) {
            removeAllLinkedAccountsQueryValue = removeAllLinkedAccountsQueryValue.trim().toLowerCase();
        }
        const removeAllLinkedAccounts =
            removeAllLinkedAccountsQueryValue === undefined ? undefined : removeAllLinkedAccountsQueryValue === "true";
        if (userId === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'userId'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        yield __1.deleteUser(userId, removeAllLinkedAccounts);
        return {
            status: "OK",
        };
    });
