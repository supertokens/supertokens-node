import { Request } from "express";
import { Session } from "./express";
export declare type TypeAuthError = {
    errType: number;
    err: any;
};
export declare type TypeInput = {
    hostname: string;
    port: number;
}[];
export interface SesssionRequest extends Request {
    session: Session;
}
