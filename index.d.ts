export * from "./lib/build";
/**
 * 'export *' does not re-export a default.
 * import SuperTokens from "supertokens-node";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */
import * as _default from "./lib/build";
export default _default;
