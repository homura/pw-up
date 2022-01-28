import React, { useEffect, useState } from "react";
import "../css/WalletContext.css"
import { helpers, Script } from "@ckb-lumos/lumos";
import { asyncSleep, capacityOf, CONFIG } from "../lib/lib";
import { EthereumProvider } from "../lib/PwUpTypes";

// @ts-ignore
const ethereum = window.ethereum as EthereumProvider;

export default function WalletContext() {
  const [ethAddr, setEthAddr] = useState("");

  const [pwAddr, setPwAddr] = useState("");
  const [pwBalance, setPwBalance] = useState("-");

  const [omniAddr, setOmniAddr] = useState("");
  const [omniBalance, setOmniBalance] = useState("-");

  // const [transferAddr, setTransferAddress] = useState("");
  // const [transferAmount, setTransferAmount] = useState("");

  // const [isSendingTx, setIsSendingTx] = useState(false);
  // const [txHash, setTxHash] = useState("");

  useEffect(() => {
    asyncSleep(100).then(() => {
      if (ethereum.selectedAddress) connectToMetaMask();
      ethereum.addListener("accountsChanged", connectToMetaMask);
    });
  }, []);

  function connectToMetaMask() {
    ethereum
      .enable()
      .then(([ethAddr]: string[]) => {
        const pwLock: Script = {
          code_hash: CONFIG.SCRIPTS.PW_LOCK.CODE_HASH,
          hash_type: CONFIG.SCRIPTS.PW_LOCK.HASH_TYPE,
          args: ethAddr
        };

        const pwAddr = helpers.generateAddress(pwLock);
        setPwAddr(pwAddr);

        setEthAddr(ethAddr);

        return pwAddr;
      })
      .then((pwAddr) => capacityOf(pwAddr))
      .then((balance) => {
        setPwBalance(balance.toString());
      });

      ethereum
      .enable()
      .then(([ethAddr]: string[]) => {

        const omniLock: Script = {
          code_hash: CONFIG.SCRIPTS.OMNI_LOCK.CODE_HASH,
          hash_type: CONFIG.SCRIPTS.OMNI_LOCK.HASH_TYPE,
          // omni flag       pubkey hash   omni lock flags
          // chain identity   eth addr      function flag()
          // 00: Nervos       👇            00: owner
          // 01: Ethereum     👇            01: administrator
          //      👇          👇            👇
          args: `0x01${ethAddr.substring(2)}00`,
        };

        const omniAddr = helpers.generateAddress(omniLock);
        setOmniAddr(omniAddr);

        return omniAddr;
      })
      .then((omniAddr) => capacityOf(omniAddr))
      .then((balance) => {
        setOmniBalance(balance.toString());
      });
  }

  // function onTransfer() {
  //   if (isSendingTx) return;
  //   setIsSendingTx(true);

  //   // transfer({amount: transferAmount, from: pwAddr, to: transferAddr})
  //   //   .then(setTxHash);
  // }

  if (!ethereum) return <div>MetaMask is not installed</div>;
  if (!ethAddr) return <button onClick={connectToMetaMask}>Connect to MetaMask</button>;

  return (
    <div>
      <h3>Ethereum Address: {ethAddr}</h3>

      <div className="account-info">
      <h4>PW-Lock</h4>
      <ul>
        <li>Address: {pwAddr}</li>
        <li>Balance: {pwBalance}</li>
        <li>
          <label htmlFor="sudt">SUDT balance: </label>
          <select id="sudt">
            <option value="usdc">USDC 100</option>
          </select>
        </li>
      </ul>
      </div>

      <div className="account-info">
      <h4>Omni-Lock</h4>
      <ul>
        <li>Address: {omniAddr}</li>
        <li>Balance: {omniBalance}</li>
        <li>
          <label htmlFor="sudt">SUDT balance: </label>
          <select id="sudt">
            <option value="usdc">USDC 100</option>
          </select>
        </li>
      </ul>
      </div>

      {/* <div>
        <h2>Transfer to</h2>
        <label htmlFor="address">Address</label>&nbsp;
        <input id="address" type="text" onChange={(e) => setTransferAddress(e.target.value)} placeholder="ckt1..."/>
        <br/>
        <label htmlFor="amount">Amount</label>
        &nbsp;
        <input id="amount" type="text" onChange={(e) => setTransferAmount(e.target.value)} placeholder="shannon"/>
        <br/>
        <button onClick={onTransfer} disabled={isSendingTx}>
          Transfer
        </button>
        <p>Tx Hash: {txHash}</p>
      </div> */}

      <div>
      <button>Transfer</button>
      </div>
    </div>
  );
}