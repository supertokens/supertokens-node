"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../userroles"));
const error_1 = __importDefault(require("../../../../error"));
const getRolesForUser = async (_, ___, options, __) => {
    var _a;
    const userId = options.req.getKeyValueFromQuery("userId");
    const tenantId = (_a = options.req.getKeyValueFromQuery("tenantId")) !== null && _a !== void 0 ? _a : "public";
    if (userId === undefined || typeof userId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await userroles_1.default.getRolesForUser(tenantId, userId);
    return response;
};
exports.default = getRolesForUser;
