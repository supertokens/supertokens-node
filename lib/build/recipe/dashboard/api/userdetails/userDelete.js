"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDelete = void 0;
const error_1 = __importDefault(require("../../../../error"));
const __1 = require("../../../..");
const userDelete = async (_, ___, options, __) => {
    const userId = options.req.getKeyValueFromQuery("userId");
    let removeAllLinkedAccountsQueryValue = options.req.getKeyValueFromQuery("removeAllLinkedAccounts");
    if (removeAllLinkedAccountsQueryValue !== undefined) {
        removeAllLinkedAccountsQueryValue = removeAllLinkedAccountsQueryValue.trim().toLowerCase();
    }
    const removeAllLinkedAccounts =
        removeAllLinkedAccountsQueryValue === undefined ? undefined : removeAllLinkedAccountsQueryValue === "true";
    if (userId === undefined || userId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'userId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    await (0, __1.deleteUser)(userId, removeAllLinkedAccounts);
    return {
        status: "OK",
    };
};
exports.userDelete = userDelete;
