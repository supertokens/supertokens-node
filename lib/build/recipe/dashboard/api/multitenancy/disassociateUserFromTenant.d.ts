// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import Multitenancy from "../../../multitenancy";
export declare type Response = ReturnType<typeof Multitenancy.disassociateUserFromTenant>;
export default function disassociateUserFromTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Response;
