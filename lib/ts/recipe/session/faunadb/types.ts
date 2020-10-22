export * from "../types";
import * as OriginalTypes from "../types";

export type TypeFaunaDBInput = {
    faunadbSecret: string;
    accessFaunadbTokenFromFrontend?: boolean;
    userCollectionName: string;
} & OriginalTypes.TypeInput;
