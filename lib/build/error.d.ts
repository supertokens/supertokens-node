import { TypeAuthError } from './types';
export declare function generateError(errType: number, err: any): any;
export declare class AuthError {
    static GENERAL_ERROR: number;
    static UNAUTHORISED: number;
    static TRY_REFRESH_TOKEN: number;
    static TOKEN_THEFT_DETECTED: number;
    static isErrorFromAuth: (err: any) => err is TypeAuthError;
}
