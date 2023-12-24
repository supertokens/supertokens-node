"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPasswordlessUser = void 0;
const error_1 = __importDefault(require("../../../../../error"));
const passwordless_1 = __importDefault(require("../../../../passwordless"));
const recipe_1 = __importDefault(require("../../../../passwordless/recipe"));
const recipe_2 = __importDefault(require("../../../../thirdpartypasswordless/recipe"));
const max_1 = require("libphonenumber-js/max");
const utils_1 = require("../../../../passwordless/utils");
const createPasswordlessUser = async (_, tenantId, options, __) => {
    let passwordlessRecipe = undefined;
    try {
        passwordlessRecipe = recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        try {
            passwordlessRecipe = recipe_2.default.getInstanceOrThrowError();
        } catch (_) {
            return {
                status: "FEATURE_NOT_ENABLED_ERROR",
            };
        }
    }
    const requestBody = await options.req.getJSONBody();
    let email = requestBody.email;
    let phoneNumber = requestBody.phoneNumber;
    if ((email !== undefined && phoneNumber !== undefined) || (email === undefined && phoneNumber === undefined)) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide exactly one of email or phoneNumber",
        });
    }
    if (
        email !== undefined &&
        (passwordlessRecipe.config.contactMethod === "EMAIL" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        email = email.trim();
        const validateError = await utils_1.defaultValidateEmail(email);
        if (validateError !== undefined) {
            return {
                status: "INPUT_VALIDATION_ERROR",
                message: validateError,
            };
        }
    }
    if (
        phoneNumber !== undefined &&
        (passwordlessRecipe.config.contactMethod === "PHONE" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        const validateError = await utils_1.defaultValidatePhoneNumber(phoneNumber);
        if (validateError !== undefined) {
            return {
                status: "INPUT_VALIDATION_ERROR",
                message: validateError,
            };
        }
        const parsedPhoneNumber = max_1.parsePhoneNumber(phoneNumber);
        phoneNumber = parsedPhoneNumber.format("E.164");
    }
    const response = await passwordless_1.default.signInUp(
        email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber, tenantId }
    );
    return response;
};
exports.createPasswordlessUser = createPasswordlessUser;
