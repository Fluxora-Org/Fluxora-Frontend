export function stellarExplorerUrl(address: string, network?: string | null) {
  const normalizedNetwork = network?.toUpperCase();
  const explorerNetwork =
    normalizedNetwork === "PUBLIC" || normalizedNetwork === "MAINNET"
      ? "public"
      : "testnet";

  return `https://stellar.expert/explorer/${explorerNetwork}/account/${encodeURIComponent(
    address,
  )}`;
}
