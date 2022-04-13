import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    public readonly fetch: SessionClaim<boolean>["fetch"];

    constructor(conf: { key: string; fetch: SessionClaim<boolean>["fetch"] }) {
        super(conf.key);

        this.fetch = conf.fetch;
    }
}
