import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "xlsx"],
  outputFileTracingIncludes: { "/api/classify": ["./public/case-data/**/*"] },
};

export default nextConfig;
