// @ts-nocheck
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
export default function authorisationUrlAPI(
    apiImplementation: APIInterface,
    _tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
