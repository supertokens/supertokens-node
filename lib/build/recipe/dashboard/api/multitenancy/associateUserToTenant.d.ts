// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import Multitenancy from "../../../multitenancy";
export declare type Response = ReturnType<typeof Multitenancy.associateUserToTenant>;
export default function associateUserToTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Response;
