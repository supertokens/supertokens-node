// @ts-nocheck
import STError from "../../error";
export default class SessionError extends STError {
    static FIELD_ERROR: "FIELD_ERROR";
    constructor(
        options:
            | {
                  type: "FIELD_ERROR";
                  payload: {
                      id: string;
                      error: string;
                  }[];
                  message: string;
              }
            | {
                  type: "BAD_INPUT_ERROR";
                  message: string;
              }
    );
}
