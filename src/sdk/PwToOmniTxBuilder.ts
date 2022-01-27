import { Address, Hash } from "@ckb-lumos/lumos"

export interface PwToOmniTxBuilder {
  constructor(ethAddress: Address): PwToOmniTxBuilder;
  convert(payload: number): Promise<Hash>;
  
}