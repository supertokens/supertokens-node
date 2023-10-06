// @ts-nocheck
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
}
export declare let superTokensNextWrapper: typeof NextJS.superTokensNextWrapper;
export declare let getAppDirRequestHandler: typeof NextJS.getAppDirRequestHandler;
export {};
