// @ts-nocheck
import { APIInterface, APIOptions } from "../";
export default function generateEmailVerifyToken(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<boolean>;
