export declare type TypeWrapper = "express";
import { VerifySessionOptions } from "../recipe/session";
export interface Wrapper {
    middleware: () => any;
    errorHandler: () => any;
    verifySession: (options?: VerifySessionOptions) => any;
}
