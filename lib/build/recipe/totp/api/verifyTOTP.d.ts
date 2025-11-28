// @ts-nocheck
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import type SuperTokens from "../../../supertokens";
export default function verifyTOTPAPI(
    stInstance: SuperTokens,
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
