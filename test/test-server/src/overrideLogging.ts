import { IncomingMessage } from "http";

let overrideLogs: { t: number; name: string; type: "RES" | "REJ" | "CALL"; data: unknown }[] = [];

export function resetOverrideLogs() {
    overrideLogs = [];
}

export function getOverrideLogs() {
    return overrideLogs;
}

export function logOverrideEvent(name: string, type: "RES" | "REJ" | "CALL", data: unknown) {
    overrideLogs.push({
        t: Date.now(),
        type,
        name,
        data: transformLoggedData(data),
    });
}

export function transformLoggedData(data: any, visited: Set<unknown> = new Set()) {
    if (typeof data !== "object") {
        return data;
    }
    if (data === null) {
        return data;
    }

    if (data instanceof IncomingMessage) {
        // We do not actually want these in the logs because:
        // 1. They are not useful
        // 2. They are very big objects
        // 3. They contain circular references
        return "IncomingMessage obj";
    }

    if (visited.has(data)) {
        return "VISITED";
    }
    visited.add(data);

    if (data instanceof Array) {
        return data.map((i) => transformLoggedData(i, visited));
    }
    if ("toJson" in data) {
        return data.toJson();
    }
    if ("getAsString" in data) {
        return data.getAsString();
    }
    if ("getAsStringDangerous" in data) {
        return data.getAsStringDangerous();
    }
    if ("getAllSessionTokensDangerously" in data) {
        return data.getAllSessionTokensDangerously();
    }

    return Object.fromEntries(
        Array.from(Object.keys(data)).map((k) => {
            if (Object.getOwnPropertyDescriptor(data, k)?.get === undefined) {
                return [k, transformLoggedData(data[k], visited)];
            } else {
                return [k, "prop is a getter for lazy loading"];
            }
        })
    );
}
