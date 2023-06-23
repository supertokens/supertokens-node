// @ts-nocheck
import { APIInterface, APIOptions } from "../";
export default function generatePasswordResetToken(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<boolean>;
