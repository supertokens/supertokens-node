"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFormFieldsOrThrowError = void 0;
const error_1 = __importDefault(require("../error"));
const constants_1 = require("../constants");
async function validateFormFieldsOrThrowError(configFormFields, formFieldsRaw, tenantId, userContext) {
    // first we check syntax ----------------------------
    if (formFieldsRaw === undefined) {
        throw newBadRequestError("Missing input param: formFields");
    }
    if (!Array.isArray(formFieldsRaw)) {
        throw newBadRequestError("formFields must be an array");
    }
    let formFields = [];
    for (let i = 0; i < formFieldsRaw.length; i++) {
        let curr = formFieldsRaw[i];
        if (typeof curr !== "object" || curr === null) {
            throw newBadRequestError("All elements of formFields must be an object");
        }
        if (typeof curr.id !== "string" || curr.value === undefined) {
            throw newBadRequestError("All elements of formFields must contain an 'id' and 'value' field");
        }
        if (curr.id === constants_1.FORM_FIELD_EMAIL_ID || curr.id === constants_1.FORM_FIELD_PASSWORD_ID) {
            if (typeof curr.value !== "string") {
                throw newBadRequestError("The value of formFields with id = " + curr.id + " must be a string");
            }
        }
        formFields.push(curr);
    }
    // we trim the email: https://github.com/supertokens/supertokens-core/issues/99
    formFields = formFields.map((field) => {
        if (field.id === constants_1.FORM_FIELD_EMAIL_ID) {
            return Object.assign(Object.assign({}, field), { value: field.value.trim() });
        }
        return field;
    });
    // then run validators through them-----------------------
    await validateFormOrThrowError(formFields, configFormFields, tenantId, userContext);
    return formFields;
}
exports.validateFormFieldsOrThrowError = validateFormFieldsOrThrowError;
function newBadRequestError(message) {
    return new error_1.default({
        type: error_1.default.BAD_INPUT_ERROR,
        message,
    });
}
// We check that the number of fields in input and config form field is the same.
// We check that each item in the config form field is also present in the input form field
async function validateFormOrThrowError(inputs, configFormFields, tenantId, userContext) {
    let validationErrors = [];
    if (configFormFields.length !== inputs.length) {
        throw newBadRequestError("Are you sending too many / too few formFields?");
    }
    // Loop through all form fields.
    for (let i = 0; i < configFormFields.length; i++) {
        const field = configFormFields[i];
        // Find corresponding input value.
        const input = inputs.find((i) => i.id === field.id);
        // Absent or not optional empty field
        if (input === undefined || (input.value === "" && !field.optional)) {
            validationErrors.push({
                error: "Field is not optional",
                id: field.id,
            });
        } else {
            // Otherwise, use validate function.
            const error = await field.validate(input.value, tenantId, userContext);
            // If error, add it.
            if (error !== undefined) {
                validationErrors.push({
                    error,
                    id: field.id,
                });
            }
        }
    }
    if (validationErrors.length !== 0) {
        throw new error_1.default({
            type: error_1.default.FIELD_ERROR,
            payload: validationErrors,
            message: "Error in input formFields",
        });
    }
}
