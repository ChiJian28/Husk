"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";

const rkDark = darkTheme({
  accentColor: "#8b5cf6",
  accentColorForeground: "#fafafa",
  borderRadius: "medium",
  overlayBlur: "small",
  fontStack: "system",
});

const rkLight = lightTheme({
  accentColor: "#7c3aed",
  accentColorForeground: "#fafafa",
  borderRadius: "medium",
  overlayBlur: "small",
  fontStack: "system",
});

function RainbowTheme({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Keep SSR + first client render on rkDark (defaultTheme) to avoid hydration mismatch.
  const theme = mounted && resolvedTheme === "light" ? rkLight : rkDark;

  return (
    <RainbowKitProvider
      theme={theme}
      modalSize="compact"
      initialChain={8453}
      appInfo={{
        appName: "Husk",
        learnMoreUrl: "https://thetanuts.finance",
      }}
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 15_000,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <RainbowTheme>
            {children}
            <Toaster
              position="top-right"
              theme="system"
              toastOptions={{
                className: "!bg-raised !text-ink !border-line !shadow-lift",
              }}
            />
          </RainbowTheme>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
