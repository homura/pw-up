import { Address, Hash, helpers, HexNumber, Script } from "@ckb-lumos/lumos"

export interface AddressInfo {
  ethAddress: Address;
  omniLock: Script;
  omniAddress: Address;
  pwLock: Script;
  pwAddress: Address;
}

export interface SudtType {
  name: string;
  symbol: string;
  decimals: number;
  tokenURI: string;
}

export interface SudtOption {
  ammount: HexNumber;
  sudtType: SudtType;
}

export interface PwToOmniTxOption {
  capacity: HexNumber;
  sudtOption: SudtOption;
}

export interface PwToOmniTxBuilder {
  constructor(ethAddress: Address): PwToOmniTxBuilder;
  buildTx(payload: PwToOmniTxOption): Promise<helpers.TransactionSkeletonType>;
}

export interface PwToOmniHelper {
  transformAddress(ethAddress: Address): AddressInfo;
}

export interface PwToOmniConvertor {
  constructor(ethAddress: Address): PwToOmniConvertor;
  convert(payload: PwToOmniTxOption): Promise<Hash>;
}