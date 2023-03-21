// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response = {
    status: "OK";
    data?: {
        websiteDomain: string;
        apiDomain: string;
        appName: string;
        sdk: string;
        sdkVersion: string;
        numberOfUsers: number;
        telemetryId: string | undefined;
    };
};
export default function analyticsPost(_: APIInterface, options: APIOptions): Promise<Response>;
