"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSessionsPost = void 0;
const error_1 = __importDefault(require("../../../../error"));
const session_1 = __importDefault(require("../../../session"));
const userSessionsPost = async (_, ___, options, userContext) => {
    const requestBody = await options.req.getJSONBody();
    const sessionHandles = requestBody.sessionHandles;
    if (sessionHandles === undefined || !Array.isArray(sessionHandles)) {
        throw new error_1.default({
            message: "Required parameter 'sessionHandles' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    await session_1.default.revokeMultipleSessions(sessionHandles, userContext);
    return {
        status: "OK",
    };
};
exports.userSessionsPost = userSessionsPost;
