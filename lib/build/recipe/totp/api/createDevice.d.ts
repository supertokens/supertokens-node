// @ts-nocheck
import { APIInterface, APIOptions } from "..";
export default function createDeviceAPI(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: Record<string, any>
): Promise<boolean>;
