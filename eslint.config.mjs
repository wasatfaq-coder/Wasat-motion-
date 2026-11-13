import { config } from "@remotion/eslint-config-flat";

// Vendored third-party code (src/vendor) is kept unchanged and not linted.
export default [{ignores: ["src/vendor/**"]}, ...config];
