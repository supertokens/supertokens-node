// @ts-nocheck
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import type SuperTokens from "../../../supertokens";
export default function signInUpAPI(
    stInstance: SuperTokens,
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
