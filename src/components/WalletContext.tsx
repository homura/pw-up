import React, { useEffect, useState } from "react";
import "../css/WalletContext.css"
import { helpers, Script } from "@ckb-lumos/lumos";
import { asyncSleep, capacityOf, CONFIG, ethereum } from "../lib/lib";

export default function WalletContext() {
  const [ethAddr, setEthAddr] = useState("");

  const [pwAddr, setPwAddr] = useState("");
  const [pwLock, setPwLock] = useState<Script>();
  const [pwBalance, setPwBalance] = useState("-");

  const [omniAddr, setOmniAddr] = useState("");
  const [omniLock, setOmniLock] = useState<Script>();
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
        setPwLock(pwLock);

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
        setOmniLock(omniLock);


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
      <ul>
        <li>Nervos Address(PW): {pwAddr}</li>
        <li>
          Current PW lock script:
          <pre>{JSON.stringify(pwLock, null, 2)}</pre>
        </li>
        <li>Balance: {pwBalance}</li>
      </ul>
      </div>

      <div className="account-info">
      <ul>
        <li>Nervos Address(Omni): {omniAddr}</li>
        <li>
          Current Omni lock script:
          <pre>{JSON.stringify(omniLock, null, 2)}</pre>
        </li>
        <li>Balance: {omniBalance}</li>
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
    </div>
  );
}