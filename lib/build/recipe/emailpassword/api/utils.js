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
const error_1 = require("../error");
const constants_1 = require("../constants");
function validateFormFieldsOrThrowError(configFormFields, formFieldsRaw) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield validateFormOrThrowError(formFields, configFormFields);
        return formFields;
    });
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
function validateFormOrThrowError(inputs, configFormFields) {
    return __awaiter(this, void 0, void 0, function* () {
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
                const error = yield field.validate(input.value);
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
    });
}
