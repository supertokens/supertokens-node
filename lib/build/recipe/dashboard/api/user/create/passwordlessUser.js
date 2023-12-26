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
const thirdpartypasswordless_1 = __importDefault(require("../../../../thirdpartypasswordless"));
const recipe_1 = __importDefault(require("../../../../passwordless/recipe"));
const recipe_2 = __importDefault(require("../../../../thirdpartypasswordless/recipe"));
const max_1 = require("libphonenumber-js/max");
const createPasswordlessUser = async (_, tenantId, options, __) => {
    let passwordlessOrThirdpartyPasswordlessRecipe = undefined;
    try {
        passwordlessOrThirdpartyPasswordlessRecipe = recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        try {
            passwordlessOrThirdpartyPasswordlessRecipe = recipe_2.default.getInstanceOrThrowError().passwordlessRecipe;
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
        (passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "EMAIL" ||
            passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        email = email.trim();
        let validationError = undefined;
        validationError = await passwordlessOrThirdpartyPasswordlessRecipe.config.validateEmailAddress(email, tenantId);
        if (validationError !== undefined) {
            return {
                status: "EMAIL_VALIDATION_ERROR",
                message: validationError,
            };
        }
    }
    if (
        phoneNumber !== undefined &&
        (passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "PHONE" ||
            passwordlessOrThirdpartyPasswordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        let validationError = undefined;
        validationError = await passwordlessOrThirdpartyPasswordlessRecipe.config.validatePhoneNumber(
            phoneNumber,
            tenantId
        );
        if (validationError !== undefined) {
            return {
                status: "PHONE_VALIDATION_ERROR",
                message: validationError,
            };
        }
        const parsedPhoneNumber = max_1.parsePhoneNumber(phoneNumber);
        if (parsedPhoneNumber === undefined) {
            // this can come here if the user has provided their own impl of validatePhoneNumber and
            // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.format("E.164");
        }
    }
    if (passwordlessOrThirdpartyPasswordlessRecipe.getRecipeId() === "thirdpartypasswordless") {
        const response = await thirdpartypasswordless_1.default.passwordlessSignInUp(
            email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber, tenantId }
        );
        return response;
    } else {
        // not checking explicitly if the recipeId is passwordless or not because at this point of time it should be passowordless.
        const response = await passwordless_1.default.signInUp(
            email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber, tenantId }
        );
        return response;
    }
};
exports.createPasswordlessUser = createPasswordlessUser;
