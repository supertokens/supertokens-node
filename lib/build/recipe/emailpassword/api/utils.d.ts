import Recipe from "../recipe";
import { NormalisedFormField } from "../types";
export declare function validateFormFieldsOrThrowError(recipeInstance: Recipe, configFormFields: NormalisedFormField[], formFieldsRaw: any): Promise<{
    id: string;
    value: string;
}[]>;
