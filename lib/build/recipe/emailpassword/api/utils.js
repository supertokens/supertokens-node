"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFormFieldsOrThrowError = validateFormFieldsOrThrowError;
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
                throw newBadRequestError(`${curr.id} value must be a string`);
            }
        }
        formFields.push(curr);
    }
    // we trim the email: https://github.com/supertokens/supertokens-core/issues/99
    formFields = formFields.map((field) => {
        if (field.id === constants_1.FORM_FIELD_EMAIL_ID) {
            return Object.assign(Object.assign({}, field), {
                value: typeof field.value === "string" ? field.value.trim() : field.value,
            });
        }
        return field;
    });
    // then run validators through them-----------------------
    await validateFormOrThrowError(formFields, configFormFields, tenantId, userContext);
    return formFields;
}
function newBadRequestError(message) {
    return new error_1.default({
        type: error_1.default.BAD_INPUT_ERROR,
        message,
    });
}
// We check to make sure we are validating each required form field
// and also validate optional form fields only when present
async function validateFormOrThrowError(inputs, configFormFields, tenantId, userContext) {
    let validationErrors = [];
    // Throw an error if the user has provided more than the allowed
    // formFields.
    if (inputs.length > configFormFields.length) {
        throw newBadRequestError("Are you sending too many formFields?");
    }
    // NOTE: We don't need to check for required fields at all as that will
    // be picked up in the below codeblock.
    for (const formField of configFormFields) {
        const input = inputs.find((input) => input.id === formField.id);
        // Add the not optional error if input is not passed
        // and the field is not optional.
        const isValidInput =
            !!input &&
            ((typeof input.value === "string"
                ? input.value.length > 0
                : input.value !== null && typeof input.value !== "undefined") ||
                (typeof input.value === "object" && Object.values(input.value).length > 0));
        if (!formField.optional && !isValidInput) {
            validationErrors.push({
                error: "Field is not optional",
                id: formField.id,
            });
        }
        if (isValidInput) {
            const error = await formField.validate(input.value, tenantId, userContext);
            if (error) {
                validationErrors.push({
                    error,
                    id: formField.id,
                });
            }
        }
    }
    if (validationErrors.length > 0) {
        throw new error_1.default({
            type: error_1.default.FIELD_ERROR,
            payload: validationErrors,
            message: "Error in input formFields",
        });
    }
}
