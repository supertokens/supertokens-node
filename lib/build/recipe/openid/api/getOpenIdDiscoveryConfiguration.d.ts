// @ts-nocheck
import { UserContext } from "../../../types";
import { APIInterface, APIOptions } from "../types";
export default function getOpenIdDiscoveryConfiguration(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
