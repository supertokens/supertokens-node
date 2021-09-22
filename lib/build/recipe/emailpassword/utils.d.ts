// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput, NormalisedFormField, TypeInputFormField } from "./types";
import { NormalisedAppinfo } from "../../types";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
export declare function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
export declare function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    _: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInputEmailVerification;
export declare function normaliseSignUpFormFields(formFields?: TypeInputFormField[]): NormalisedFormField[];
export declare function defaultPasswordValidator(
    value: any
): Promise<
    | "Development bug: Please make sure the password field yields a string"
    | "Password must contain at least 8 characters, including a number"
    | "Password's length must be lesser than 100 characters"
    | "Password must contain at least one alphabet"
    | "Password must contain at least one number"
    | undefined
>;
export declare function defaultEmailValidator(
    value: any
): Promise<"Development bug: Please make sure the email field yields a string" | "Email is invalid" | undefined>;
