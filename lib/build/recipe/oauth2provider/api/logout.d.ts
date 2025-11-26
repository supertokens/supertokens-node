// @ts-nocheck
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import type SuperTokens from "../../../supertokens";
export declare function logoutPOST(
    stInstance: SuperTokens,
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
