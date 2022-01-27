import { Address, Hash } from "@ckb-lumos/lumos"

export interface PwToOmniConvertor {
  constructor(ethAddress: Address): PwToOmniConvertor;
  convert(payload: number): Promise<Hash>;
  
}