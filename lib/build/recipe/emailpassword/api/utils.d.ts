// @ts-nocheck
import { NormalisedFormField } from "../types";
import { UserContext } from "../../../types";
export declare function validateFormFieldsOrThrowError(
    configFormFields: NormalisedFormField[],
    formFieldsRaw: any,
    tenantId: string,
    userContext: UserContext
): Promise<
    {
        id: string;
        value: unknown;
    }[]
>;
