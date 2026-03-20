import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { config } from "@/config";
import { Web3Provider } from "@/context";
import { ThemeProvider } from "@/context/theme";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AgentVault",
  description: "An agent-native execution fabric for Hedera. Programmable permissions for AI agents to safely interact with paid APIs and on-chain workflows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    config,
    (await headers()).get("cookie")
  );

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          <Web3Provider initialState={initialState}>
            <Header />
            <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
