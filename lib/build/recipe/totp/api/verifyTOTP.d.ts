// @ts-nocheck
import { APIInterface, APIOptions } from "..";
export default function verifyTOTPAPI(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: Record<string, any>
): Promise<boolean>;
