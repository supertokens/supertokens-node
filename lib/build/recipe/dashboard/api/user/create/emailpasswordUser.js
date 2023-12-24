"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailPasswordUser = void 0;
const error_1 = __importDefault(require("../../../../../error"));
const emailpassword_1 = __importDefault(require("../../../../emailpassword"));
const recipe_1 = __importDefault(require("../../../../emailpassword/recipe"));
const recipe_2 = __importDefault(require("../../../../thirdpartyemailpassword/recipe"));
const utils_1 = require("../../../../emailpassword/utils");
const createEmailPasswordUser = async (_, tenantId, options, __) => {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (error) {
        try {
            recipe_2.default.getInstanceOrThrowError();
        } catch (_a) {
            return {
                status: "FEATURE_NOT_ENABLED_ERROR",
            };
        }
    }
    const requestBody = await options.req.getJSONBody();
    const email = requestBody.email;
    const password = requestBody.password;
    if (email === undefined || typeof email !== "string") {
        throw new error_1.default({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (password === undefined || typeof password !== "string") {
        throw new error_1.default({
            message: "Required parameter 'password' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const validateEmailError = await utils_1.defaultEmailValidator(email);
    if (validateEmailError !== undefined) {
        return {
            status: "INPUT_VALIDATION_ERROR",
            message: validateEmailError,
        };
    }
    const validatePasswordError = await utils_1.defaultPasswordValidator(password);
    if (validatePasswordError !== undefined) {
        return {
            status: "INPUT_VALIDATION_ERROR",
            message: validatePasswordError,
        };
    }
    const response = await emailpassword_1.default.signUp(tenantId, email, password);
    return response;
};
exports.createEmailPasswordUser = createEmailPasswordUser;
