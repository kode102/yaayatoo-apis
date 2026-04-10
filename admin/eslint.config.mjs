import {createRequire} from "node:module";

const require = createRequire(import.meta.url);

/** @type {import("eslint").Linter.Config[]} */
const next = require("eslint-config-next");

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...next,
  {
    rules: {
      /** TanStack Table : faux positif React Compiler (voir doc plugin). */
      "react-hooks/incompatible-library": "off",
      /**
       * Sync init (localStorage, onglets) : patterns valides, à refactorer plus
       * tard si besoin.
       */
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
