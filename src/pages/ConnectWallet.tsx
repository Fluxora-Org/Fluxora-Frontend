import { useState } from "react";
import GlowingDot from "../components/GlowingDot";
import WalletIcon from "../components/WalletIcon";
import ConnectButton from "../components/ConnectButton";
import ConnectWalletModal from "../components/ConnectWalletModal";

export default function ConnectWallet() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#06111f",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <GlowingDot top="34%" right="40%" size={18} opacity={0.6} />
      <GlowingDot top="42%" left="40%" size={12} opacity={0.5} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: "clamp(300px, 90vw, 380px)",
          width: "100%",
          padding: "0 clamp(16px, 5vw, 24px)",
        }}
      >
        <WalletIcon />

        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(1.15rem, 4vw, 1.45rem)",
            fontWeight: 700,
            margin: "0 0 clamp(8px, 2.5vw, 10px) 0",
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          Connect your wallet
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "clamp(0.75rem, 2.2vw, 0.82rem)",
            lineHeight: 1.7,
            margin: "0 0 clamp(18px, 5vw, 24px) 0",
            maxWidth: "clamp(280px, 85vw, 320px)",
          }}
        >
          Connect your Stellar wallet to view your streams and treasury. Your
          wallet stays secure—we never request private keys.
        </p>

        <ConnectButton onClick={() => setIsModalOpen(true)} />
      </div>

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}