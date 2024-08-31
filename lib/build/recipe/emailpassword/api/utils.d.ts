// @ts-nocheck
import { NormalisedFormField } from "../types";
import { UserContext } from "../../../types";
export declare function validateFormFieldsOrThrowError(
    configFormFields: NormalisedFormField[],
    formFieldsRaw: any,
    tenantId: string,
    userContext: UserContext,
    runValidators?: boolean
): Promise<
    {
        id: string;
        value: string;
    }[]
>;
