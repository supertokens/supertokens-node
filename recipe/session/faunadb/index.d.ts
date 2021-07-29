export * from "../../../lib/build/recipe/session/faunadb";
/**
 * 'export *' does not re-export a default.
 * import FaunaDBSession from "supertokens-node/recipe/session/faunadb";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */
import * as _default from "../../../lib/build/recipe/session/faunadb";
export default _default;
