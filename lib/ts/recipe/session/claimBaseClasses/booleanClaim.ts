import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    constructor(conf: { key: string; fetchValue: SessionClaim<boolean>["fetchValue"] }) {
        super(conf);
    }
}
