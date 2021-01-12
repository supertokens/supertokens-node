export default class NextJS {
    static superTokensNextWrapper(middleware: (next: (middlewareError: any) => void) => Promise<void>, request: any, response: any): Promise<void>;
    static superTokensMiddleware(request: any, response: any): Promise<any>;
}
export declare let superTokensMiddleware: typeof NextJS.superTokensMiddleware;
export declare let superTokensNextWrapper: typeof NextJS.superTokensNextWrapper;
