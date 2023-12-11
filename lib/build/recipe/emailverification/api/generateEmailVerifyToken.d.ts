// @ts-nocheck
import { APIInterface, APIOptions } from "../";
export default function generateEmailVerifyToken(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: Record<string, any>
): Promise<boolean>;
