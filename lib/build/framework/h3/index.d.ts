/// <reference types="node" />
export type { SessionRequest } from './framework';
export declare const middleware: () => (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: Error | undefined) => any) => Promise<void>;
export declare const errorHandler: () => (event: import("h3").H3Event, errorPlain: Error, statusCode: number) => Promise<void>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
