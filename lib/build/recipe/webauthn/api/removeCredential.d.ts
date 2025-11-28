// @ts-nocheck
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import type SuperTokens from "../../../supertokens";
export default function removeCredentialAPI(
    stInstance: SuperTokens,
    apiImplementation: APIInterface,
    _: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
