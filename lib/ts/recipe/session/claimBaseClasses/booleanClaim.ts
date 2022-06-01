import { SessionClaimBuilder } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    public readonly fetch: SessionClaimBuilder<boolean>["fetch"];

    constructor(conf: { key: string; fetch: SessionClaimBuilder<boolean>["fetch"] }) {
        super(conf.key);

        this.fetch = conf.fetch;
    }
}
