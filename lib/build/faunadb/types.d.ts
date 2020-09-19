export * from "../types";
import * as OriginalTypes from "../types";
export declare type TypeFaunaDBInput = {
    faunadbSecret: string;
    accessFaunadbTokenFromFrontend?: boolean;
    userCollectionName: string;
} & OriginalTypes.TypeInput;
