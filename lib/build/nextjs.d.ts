export default class NextJS {
    static superTokensNextWrapper(middleware: (next: (middlewareError?: any) => void) => Promise<unknown>, request: any, response: any): Promise<unknown>;
    static superTokensMiddleware(request: any, response: any): Promise<any>;
}
export declare let superTokensMiddleware: typeof NextJS.superTokensMiddleware;
export declare let superTokensNextWrapper: typeof NextJS.superTokensNextWrapper;
