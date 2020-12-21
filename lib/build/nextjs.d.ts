export default class NextJS {
    static superTokensMiddleware(request: any, response: any): Promise<any>;
    static superTokensVerifySession(request: any, response: any): Promise<any>;
}
export declare let superTokensMiddleware: typeof NextJS.superTokensMiddleware;
export declare let superTokensVerifySession: typeof NextJS.superTokensVerifySession;
