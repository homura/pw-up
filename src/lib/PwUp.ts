import { SUDT_WHITE_LIST } from "./tokenList";
import { NetworkType, PwUpConfig, PwUpTypes, Sudt, SudtCell } from "./PwUpTypes";
import { BI, Cell, config, core, helpers, Indexer, RPC, toolkit, utils, Address, Script } from "@ckb-lumos/lumos";
import { default as createKeccak } from "keccak";

export const CONFIG = config.createConfig({
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

config.initializeConfig(CONFIG);

const CKB_RPC_URL = "https://testnet.ckb.dev/rpc";
const CKB_INDEXER_URL = "https://testnet.ckb.dev/indexer";
const rpc = new RPC(CKB_RPC_URL);
const indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL);

// prettier-ignore
interface EthereumRpc {
    (payload: { method: 'personal_sign'; params: [string /*from*/, string /*message*/] }): Promise<string>;
}

// prettier-ignore
export interface EthereumProvider {
    selectedAddress: string;
    isMetaMask?: boolean;
    enable: () => Promise<string[]>;
    addListener: (event: 'accountsChanged', listener: (addresses: string[]) => void) => void;
    removeEventListener: (event: 'accountsChanged', listener: (addresses: string[]) => void) => void;
    request: EthereumRpc;
}

// @ts-ignore
export const ethereum = window.ethereum as EthereumProvider;

export function asyncSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findCellSudt(cell: Cell, whiteList: Sudt[]): Sudt | undefined {
  if (cell.cell_output.type) {
    for (let index = 0; index < whiteList.length; index++) {
      const sudt = whiteList[index];
      if (
        sudt.type.code_hash === cell.cell_output.type!.code_hash &&
        sudt.type.hash_type === cell.cell_output.type!.hash_type &&
        sudt.type.args === cell.cell_output.type!.args
      ) {
        return sudt;
      }
    }
  }
  return undefined;
}

export class PwUp implements PwUpTypes {
  config: PwUpConfig;
  isConnected: boolean;
  constructor(network: NetworkType) {
    this.isConnected = false;
    if (network === "AGGRON4") {
      this.config = {
        network: "AGGRON4",
        supportedSudts: SUDT_WHITE_LIST as Sudt[],
        ckbRpcUrl: CKB_RPC_URL,
        indexerRpcUrl: CKB_INDEXER_URL,
        pwLockScriptConfig: CONFIG.SCRIPTS.PW_LOCK,
        omniLockScriptConfig: CONFIG.SCRIPTS.OMNI_LOCK,
      };
    } else if (network === "LINA") {
      this.config = {
        network: "LINA",
        supportedSudts: SUDT_WHITE_LIST as Sudt[],
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
    ethereum
      .enable()
      .then(([ethAddr]: string[]) => {
        this.isConnected = true;
        console.log("Connected to wallet", ethAddr);
      })
  }

  getEthAddress(): Address {
    return ethereum.selectedAddress;
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
    return this.config.supportedSudts || SUDT_WHITE_LIST;
  }

  async listSudtCells(address?: string | undefined): Promise<SudtCell[]> {
    const fromScript = helpers.parseAddress(this.getPwAddress());
    const collectedCells: SudtCell[] = [];
    const collector = indexer.collector({ lock: fromScript });
    for await (const cell of collector.collect()) {
      const result = findCellSudt(cell, this.getSudtWhiteList());
      if (result) {
        collectedCells.push({
          sudt: result,
          cell,
          amount: BI.from(utils.readBigUInt128LE(cell.data)),
        });
      }
    }
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  }

  async transferPwToOmni(cells: SudtCell[]): Promise<Address> {
    let tx = helpers.TransactionSkeleton({});
    const fromScript = helpers.parseAddress(this.getPwAddress());
    const toScript = helpers.parseAddress(this.getOmniAddress());

    const inputCells: Cell[] = cells.map((cell) => cell.cell);
    const ouputCells: Cell[] = inputCells.map((cell) => {
      return {
        ...cell,
        lock: toScript,
      };
    });

    let payFeeFlag = false;
    // this is a example tx fee
    const txFee = BI.from(100000);
    for (let index = 0; index < ouputCells.length; index++) {
      const cell = ouputCells[index];
      const minimalCapacity = helpers.minimalCellCapacity(cell);
      if (BI.from(minimalCapacity).add(txFee).lt(BI.from(cell.cell_output.capacity))) {
        cell.cell_output.capacity = BI.from(cell.cell_output.capacity).sub(txFee).toHexString();
        payFeeFlag = true;
        break;
      }
    }

    // pay tx fee if can't squash any ckb from sudt cells
    if (!payFeeFlag) {
      const dummySudtCell: Cell = {
        cell_output: {
          capacity: "0x0",
          lock: fromScript,
        },
        data: "0x",
      };
      const needCapacity = BI.from(helpers.minimalCellCapacity(dummySudtCell)).add(txFee);
      let collectedSum = BI.from(0);
      const collector = indexer.collector({ lock: fromScript, type: "empty" });
      for await (const cell of collector.collect()) {
        if (!cell.data || cell.data === "0x" || cell.data === "0x0" || cell.data === "0x00") {
          collectedSum = collectedSum.add(BI.from(cell.cell_output.capacity));
          inputCells.push(cell);
          if (collectedSum.gte(needCapacity)) break;
        }
      }
      ouputCells.push({
        cell_output: {
          capacity: collectedSum.sub(txFee).toHexString(),
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
      view.setBigUint64(0, BigInt(new toolkit.Reader(serializedWitness).length()), true);

      keccak.update(Buffer.from(new Uint8Array(lengthBuffer)));
      keccak.update(Buffer.from(new Uint8Array(serializedWitness)));

      return "0x" + keccak.digest("hex");
    })();

    let signedMessage = await ethereum.request({
      method: "personal_sign",
      params: [ethereum.selectedAddress, messageForSigning],
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
}
