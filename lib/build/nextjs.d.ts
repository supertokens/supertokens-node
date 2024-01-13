// @ts-nocheck
import { CollectingResponse, PreParsedRequest } from "./framework/custom";
import { SessionContainer, VerifySessionOptions } from "./recipe/session";
declare type PartialNextRequest = {
    method: string;
    url: string;
    headers: Headers;
    formData: () => any;
    json: () => any;
    cookies: {
        getAll: () => {
            name: string;
            value: string;
        }[];
    };
};
export default class NextJS {
    static superTokensNextWrapper<T>(
        middleware: (next: (middlewareError?: any) => void) => Promise<T>,
        request: any,
        response: any
    ): Promise<T>;
    static getAppDirRequestHandler<T extends PartialNextRequest>(
        NextResponse: typeof Response
    ): (req: T) => Promise<Response>;
    private static commonSSRSession;
    static getSSRSession(
        cookies: Array<{
            name: string;
            value: string;
        }>,
        headers: Headers,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<{
        session: SessionContainer | undefined;
        hasToken: boolean;
        hasInvalidClaims: boolean;
    }>;
    static withSession<NextRequest extends PartialNextRequest, NextResponse extends Response>(
        req: NextRequest,
        handler: (error: Error | undefined, session: SessionContainer | undefined) => Promise<NextResponse>,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<NextResponse>;
    static withPreParsedRequestResponse<NextRequest extends PartialNextRequest, NextResponse extends Response>(
        req: NextRequest,
        handler: (baseRequest: PreParsedRequest, baseResponse: CollectingResponse) => Promise<NextResponse>
    ): Promise<NextResponse>;
}
export declare let superTokensNextWrapper: typeof NextJS.superTokensNextWrapper;
export declare let getAppDirRequestHandler: typeof NextJS.getAppDirRequestHandler;
export declare let getSSRSession: typeof NextJS.getSSRSession;
export declare let withSession: typeof NextJS.withSession;
export declare let withPreParsedRequestResponse: typeof NextJS.withPreParsedRequestResponse;
export {};
