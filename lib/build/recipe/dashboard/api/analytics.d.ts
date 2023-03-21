// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response = {
    status: "OK";
    data?: {
        websiteDomain: string;
        websiteBasePath: string;
        apiDomain: string;
        apiBasePath: string;
        appName: string;
        backendSDKName: string;
        backendSDKVersion: string;
        telemetryId: string | undefined;
        numberOfUsers: number | undefined;
    };
};
export default function analyticsPost(_: APIInterface, options: APIOptions): Promise<Response>;
