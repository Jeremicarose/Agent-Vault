import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
