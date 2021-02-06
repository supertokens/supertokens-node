export * from "../types";
import * as OriginalTypes from "../types";
import { Client } from "faunadb";
declare type FaunaDBClientConfig = {
    faunadbSecret: string;
} | {
    faunadbClient: Client;
};
export declare type TypeFaunaDBInput = {
    accessFaunadbTokenFromFrontend?: boolean;
    userCollectionName: string;
} & FaunaDBClientConfig & OriginalTypes.TypeInput;
