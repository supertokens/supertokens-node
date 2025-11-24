// @ts-nocheck
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
export default function removeCredentialAPI(
    apiImplementation: APIInterface,
    _: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
