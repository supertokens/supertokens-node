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
const thirdpartyemailpassword_1 = __importDefault(require("../../../../thirdpartyemailpassword"));
const recipe_1 = __importDefault(require("../../../../emailpassword/recipe"));
const recipe_2 = __importDefault(require("../../../../thirdpartyemailpassword/recipe"));
const createEmailPasswordUser = async (_, tenantId, options, userContext) => {
    let emailPasswordOrThirdpartyEmailPassword = undefined;
    try {
        emailPasswordOrThirdpartyEmailPassword = recipe_1.default.getInstanceOrThrowError();
    } catch (error) {
        try {
            emailPasswordOrThirdpartyEmailPassword = recipe_2.default.getInstanceOrThrowError();
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
    const emailFormField = emailPasswordOrThirdpartyEmailPassword.config.signUpFeature.formFields.find(
        (field) => field.id === "email"
    );
    if (emailFormField !== undefined) {
        const validateEmailError = await emailFormField.validate(email, tenantId, userContext);
        if (validateEmailError !== undefined) {
            return {
                status: "EMAIL_VALIDATION_ERROR",
                message: validateEmailError,
            };
        }
    } else {
        // this should never happen.
        throw Error("emailFormFiled is undefined");
    }
    const passwordFormField = emailPasswordOrThirdpartyEmailPassword.config.signUpFeature.formFields.find(
        (field) => field.id === "password"
    );
    if (passwordFormField !== undefined) {
        const validatePasswordError = await passwordFormField.validate(password, tenantId, userContext);
        if (validatePasswordError !== undefined) {
            return {
                status: "PASSWORD_VALIDATION_ERROR",
                message: validatePasswordError,
            };
        }
    } else {
        // this should never happen.
        throw Error("passwordFormField is undefined");
    }
    if (emailPasswordOrThirdpartyEmailPassword.getRecipeId() === "emailpassword") {
        const response = await emailpassword_1.default.signUp(tenantId, email, password);
        return response;
    } else {
        // not checking explicitly if the recipeId is thirdpartyemailpassword or not because at this point of time it should be thirdpartyemailpassword.
        const response = await thirdpartyemailpassword_1.default.emailPasswordSignUp(tenantId, email, password);
        return response;
    }
};
exports.createEmailPasswordUser = createEmailPasswordUser;
