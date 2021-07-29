export * from "../../lib/build/recipe/emailverification";
/**
 * 'export *' does not re-export a default.
 * import EmailVerification from "supertokens-node/recipe/emailverification";
 * the above import statement won't be possible unless either
 * - user add "esModuleInterop": true in their tsconfig.json file
 * - we do the following change:
 */
import * as _default from "../../lib/build/recipe/emailverification";
export default _default;
