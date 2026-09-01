"use client";

import { Wallet } from "@phosphor-icons/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useMounted";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const mounted = useMounted();
  if (!mounted) {
    return <span className={compact ? "inline-block size-10" : "inline-block h-10 w-[8.5rem]"} />;
  }
  if (compact) {
    return (
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted: rkMounted }) => {
          const ready = rkMounted;
          const connected = ready && account && chain;
          return (
            <Button
              variant={connected ? "secondary" : "primary"}
              size="icon"
              aria-label={connected ? "Account" : "Connect wallet"}
              onClick={
                !connected ? openConnectModal : chain.unsupported ? openChainModal : openAccountModal
              }
            >
              <Wallet className="size-[18px]" weight="fill" />
            </Button>
          );
        }}
      </ConnectButton.Custom>
    );
  }
  return <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />;
}
