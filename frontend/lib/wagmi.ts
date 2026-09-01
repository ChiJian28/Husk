import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { base } from "wagmi/chains";
import { WALLETCONNECT_PROJECT_ID } from "@/lib/constants";

export const wagmiConfig = getDefaultConfig({
  appName: "Husk",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});
