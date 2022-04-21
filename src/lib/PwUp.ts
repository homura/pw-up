import { NetworkType, PwUpConfig, PwUpTypes, Sudt, SudtGroup } from "./PwUpTypes";
import { Address, BI, Cell, config, core, helpers, Indexer, RPC, Script, toolkit, utils } from "@ckb-lumos/lumos";
import { default as createKeccak } from "keccak";
import { debug } from "./debug";
import { humanize } from "./amount";
import { SUDT_WHITE_LIST as TESTNET_WHITELIST } from "./tokenList-testnet";
import { SUDT_WHITE_LIST as MAINNET_WHITELIST } from "./tokenList-mainnet";
import detectEthereumProvider from "@metamask/detect-provider";

export const CONFIG_TESTNET = config.createConfig({
  PREFIX: "ckt",
  SCRIPTS: {
    ...config.predefined.AGGRON4.SCRIPTS,
    // https://github.com/lay2dev/pw-core/blob/861310b3dd8638f668db1a08d4c627db4c34d815/src/constants.ts#L156-L169
    PW_LOCK: {
      CODE_HASH: "0x58c5f491aba6d61678b7cf7edf4910b1f5e00ec0cde2f42e0abb4fd9aff25a63",
      HASH_TYPE: "type",
      TX_HASH: "0x57a62003daeab9d54aa29b944fc3b451213a5ebdf2e232216a3cfed0dde61b38",
      INDEX: "0x0",
      DEP_TYPE: "code",
    },
    OMNI_LOCK: {
      CODE_HASH: "0x79f90bb5e892d80dd213439eeab551120eb417678824f282b4ffb5f21bad2e1e",
      HASH_TYPE: "type",
      TX_HASH: "0x9154df4f7336402114d04495175b37390ce86a4906d2d4001cf02c3e6d97f39c",
      INDEX: "0x0",
      DEP_TYPE: "code",
    },
  },
});

export const CONFIG_MAINNET = config.createConfig({
  PREFIX: "ckb",
  SCRIPTS: {
    ...config.predefined.LINA.SCRIPTS,
    // https://github.com/lay2dev/pw-core/blob/861310b3dd8638f668db1a08d4c627db4c34d815/src/constants.ts#L71-L84
    PW_LOCK: {
      CODE_HASH: "0xbf43c3602455798c1a61a596e0d95278864c552fafe231c063b3fabf97a8febc",
      HASH_TYPE: "type",
      TX_HASH: "0x1d60cb8f4666e039f418ea94730b1a8c5aa0bf2f7781474406387462924d15d4",
      INDEX: "0x0",
      DEP_TYPE: "code",
    },
    OMNI_LOCK: {
      CODE_HASH: "0x9f3aeaf2fc439549cbc870c653374943af96a0658bd6b51be8d8983183e6f52f",
      HASH_TYPE: "type",
      TX_HASH: "0xaa8ab7e97ed6a268be5d7e26d63d115fa77230e51ae437fc532988dd0c3ce10a",
      INDEX: "0x1",
      DEP_TYPE: "code",
    },
  },
});

let CONFIG = CONFIG_TESTNET;
let CKB_RPC_URL = "https://testnet.ckb.dev/rpc";
let CKB_INDEXER_URL = "https://testnet.ckb.dev/indexer";
let rpc = new RPC(CKB_RPC_URL);
let indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL);

interface EthereumRpc {
  (payload: {
    method: "personal_sign";
    params: [string /*from*/, string /*message*/] | [string /* message */];
  }): Promise<string>;
  (payload: { method: "eth_requestAccounts" }): Promise<string[]>;
}

export interface EthereumProvider {
  selectedAddress: string;
  address?: string;
  isSafePal?: boolean;
  isMetaMask?: boolean;
  enable: () => Promise<string[]>;
  addListener: (event: "accountsChanged", listener: (addresses: string[]) => void) => void;
  removeEventListener: (event: "accountsChanged", listener: (addresses: string[]) => void) => void;
  request: EthereumRpc;
}

export let ethereum = window.ethereum! as EthereumProvider;

export function asyncSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findCellSudt(cell: Cell, whiteList: Sudt[]): Sudt | undefined {
  if (cell.cell_output.type) {
    for (let index = 0; index < whiteList.length; index++) {
      const sudt = whiteList[index];
      if (sudt.type.args === cell.cell_output.type!.args) {
        return sudt;
      }
    }
  }
  return undefined;
}

type Mutable<T> = {
  -readonly [k in keyof T]: T[k];
};

export function detect(): Promise<EthereumProvider> {
  return detectEthereumProvider().then(() => window.ethereum as EthereumProvider);
}

export class PwUp implements PwUpTypes {
  config: PwUpConfig;
  isConnected = false;

  constructor(network: NetworkType) {
    if (network === "LINA") {
      config.initializeConfig(CONFIG_MAINNET);

      CONFIG = CONFIG_MAINNET;
      CKB_RPC_URL = "https://mainnet.ckb.dev/rpc";
      CKB_INDEXER_URL = "https://mainnet.ckb.dev/indexer";
      rpc = new RPC(CKB_RPC_URL);
      indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL);
    } else if (network === "AGGRON4") {
      config.initializeConfig(CONFIG_TESTNET);

      CONFIG = CONFIG_TESTNET;
      CKB_RPC_URL = "https://testnet.ckb.dev/rpc";
      CKB_INDEXER_URL = "https://testnet.ckb.dev/indexer";
      rpc = new RPC(CKB_RPC_URL);
      indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL);
    } else {
      throw new Error("unknown network type: " + network);
    }

    if (network === "AGGRON4") {
      this.config = {
        network: "AGGRON4",
        supportedSudts: TESTNET_WHITELIST,
        ckbRpcUrl: CKB_RPC_URL,
        indexerRpcUrl: CKB_INDEXER_URL,
        pwLockScriptConfig: CONFIG.SCRIPTS.PW_LOCK,
        omniLockScriptConfig: CONFIG.SCRIPTS.OMNI_LOCK,
      };
    } else if (network === "LINA") {
      this.config = {
        network: "LINA",
        supportedSudts: MAINNET_WHITELIST,
        ckbRpcUrl: CKB_RPC_URL,
        indexerRpcUrl: CKB_INDEXER_URL,
        pwLockScriptConfig: CONFIG.SCRIPTS.PW_LOCK,
        omniLockScriptConfig: CONFIG.SCRIPTS.OMNI_LOCK,
      };
    } else {
      throw new Error("Network not supported");
    }
  }

  async connectToWallet(): Promise<void> {
    // wait 300ms for ethereum provider to be ready
    const ethereum = await detect();
    if (!ethereum) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!window.ethereum) throw new Error("No ethereum provider found");

    await ethereum.request({ method: "eth_requestAccounts" }).then(([ethAddr]: string[]) => {
      this.isConnected = true;
      console.log("Connected to wallet", ethAddr);
    });
  }

  getEthAddress(): Address {
    if (ethereum && ethereum.selectedAddress) {
      return ethereum.selectedAddress;
    } else if (ethereum && ethereum.address) {
      return ethereum.address;
    } else {
      throw new Error("Please connect wallet first");
    }
  }

  getPwAddress(): Address {
    const pwLock: Script = {
      code_hash: CONFIG.SCRIPTS.PW_LOCK.CODE_HASH,
      hash_type: CONFIG.SCRIPTS.PW_LOCK.HASH_TYPE,
      args: this.getEthAddress(),
    };

    const pwAddr = helpers.generateAddress(pwLock);
    return pwAddr;
  }

  getOmniAddress(): Address {
    const omniLock: Script = {
      code_hash: CONFIG.SCRIPTS.OMNI_LOCK.CODE_HASH,
      hash_type: CONFIG.SCRIPTS.OMNI_LOCK.HASH_TYPE,
      // omni flag       pubkey hash   omni lock flags
      // chain identity   eth addr      function flag()
      // 00: Nervos       👇            00: owner
      // 01: Ethereum     👇            01: administrator
      //      👇          👇            👇
      args: `0x01${this.getEthAddress().substring(2)}00`,
    };

    const omniAddr = helpers.generateAddress(omniLock);
    return omniAddr;
  }

  getSudtWhiteList(): Sudt[] {
    return this.config.supportedSudts;
  }

  async listSudtCells(address?: string | undefined): Promise<SudtGroup[]> {
    const fromScript = helpers.parseAddress(address || this.getPwAddress());
    const collector = indexer.collector({
      lock: fromScript,
      type: {
        code_hash: CONFIG.SCRIPTS.SUDT.CODE_HASH,
        hash_type: CONFIG.SCRIPTS.SUDT.HASH_TYPE,
        args: "0x",
      },
    });

    const groups: Map<string, Mutable<SudtGroup>> = new Map();

    for await (const cell of collector.collect()) {
      const result = findCellSudt(cell, this.getSudtWhiteList());
      if (result) {
        if (!groups.has(result.type.args)) {
          groups.set(result.type.args, { cells: [], sudt: result, amount: BI.from(0) });
        }

        const group = groups.get(result.type.args);
        if (!group) throw new Error("Impossible error");

        group.cells.push(cell);
        group.amount = group.amount.add(BI.from(utils.readBigUInt128LECompatible(cell.data)));
      }
    }
    return Array.from(groups.values());
  }

  async transferPwToOmni(groups: SudtGroup[], targetLock = this.getOmniAddress()): Promise<Address> {
    let tx = helpers.TransactionSkeleton({});

    if (!this.checkAddress(targetLock)) {
      throw new Error("Invalid target address");
    }

    debug("transfer target", targetLock);

    const fromScript = helpers.parseAddress(this.getPwAddress());
    const toScript = helpers.parseAddress(targetLock);

    if (toScript.code_hash !== CONFIG.SCRIPTS.OMNI_LOCK.CODE_HASH) {
      throw new Error("Now only support transfer to a Omni-lock");
    }

    debug("from script", fromScript);
    debug("to script", toScript);

    const inputCells: Cell[] = groups.flatMap((group) => group.cells);
    const ouputCells: Cell[] = inputCells.map((cell) => {
      return {
        ...cell,
        cell_output: {
          ...cell.cell_output,
          lock: toScript,
          // add 2 ckb for omni lock
          capacity: BI.from(cell.cell_output.capacity).add(BI.from(200000000)).toHexString(),
        },
      };
    });

    let payFeeFlag = false;
    // this is a example tx fee
    const txFee = BI.from(100000);
    const appendSudtCapacity = BI.from(200000000).mul(inputCells.length);

    // TODO try to extract ckb input cells for tx fee, but now it seems that ckb in input cells are not enough

    // for (let index = 0; index < ouputCells.length; index++) {
    //   const cell = ouputCells[index];
    //   const minimalCapacity = helpers.minimalCellCapacity(cell);
    //   if (BI.from(minimalCapacity).add(txFee).lt(BI.from(cell.cell_output.capacity))) {
    //     cell.cell_output.capacity = BI.from(cell.cell_output.capacity).sub(txFee).toHexString();
    //     payFeeFlag = true;
    //     break;
    //   }
    // }

    // pay tx fee if can't squash any ckb from input sudt cells
    if (!payFeeFlag) {
      const dummySudtCell: Cell = {
        cell_output: {
          capacity: "0x0",
          lock: fromScript,
        },
        data: "0x",
      };
      const needCapacity = BI.from(helpers.minimalCellCapacity(dummySudtCell)).add(txFee).add(appendSudtCapacity);
      let collectedSum = BI.from(0);
      const collector = indexer.collector({ lock: fromScript, type: "empty", outputDataLenRange: ["0x0", "0x1"] });
      for await (const cell of collector.collect()) {
        const hasNoData = !cell.data || cell.data === "0x";
        const hasNoType = !cell.cell_output.type;
        if (hasNoData && hasNoType) {
          collectedSum = collectedSum.add(BI.from(cell.cell_output.capacity));
          inputCells.push(cell);
        }

        if (collectedSum.gte(needCapacity)) break;
      }
      if (collectedSum.lt(needCapacity)) {
        const neededAdditional = humanize(needCapacity, { decimals: 8 });
        const actualCollected = humanize(collectedSum, { decimals: 8 });
        console.log("actual collected", actualCollected);

        throw new Error(
          `From address CKB is not enough, send at least ${neededAdditional} CKB to ${this.getPwAddress()} to continue`
        );
      }
      ouputCells.push({
        cell_output: {
          capacity: collectedSum.sub(txFee).sub(appendSudtCapacity).toHexString(),
          lock: fromScript,
        },
        data: "0x",
      });
    }

    tx = tx.update("inputs", (inputs) => inputs.push(...inputCells));
    tx = tx.update("outputs", (outputs) => outputs.push(...ouputCells));
    tx = tx.update("cellDeps", (cellDeps) =>
      cellDeps.push(
        // pw-lock dep
        {
          out_point: {
            tx_hash: CONFIG.SCRIPTS.PW_LOCK.TX_HASH,
            index: CONFIG.SCRIPTS.PW_LOCK.INDEX,
          },
          dep_type: CONFIG.SCRIPTS.PW_LOCK.DEP_TYPE,
        },
        // pw-lock is dependent on secp256k1
        {
          out_point: {
            tx_hash: CONFIG.SCRIPTS.SECP256K1_BLAKE160.TX_HASH,
            index: CONFIG.SCRIPTS.SECP256K1_BLAKE160.INDEX,
          },
          dep_type: CONFIG.SCRIPTS.SECP256K1_BLAKE160.DEP_TYPE,
        },
        // sudt dep
        {
          out_point: {
            tx_hash: CONFIG.SCRIPTS.SUDT.TX_HASH,
            index: CONFIG.SCRIPTS.SUDT.INDEX,
          },
          dep_type: CONFIG.SCRIPTS.SUDT.DEP_TYPE,
        }
      )
    );

    const messageForSigning = (() => {
      const rawTxHash = utils.ckbHash(
        core.SerializeRawTransaction(
          toolkit.normalizers.NormalizeRawTransaction(helpers.createTransactionFromSkeleton(tx))
        )
      );

      // serialized unsigned witness
      const serializedWitness = core.SerializeWitnessArgs({
        // secp256k1 placeholder
        lock: new toolkit.Reader("0x" + "00".repeat(65)),
      });

      // just like P2PKH
      // https://github.com/nervosnetwork/ckb-system-scripts/wiki/How-to-sign-transaction
      const keccak = createKeccak("keccak256");
      keccak.update(Buffer.from(new Uint8Array(rawTxHash.toArrayBuffer())));

      const lengthBuffer = new ArrayBuffer(8);
      const view = new DataView(lengthBuffer);
      view.setUint32(0, serializedWitness.byteLength, true);

      keccak.update(Buffer.from(new Uint8Array(lengthBuffer)));
      keccak.update(Buffer.from(new Uint8Array(serializedWitness)));

      return "0x" + keccak.digest("hex");
    })();
    const address = ethereum.address || ethereum.selectedAddress;
    let signedMessage = await ethereum.request({
      method: "personal_sign",
      params: ethereum.isSafePal ? [messageForSigning] : [address, messageForSigning],
    });

    let v = Number.parseInt(signedMessage.slice(-2), 16);
    if (v >= 27) v -= 27;
    signedMessage = "0x" + signedMessage.slice(2, -2) + v.toString(16).padStart(2, "0");

    const signedWitness = new toolkit.Reader(
      core.SerializeWitnessArgs({
        lock: new toolkit.Reader(signedMessage),
      })
    ).serializeJson();

    tx = tx.update("witnesses", (witnesses) => witnesses.push(signedWitness));

    const signedTx = helpers.createTransactionFromSkeleton(tx);
    const txHash = await rpc.send_transaction(signedTx, "passthrough");

    return txHash;
  }

  checkAddress(address: Address): boolean {
    try {
      helpers.parseAddress(address);
      return true;
    } catch {
      return false;
    }
  }
}
