// @ts-nocheck
import { APIInterface, APIOptions } from "..";
export default function resendCode(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: Record<string, any>
): Promise<boolean>;
