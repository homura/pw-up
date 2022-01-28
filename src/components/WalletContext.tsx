import React, { useEffect, useState } from "react";
import "../css/WalletContext.css";
import { asyncSleep, ethereum, PwUp } from "../lib/PwUp";
import { SudtCell } from "../lib/PwUpTypes";

export default function WalletContext() {
  const [ethAddr, setEthAddr] = useState("");

  const [pwAddr, setPwAddr] = useState("");
  const [pwSudtCells, setPwSudtCells] = useState<SudtCell[]>([]);

  const [omniAddr, setOmniAddr] = useState("");
  const [omniSudtCells, setOminiSudtCells] = useState<SudtCell[]>([]);

  const [transSudtCells, setTransSudtCells] = useState<SudtCell[]>([]);
  const [checkedState, setCheckedState] = useState<boolean[]>([]);

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
    pwUp.connectToWallet().then(() => {
      const ethAddr = pwUp.getEthAddress();
      setEthAddr(ethAddr);

      const pwAddr = pwUp.getPwAddress();
      setPwAddr(pwAddr);
      const omniAddr = pwUp.getOmniAddress();
      setOmniAddr(omniAddr);

      pwUp.listSudtCells().then((cells) => {
        setPwSudtCells(cells);
        setCheckedState(new Array(cells.length).fill(true));
      });

      pwUp.listSudtCells(omniAddr).then((cells) => {
        setOminiSudtCells(cells);
      });
    });
  }

  function handleOnChange(position: number) {
    const updatedCheckedState = checkedState.map((item, index) => (index === position ? !item : item));

    setCheckedState(updatedCheckedState);

    const transSudt: SudtCell[] = [];
    for (let i = 0; i < checkedState.length; i++) {
      if (checkedState[i]) {
        transSudt.push(pwSudtCells[i]);
      }
    }

    setTransSudtCells(transSudt);
  }

  // @ts-ignore
  function switchNet(event) {
    setPwUp(new PwUp(event.target.value));
    connectToMetaMask();
  }

  function onTransfer() {
    if (isSendingTx) return;
    setIsSendingTx(true);

    pwUp
      .transferPwToOmni(transSudtCells)
      .then(setTxHash)
      .then(() => {
        const omniAddr = pwUp.getOmniAddress();
        setOmniAddr(omniAddr);
      });
  }

  if (!ethereum) return <div>MetaMask is not installed</div>;
  if (!ethAddr) return <button onClick={connectToMetaMask}>Connect to MetaMask</button>;

  return (
    <div>
      <h3>Ethereum Address: {ethAddr}</h3>

      {/* @ts-ignore */}
      <div onChange={switchNet.bind(this)}>
        <input type="radio" value="AGGRON4" defaultChecked name="net" /> AGGRON4
        <input type="radio" value="LINA" name="net" /> LINA
      </div>

      <div className="account-info">
        <h4>PW-Lock</h4>
        <ul>
          <li>Address: {pwAddr}</li>
          <li>
            SudtCells:
            {pwSudtCells.map((pwSudtCell, i) => (
              <p key={i}>
                <input type="checkbox" id="i" value="i" defaultChecked={true} onChange={() => handleOnChange(i)} />
                <label htmlFor="i">
                  {pwSudtCell.sudt.name}, {pwSudtCell.amount.toString()}
                </label>
              </p>
            ))}
          </li>
        </ul>
      </div>

      <div className="account-info">
        <h4>Omni-Lock</h4>
        <ul>
          <li>Address: {omniAddr}</li>
          <li>
            SudtCells:
            <ul>
              {omniSudtCells.map((omniSudtCell, i) => (
                <li key={i}>
                  {omniSudtCell.sudt.name}, {omniSudtCell.amount.toString()}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>

      <div>
        <button onClick={onTransfer} disabled={isSendingTx}>
          Transfer
        </button>

        <p>Tx Hash: {txHash}</p>
      </div>
    </div>
  );
}
