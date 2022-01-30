import { BI } from "@ckb-lumos/lumos";

export interface HumanizeOptions {
  decimals: number;

  maxDisplayDecimals?: number;
  symbol?: string;
}

export function humanize(amount: BI, options: HumanizeOptions): string {
  const { decimals, maxDisplayDecimals = 4, symbol } = options;

  const intPart = amount.div(10 ** decimals).toString();
  const decPart = amount.mod(10 ** decimals).toString();

  const displayIntPartWithSeparator = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let displayDecPart = decPart.padStart(decimals, "0").slice(0, maxDisplayDecimals).replace(/0+$/, "");
  displayDecPart = displayDecPart.split("").every((char) => char === "0") ? "" : `.${displayDecPart}`;

  return `${displayIntPartWithSeparator}${displayDecPart}${symbol ? ` ${symbol}` : ""}`;
}
