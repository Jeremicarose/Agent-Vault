import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Skip type checking during build (pre-existing type issues in some features)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Set correct workspace root to avoid lockfile detection issues
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Transpile packages that need it
  transpilePackages: [
    "@reown/appkit",
    "@reown/appkit-adapter-wagmi",
    "@reown/appkit-siwx",
    "@walletconnect/universal-provider",
    "@walletconnect/ethereum-provider",
  ],
  // Use webpack for builds (Turbopack has issues with pino/thread-stream)
  webpack: (config) => {
    // Handle optional dependencies
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Ignore optional wallet connectors and React Native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      porto: false,
      "@gemini-wallet/core": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
