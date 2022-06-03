import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    public readonly fetchValue: SessionClaim<boolean>["fetchValue"];

    constructor(conf: { key: string; fetchValue: SessionClaim<boolean>["fetchValue"] }) {
        super(conf.key);

        this.fetchValue = conf.fetchValue;
    }
}
