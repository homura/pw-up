import React, { useEffect, useState } from "react";
import "../css/WalletContext.css"
import { asyncSleep, ethereum, PwUp } from "../lib/PwUp";
import { SudtCell } from "../lib/PwUpTypes";

export default function WalletContext() {
  const [ethAddr, setEthAddr] = useState("");

  const [pwAddr, setPwAddr] = useState("");
  const [pwSudtCells, setPwSudtCells] = useState<SudtCell[]>([]);

  const [omniAddr, setOmniAddr] = useState("");
  const [omniSudtCells, setOminiSudtCells] = useState<SudtCell[]>([]);

  const [pwUp, setPwUp] = useState(new PwUp("AGGRON4"));

  const [isSendingTx, setIsSendingTx] = useState(false);
  const [txHash, setTxHash] = useState("");

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
        pwUp.connectToWallet();
        setEthAddr(ethAddr);

        const pwAddr = pwUp.getPwAddress();
        setPwAddr(pwAddr);

        return pwAddr;
      })
      .then((pwAddr) => pwUp.listSudtCells(pwAddr))
      .then((pwSudtCells) => {
        setPwSudtCells(pwSudtCells);
      });

      ethereum
      .enable()
      .then(() => {
        const omniAddr = pwUp.getOmniAddress();
        setOmniAddr(omniAddr);

        return omniAddr;
      })
      .then((omniAddr) => pwUp.listSudtCells(omniAddr))
      .then((omniSudtCells) => {
        setOminiSudtCells(omniSudtCells);
      });
  }

  function onTransfer() {
    if (isSendingTx) return;
    setIsSendingTx(true);

    pwUp.transferPwToOmni(pwSudtCells)
      .then(setTxHash);

    // TODO: hide tx hash / refresh omnilock sudt
  }

  if (!ethereum) return <div>MetaMask is not installed</div>;
  if (!ethAddr) return <button onClick={connectToMetaMask}>Connect to MetaMask</button>;

  return (
    <div>
      <h3>Ethereum Address: {ethAddr}</h3>

      <div className="account-info">
      <h4>PW-Lock</h4>
      <ul>
        <li>Address: {pwAddr}</li>
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
        <li>
          <label htmlFor="sudt">SUDT balance: </label>
          <select id="sudt">
            <option value="usdc">USDC 100</option>
          </select>
        </li>
      </ul>
      </div>

      <div>
      <button  onClick={onTransfer} disabled={isSendingTx}>Transfer</button>
      
      <p>Tx Hash: {txHash}</p>
      </div>
    </div>
  );
}