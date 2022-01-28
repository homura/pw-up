import { PwUpConfig, PwUpTypes, SudtCell } from "./PwUpTypes";
import { BI, Cell, config, core, helpers, Indexer, RPC, toolkit, utils, Address } from "@ckb-lumos/lumos";
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

export class PwUp implements PwUpTypes {
  config: PwUpConfig;
  isConnected: boolean;
  constructor(config: PwUpConfig) {
    this.config = config;
    this.isConnected = false;
  }
  async connectToWallet():Promise<void> {
    return new Promise((resolve, reject) => {
      this.isConnected = true;
      resolve();
    })
  }
  
  getEthAddress(): Address{
    return "0x0000000000000000000000000000000000000000"
  };
  getPwAddress(): Address{
    return "0x0000000000000000000000000000000000000000"
  };
  getOmniAddress(): Address{
    return "0x0000000000000000000000000000000000000000"
  };

  listSudtCells(address?: string | undefined):Promise<SudtCell[]>{
    return new Promise((resolve, reject) => {
      resolve([])
    })
  }
  async transferPwToOmni(cells: SudtCell[]):Promise<Address>{
    let tx = helpers.TransactionSkeleton({});
  const fromScript = helpers.parseAddress(this.getPwAddress());
  const toScript = helpers.parseAddress(this.getOmniAddress());

  // additional 0.001 ckb for tx fee
  // the tx fee could calculated by tx size
  // this is just a simple example
  const totalCkb = cells.reduce((acc, cell) => acc.add(cell.cell.cell_output.capacity), BI.from(0));

  const collectedCells = cells.map((cell) => cell.cell);
  // const neededCapacity = BI.from(options.amount).add(100000n);
  // let collectedSum = BI.from(0);
  // const collectedCells: Cell[] = [];
  // const collector = indexer.collector({ lock: fromScript, type: "empty" });
  // for await (const cell of collector.collect()) {
  //   collectedSum = collectedSum.add(cell.cell_output.capacity);
  //   collectedCells.push(cell);
  //   if (BI.from(collectedSum).gte(neededCapacity)) break;
  // }

  // if (collectedSum.lt(neededCapacity)) {
  //   throw new Error(`Not enough CKB, expected: ${neededCapacity}, actual: ${collectedSum} `);
  // }

  const sudtCellCapacity = BI.from(114).mul(100000000)

  const transferOutput: Cell = {
    cell_output: {
      capacity: sudtCellCapacity.toHexString(),
      lock: toScript,
      type: cells[0].sudt.type,
    },
    data: "0x",
  };

  const changeOutput: Cell = {
    cell_output: {
      // additional 0.001 ckb for tx fee
      capacity: totalCkb.sub(sudtCellCapacity).sub(100000n).toHexString(),
      lock: fromScript,
    },
    data: "0x",
  };

  tx = tx.update("inputs", (inputs) => inputs.push(...collectedCells));
  tx = tx.update("outputs", (outputs) => outputs.push(transferOutput, changeOutput));
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