import React, { useEffect, useState } from "react";
import "../css/WalletContext.css";
import { asyncSleep, ethereum, PwUp } from "../lib/PwUp";
import { SudtGroup } from "../lib/PwUpTypes";

export default function WalletContext() {
  const [ethAddr, setEthAddr] = useState("");

  const [pwAddr, setPwAddr] = useState("");
  const [pwSudtCells, setPwSudtCells] = useState<SudtGroup[]>([]);

  const [omniAddr, setOmniAddr] = useState("");
  const [omniSudtCells, setOminiSudtCells] = useState<SudtGroup[]>([]);

  const [transSudtCells, setTransSudtCells] = useState<SudtGroup[]>([]);
  const [checkedState, setCheckedState] = useState<boolean[]>([]);

  const [pwUp, setPwUp] = useState(new PwUp("AGGRON4"));

  const [isSendingTx, setIsSendingTx] = useState(false);
  const [txHash, setTxHash] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    asyncSleep(100).then(() => {
      if (ethereum.selectedAddress) connectToMetaMask();
      ethereum.addListener("accountsChanged", connectToMetaMask);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function connectToMetaMask() {
    pwUp.connectToWallet().then(() => {
      const ethAddr = pwUp.getEthAddress();
      setEthAddr(ethAddr);

      const pwAddr = pwUp.getPwAddress();
      setPwAddr(pwAddr);
      const omniAddr = pwUp.getOmniAddress();
      setOmniAddr(omniAddr);
      setInputVal(omniAddr);

      pwUp.listSudtCells().then((cells) => {
        setPwSudtCells(cells);
        setTransSudtCells(cells);
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

    const transSudt: SudtGroup[] = [];
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

    console.log(transSudtCells);

    pwUp
      .transferPwToOmni(transSudtCells, inputVal)
      .then(setTxHash)
      .catch((e) => alert(e.message || JSON.stringify(e)))
      .finally(() => setIsSendingTx(false));
  }

  function editState() {
    if (isEditing) {
      const addr = omniAddr;
      setOmniAddr(inputVal);
      pwUp
        .listSudtCells(inputVal)
        .then((cells) => {
          setOminiSudtCells(cells);
        })
        .catch((e) => {
          alert(e.message || JSON.stringify(e));
          setOmniAddr(addr);
          setInputVal(addr);
        });
    }
    setIsEditing(!isEditing);
  }

  // @ts-ignore
  function changeTargetAddr(event) {
    const targetAddr = event.target.value;
    setInputVal(targetAddr);
  }

  if (!ethereum) return <div>MetaMask is not installed</div>;
  if (!ethAddr)
    return (
      <button className="button is-info" onClick={connectToMetaMask}>
        Connect to MetaMask
      </button>
    );

  return (
    <div style={{ marginTop: 20 }}>
      <h3 className="title is-4">Ethereum Address: {ethAddr}</h3>

      {/* @ts-ignore */}
      <div onChange={switchNet.bind(this)}>
        <label className="radio">
          <input type="radio" value="AGGRON4" defaultChecked name="net" /> AGGRON4
        </label>
        <label className="radio">
          <input type="radio" value="LINA" name="net" /> LINA
        </label>
      </div>

      <div id="account-info" className="box">
        <div className="content">
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
      </div>

      <div id="account-info" className="box">
        <div className="content">
          <h4>Target Address(Omni-Lock default)</h4>
          <ul>
            <li>
              Address:{" "}
              {isEditing ? (
                /* @ts-ignore */
                <input className="input is-info" type="text" value={inputVal} onChange={changeTargetAddr.bind(this)} />
              ) : (
                <span>{omniAddr}</span>
              )}{" "}
              <button className="button is-info is-inverted is-small is-rounded" onClick={editState}>
                {isEditing ? <span>save</span> : <span>edit</span>}
              </button>
            </li>
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
      </div>

      <div>
        <button className="button is-info" onClick={onTransfer} disabled={isSendingTx}>
          =&gt;
        </button>

        <div>{txHash === "" ? null : <p>Tx Hash: {txHash}</p>}</div>
      </div>
    </div>
  );
}
