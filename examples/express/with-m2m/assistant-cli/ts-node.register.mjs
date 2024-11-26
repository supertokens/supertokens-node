import { pathToFileURL } from "node:url";
import { register } from "node:module";

register("ts-node-maintained/esm", pathToFileURL("./"));
