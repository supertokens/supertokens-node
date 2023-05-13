// @ts-nocheck
export default class NextJS {
    static superTokensNextWrapper<T>(
        middleware: (next: (middlewareError?: any) => void) => Promise<T>,
        request: any,
        response: any
    ): Promise<T>;
}
export declare let superTokensNextWrapper: typeof NextJS.superTokensNextWrapper;
