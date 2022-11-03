// @ts-nocheck
import { UsersCountAPIResponse } from "./usersCountGet";
import { UsersGetAPIResponse } from "./usersGet";
declare type UnauthorisedResponse = {
    status: "UNAUTHORISED";
};
declare type HTMLResponse = {
    status: "HTML_RESPONSE";
    string: string;
};
declare type DisabledAPI = {
    status: "DISABLED";
};
declare type OkResponse = {
    status: "OK";
};
export declare type APIResponse =
    | UnauthorisedResponse
    | UsersCountAPIResponse
    | UsersGetAPIResponse
    | HTMLResponse
    | DisabledAPI
    | OkResponse;
export {};
