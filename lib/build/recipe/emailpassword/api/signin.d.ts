// @ts-nocheck
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import type SuperTokens from "../../../supertokens";
export default function signInAPI(
    stInstance: SuperTokens,
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
