export * from "../types";
import * as OriginalTypes from "../types";

export type TypeFaunaDBInput = (
    | {
          faunadbSecret: string;
          accessFaunadbTokenFromFrontend?: boolean;
          userCollectionName: string;
      }
    | {
          accessFaunadbTokenFromFrontend?: boolean;
          userCollectionName: string;
          faunadbClient: any;
      }
) &
    OriginalTypes.TypeInput;
