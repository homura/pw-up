import React, { useEffect, useState } from "react";
import "../css/WalletContext.css";
import { asyncSleep, ethereum, PwUp } from "../lib/PwUp";
import { SudtGroup } from "../lib/PwUpTypes";
import { humanize } from "../lib/amount";

export default function WalletContext() {
  const [ethAddr, setEthAddr] = useState("");

  const [pwAddr, setPwAddr] = useState("");
  const [pwSudtCells, setPwSudtCells] = useState<SudtGroup[]>([]);

  const [omniAddr, setOmniAddr] = useState("");
  const [omniSudtCells, setOminiSudtCells] = useState<SudtGroup[]>([]);

  const [transSudtCells, setTransSudtCells] = useState<SudtGroup[]>([]);
  const [checkedState, setCheckedState] = useState<boolean[]>([]);

  const [pwUp, setPwUp] = useState(() => new PwUp("AGGRON4"));

  const [isSendingTx, setIsSendingTx] = useState(false);
  const [txHash, setTxHash] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    asyncSleep(100).then(() => {
      if (ethereum.selectedAddress) connectToMetaMask();
      ethereum.addListener("accountsChanged", connectToMetaMask);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ethereum.selectedAddress) connectToMetaMask();
  }, [pwUp]); // eslint-disable-line react-hooks/exhaustive-deps

  function connectToMetaMask() {
    setIsConnecting(true);
    pwUp
      .connectToWallet()
      .then(async () => {
        const ethAddr = pwUp.getEthAddress();
        setEthAddr(ethAddr);

        const pwAddr = pwUp.getPwAddress();
        setPwAddr(pwAddr);
        const omniAddr = pwUp.getOmniAddress();
        setOmniAddr(omniAddr);
        setInputVal(omniAddr);

        const listPwSudtsTask = pwUp.listSudtCells(pwAddr).then((cells) => {
          setPwSudtCells(cells);
          setTransSudtCells(cells);
          setCheckedState(new Array(cells.length).fill(true));
        });

        const listOmniSudtsTask = pwUp.listSudtCells(omniAddr).then((cells) => {
          setOminiSudtCells(cells);
        });

        await Promise.all([listPwSudtsTask, listOmniSudtsTask]);
      })
      .finally(() => setIsConnecting(false));
  }

  function handleOnChange(position: number) {
    const updatedCheckedState = checkedState.map((item, index) => (index === position ? !item : item));

    setCheckedState(updatedCheckedState);

    const transSudt: SudtGroup[] = [];
    for (let i = 0; i < updatedCheckedState.length; i++) {
      if (updatedCheckedState[i]) {
        transSudt.push(pwSudtCells[i]);
      }
    }

    setTransSudtCells(transSudt);
  }

  function switchNet(network: string) {
    if (network !== "LINA" && network !== "AGGRON4") {
      throw new Error("Unknown network type");
    }

    setPwUp(new PwUp(network));
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

  if (!ethereum) return <div>MetaMask is not installed</div>;
  if (!ethAddr)
    return (
      <button className="button is-info" onClick={connectToMetaMask}>
        Connect to MetaMask
      </button>
    );

  if (isConnecting) {
    return <h2 className="title is-4">Please wait...</h2>;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3 className="title is-4">Ethereum Address: {ethAddr}</h3>

      <div>
        <label className="radio">
          <input
            type="radio"
            value="AGGRON4"
            name="net"
            checked={pwUp.config.network === "AGGRON4"}
            onChange={(e) => switchNet(e.target.value)}
          />{" "}
          AGGRON4
        </label>
        <label className="radio">
          <input
            type="radio"
            value="LINA"
            name="net"
            checked={pwUp.config.network === "LINA"}
            onChange={(e) => switchNet(e.target.value)}
          />{" "}
          LINA
        </label>
      </div>

      <div className="box account-info">
        <div className="content">
          <h4>FROM</h4>
          <ul>
            <li>Address: {pwAddr}</li>
            <li>
              SudtCells:
              {pwSudtCells.map((pwSudtCell, i) => (
                <p key={i}>
                  <input type="checkbox" id="i" value="i" defaultChecked={true} onChange={() => handleOnChange(i)} />
                  <label htmlFor="i" style={{ marginLeft: "4px" }}>
                    {humanize(pwSudtCell.amount, { decimals: pwSudtCell.sudt.decimals })} {pwSudtCell.sudt.symbol}
                  </label>
                </p>
              ))}
            </li>
          </ul>
        </div>
      </div>

      <div className="box account-info">
        <div className="content">
          <h4>TO</h4>
          <ul>
            <li>
              Address:{" "}
              {isEditing ? (
                <input
                  className="input is-info"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                />
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
                    {humanize(omniSudtCell.amount, { decimals: omniSudtCell.sudt.decimals })} {omniSudtCell.sudt.symbol}
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <div>
        <button
          className="button is-info"
          onClick={onTransfer}
          disabled={isSendingTx || checkedState.every((checked) => !checked)}
        >
          Transfer
        </button>

        <div>
          {txHash === "" ? null : (
            <div>
              <p>Tx Hash: {txHash}</p>
              {pwUp.config.network === "AGGRON4" ? (
                <a href={`https://explorer.nervos.org/aggron/transaction/${txHash}`}>View on Explorer</a>
              ) : (
                <a href={`https://explorer.nervos.org/transaction/${txHash}`}>View on Explorer</a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
