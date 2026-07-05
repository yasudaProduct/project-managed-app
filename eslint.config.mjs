import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**"
    ]
  },
  // レイヤー境界の機械的強制（docs/04-architecture-principles.md「依存ルールの機械的強制」）
  // docs/plans/p1-layer-violation-remediation.md Stage 7 / PR-7
  {
    files: ["src/domains/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/applications/**", "@/infrastructures/**", "@/app/**", "@/components/**", "@/hooks/**", "@/lib/**", "@prisma/client"],
          message: "Domain層は domains/types 以外に依存できません (docs/04)" },
      ]}],
    },
  },
  {
    files: ["src/applications/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/infrastructures/**", "@/app/**", "@/components/**", "@/hooks/**", "@prisma/client", "@/lib/prisma/**"],
          message: "Application層は infrastructures/UI/Prisma に依存できません (docs/04)" },
      ]}],
    },
  },
  {
    files: ["src/app/**", "src/components/**", "src/hooks/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/infrastructures/**", "@/domains/**", "@prisma/client", "@/lib/prisma/**"],
          message: "UI層は Application Service 経由でアクセスしてください (docs/04)" },
      ]}],
    },
  },
];

export default eslintConfig;
