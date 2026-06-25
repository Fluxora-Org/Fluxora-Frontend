const USDC_FRACTION_DIGITS = 6;

export function formatUsdc(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: USDC_FRACTION_DIGITS,
  }).format(value)} USDC`;
}
