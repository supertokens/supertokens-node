// @ts-nocheck
import { NormalisedFormField } from "../types";
export declare function validateFormFieldsOrThrowError(
    configFormFields: NormalisedFormField[],
    formFieldsRaw: any
): Promise<
    {
        id: string;
        value: string;
    }[]
>;
