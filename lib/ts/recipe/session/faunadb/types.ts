export * from "../types";
import * as OriginalTypes from "../types";
import { Client } from "faunadb";

type FaunaDBClientConfig = { faunadbSecret: string } | { faunadbClient: Client };

export type TypeFaunaDBInput = {
    accessFaunadbTokenFromFrontend?: boolean;
    userCollectionName: string;
} & FaunaDBClientConfig &
    OriginalTypes.TypeInput;
