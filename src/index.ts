import { TezosToolkit } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import $ from "jquery";
import {
    Network,
    NetworkType
} from "@ecadlabs/beacon-types";
import ace from "ace-builds";
import { InMemorySigner } from "@taquito/signer";
import { cryptoUtils } from "sotez";
import { sha256 } from "js-sha256";

// const FAUCET_URL = 'https://faucet.ghostnet.teztnets.com';
const FAUCET_URL = 'https://tezos-proxy.mblockelet.info';

interface TaquitoTaskData {
    walletName: any;
    initData: (data: TaquitoTaskData) => void;
    taskStatement: (data: TaquitoTaskData) => string;
    hints: string[];
    wallet?: string;
    currentWallet?: string;
    type: string;
    uiUpdate: (data: TaquitoTaskData) => void;
    initialCode: string;
    expectedAnswer: (arg0: any, arg1: any, arg2: (correct: boolean, message?: string) => void) => void;
    validate: (arg0: any, arg1: any) => void;
    beforeExecute: (arg0: any, arg1: string | number | string[] | undefined) => any;
    gradingCallback: any;
    consoleCallback?: (arg0: string) => void;
    consoleContents?: string;
};

declare global {
    interface Window {
        taquitoTaskData: TaquitoTaskData;
        task: any;
        Tezos: TezosToolkit;
    }
}


// Shadownet — Beacon's @ecadlabs/beacon-types has a dedicated NetworkType.SHADOWNET
// enum value that Kukai recognizes. Using NetworkType.CUSTOM instead causes Kukai
// to reject pairing with NETWORK_NOT_SUPPORTED, even with the right rpcUrl —
// Kukai validates the named-network enum, not the URL. Always use the named enum
// when one exists. @taquito/beacon-wallet v24 uses ECAD Labs' Beacon fork, which
// discovers working pairing relays dynamically — unlike the old @airgap/beacon-sdk
// whose hardcoded papers.tech matrix relays are now CORS-blocked from browsers.
const SHADOWNET_RPC = "https://rpc.shadownet.teztnets.com";
const network: Network = { type: NetworkType.SHADOWNET, rpcUrl: SHADOWNET_RPC };

let Tezos: TezosToolkit|null = null;

async function getTezosToolkit() {
    let endpoints = [SHADOWNET_RPC];
    endpoints.sort(() => Math.random() - 0.5);
    for(var i = 0; i < endpoints.length; i++) {
        try {
            let tezos = new TezosToolkit(endpoints[i]);
            await tezos.rpc.getBlockHeader({ block: 'head' });
            window.Tezos = Tezos = tezos;
            return;
        } catch(e) {
            console.error("Could not connect to " + endpoints[i]);
        }
    }
}

let wallet: BeaconWallet;
let walletAuto = false;

let myAddress: string | undefined;

// interface TaquitoTaskData {
//     initData?: (data: any) => void;
//     taskStatement?: (data: any) => string;
//     initialCode?: string;
//     type: string;
// }

let editor: any;
let input: JQuery<HTMLElement> | undefined;
let nbHintsReceived = 0;


async function init() {
    if (!window.taquitoTaskData) {
        console.error("taquitoTaskData not found");
        return;
    }

    if (!$('#taquito').length) {
        $('#task').append('<div id="taquito"></div>');
    }

    $('#taquito').html('<div id="taquito-connecting">Connecting to Tezos shadownet...</div>');
    await getTezosToolkit();
    $('#taquito-connecting').remove();

    if (window.taquitoTaskData.initData) {
        window.taquitoTaskData.initData(window.taquitoTaskData);
    }

    if (window.taquitoTaskData.taskStatement) {
        $('#taquito').append('<div id="taquito-task-statement"></div>');
        $('#taquito-task-statement').html("<h3>Your task</h3><div>" + window.taquitoTaskData.taskStatement(window.taquitoTaskData) + "</div>");
    }

    if (window.taquitoTaskData.hints) {
        $('#taquito').append('<div id="taquito-hints"></div>');
        updateHints();
    }

    if (window.taquitoTaskData.wallet) {
        $('#taquito').append('<div id="taquito-wallet"></div>');
    }


    if (window.taquitoTaskData.type == "connect") {
    } else if (window.taquitoTaskData.type == "input") {
        input = $('<input id="taquito-input"></input>');
        $('#taquito').append($('<div id="taquito-input-container">Your answer : </div>').append(input));
    } else if (window.taquitoTaskData.type == "button") {
    } else if (window.taquitoTaskData.type == "editor") {
        $('#taquito').append('<div id="taquito-editor"></div>');
        //            $('#taquito').append('<button id="taquito-run">Run</button>');
        //            $('#taquito-run').click(TaquitoLib.runCode.bind(TaquitoLib));
        initEditor();
    }
    $('#taquito').append('<div id="taquito-status"></div>');
    if (window.taquitoTaskData.type == "editor") {
        $('#taquito').append('<div id="taquito-console-container">Output :<br><textarea id="taquito-console" readonly></textarea></div>');
    }

    if (window.taquitoTaskData.wallet) {
        await initWallet();
    }

    if (window.taquitoTaskData.uiUpdate) {
        window.taquitoTaskData.uiUpdate(window.taquitoTaskData);
        setTimeout(() => {
            window.taquitoTaskData.uiUpdate(window.taquitoTaskData);
        }, 10000);
    }
}

async function initWallet() {
    if (!Tezos || !window.taquitoTaskData.wallet) { return; }

    if (window.taquitoTaskData.wallet == 'any') {
        try {
            if (!localStorage.getItem('taquito-private-key-auto')) {
                throw "";
            }
            const privateKey = localStorage.getItem('taquito-private-key');
            if (privateKey) {
                const signer = await InMemorySigner.fromSecretKey(privateKey);
                walletAuto = true;
                Tezos.setProvider({ signer });
                myAddress = await signer.publicKeyHash();
                updateWallet();
                return;
            }
        } catch (e) { }
    }

    wallet = new BeaconWallet({
        name: window.taquitoTaskData.walletName || "Taquito task",
        network
    });

    Tezos.setWalletProvider(wallet);

    const activeAccount = await wallet.client.getActiveAccount();
    if (activeAccount) {
        myAddress = activeAccount.address;
    }
    updateWallet();
}

function initEditor() {
    editor = ace.edit("taquito-editor");
    editor?.getSession().setMode("ace/mode/javascript");
    editor?.setOptions({
        maxLines: 30,
        minLines: 30
    });
    if (window.taquitoTaskData.initialCode) {
        editor?.setValue(window.taquitoTaskData.initialCode);
    }
}

async function connectWallet() {
    // v24/ECAD Beacon: the network is set at BeaconWallet construction;
    // requestPermissions() no longer accepts a network argument.
    await wallet.requestPermissions();
    const pkh = await wallet.getPKH();
    myAddress = pkh;
    updateWallet();
}

interface FaucetChallenge {
    txHash?: string;
    challenge?: string;
    challengeCounter?: number;
    challengesNeeded?: number;
    difficulty?: number;
}

async function getTez(address: string) {
    let currentChallenge: FaucetChallenge = {};
    currentChallenge = await (await fetch(FAUCET_URL + '/challenge', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, amount: 1 }),
    })).json();
    while (true) {
        if (currentChallenge.txHash || !currentChallenge.challenge || !currentChallenge.difficulty) {
            $('.taquito-status').html('Funding completed.');
            break;
        }
        $('.taquito-status').html("Wallet generated, funding from faucet..." + (currentChallenge.challengeCounter && currentChallenge.challengesNeeded ? " (" + currentChallenge.challengeCounter + "/" + currentChallenge.challengesNeeded + ")" : ""));
        let nonce = 0;
        let hash = "";
        while (true) {
            nonce++;
            const combined_string = currentChallenge.challenge + ":" + nonce;
            hash = sha256(combined_string);
            if (hash.startsWith('0'.repeat(currentChallenge.difficulty))) {
                break;
            }
            if (nonce > 1000000) {
                console.error("aborting faucet challenge");
                return;
            }
        }
        currentChallenge = await (await fetch(FAUCET_URL + '/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address, nonce, solution: hash }),
        })).json();
    }
}

async function keygenWallet() {
    if(!Tezos) { return; }
    let privateKey: string | null = null;
    try {
        privateKey = localStorage.getItem('taquito-private-key');
    } catch (e) { }

    try {
        if (!privateKey) {
            $('#taquito-keygen').attr('disabled', 'disabled');
            $('#taquito-wallet').append('<div class="taquito-status">Generating wallet...</div>');
            const mnemonic = cryptoUtils.generateMnemonic();
            const keys = await cryptoUtils.generateKeys(mnemonic);
            privateKey = keys.sk;
            localStorage.setItem('taquito-private-key', privateKey);
            $('.taquito-status').html('Wallet generated, funding from faucet...');
            await getTez(keys.pkh);
        }
        const signer = await InMemorySigner.fromSecretKey(privateKey);
        walletAuto = true;
        localStorage.setItem('taquito-private-key-auto', "true");
        Tezos.setProvider({ signer });
        myAddress = await signer.publicKeyHash();
        $('#taquito-keygen').attr('disabled', null);
        updateWallet();
    } catch (error) {
        $('#taquito-wallet').append('<div class="taquito-status-error">Could not generate key. Please try again.</div>');
        $('#taquito-keygen').attr('disabled', null);
    }
}


function disconnectWallet() {
    if (walletAuto) {
        walletAuto = false;
        myAddress = undefined;
        try {
            localStorage.removeItem('taquito-private-key-auto');
        } catch (e) { }
        updateWallet();
    } else {
        wallet.clearActiveAccount().then(() => {
            myAddress = undefined;
            updateWallet();
        });
    }
}

function updateWallet() {
    window.taquitoTaskData.currentWallet = myAddress;
    if (myAddress) {
        let html = '<i class="fas fa-wallet"></i> Connected to wallet <code>' + myAddress + "</code>";
        if (walletAuto) {
            html += " (generated)";
        }
        html += ". <button id='taquito-disconnect'>Disconnect</button>";

        $('#taquito-wallet').html(html);
        $('#taquito-disconnect').click(disconnectWallet);
    } else {
        let html = '<i class="fas fa-wallet"></i> Not currently connected to a wallet.'
        html += ' <button id="taquito-connect"><i class="fas fa-link"></i> Connect</button>';
        if (window.taquitoTaskData.wallet == 'any') {
            html += ' <button id="taquito-keygen"><i class="fas fa-bolt"></i> Use auto-generated wallet</button>';
        }

        $('#taquito-wallet').html(html);
        $('#taquito-connect').click(connectWallet);
        $('#taquito-keygen').click(keygenWallet);
    }
}

function updateHints() {
    var hintsHtml = "<h3>Hints</h3><div id='taquito-hints-container'>";
    for (var i = 0; i < nbHintsReceived; i++) {
        hintsHtml += "<div class='taquito-hints-hint'>" + window.taquitoTaskData.hints[i] + "</div>";
    }
    if (nbHintsReceived < window.taquitoTaskData.hints.length) {
        hintsHtml += "<button id='taquito-hints-button'>Get new hint</button>";
    }
    hintsHtml += "</div>";
    $('#taquito-hints').html(hintsHtml);
    $('#taquito-hints-button').click(function () {
        nbHintsReceived++;
        updateHints();
    });
}

// const hash = await wallet.sendOperations([
//     {
//         kind: TezosOperationType.TRANSACTION,
//         destination: myAddress, // Send to ourselves
//         amount: "1", // Amount in mutez, the smallest unit in Tezos
//     },
// ]);

// const explorerLink = await wallet.client.blockExplorer.getTransactionLink(
//     hash,
//     network,
// );

function getCode() {
    if (window.taquitoTaskData.type == "input") {
        return input?.val();
    } else if (window.taquitoTaskData.type == "editor") {
        return editor?.getValue();
    }
    return "";
}

function setCode(code) {
    editor?.setValue(code);
}

function safeEval(untrustedCode) {
    return new Promise(function (resolve, reject) {
        var blobURL = URL.createObjectURL(new Blob([
            "window = self = this;\n" +
            untrustedCode
        ],
            { type: "application/javascript" }));

        var worker = new Worker(blobURL);

        URL.revokeObjectURL(blobURL);

        setTimeout(function () {
            worker.terminate();
            reject(new Error('The worker timed out.'));
        }, 30000);
    });
}


let consoleContents: string = "";
function resetConsole() {
    consoleContents = "";
    window.console.log = function (message) {
        consoleContents += message + "\n";
        updateConsole();
        window.taquitoTaskData.consoleCallback && window.taquitoTaskData.consoleCallback(consoleContents);
    }
    updateConsole();
}

function updateConsole() {
    $('#taquito-console').html(consoleContents);
}


function runCode(code) {
    /*var interpreter = new Interpreter(code, function (interpreter, globalObject) {
        interpreter.setProperty(globalObject, 'Tezos', window.Tezos);
        interpreter.setProperty(globalObject, 'taquito', window.taquito);
    });*/
    /*

    while(interpreter.step()) {
        if(interpreter.state == "error") {
            console.log(interpreter.error);
            break;
        }
    }*/
    //console.log(code);
    //safeEval(code);
    try {
        $('#taquito-status').html('Executing...');
        const timeout = setTimeout(function () {
            $('#taquito-status').html('');
        }, 100000);
        const evaluation = eval(code);
        if (evaluation instanceof Promise) {
            evaluation.then(result => {
                $('#taquito-status').html('Execution ended.');
                clearTimeout(timeout);
            }).catch(error => {
                $('#taquito-status').html('Error during execution : ' + error);
                clearTimeout(timeout);
            });
        } else {
            $('#taquito-status').html('Execution ended.');
            clearTimeout(timeout);
        }
    } catch (e) {
        $('#taquito-status').html('<span class="taquito-status-error">' + e + '</span>');
    }
}



function run() {
    runCode(getCode());
}



function checkAnswer(answer, callback) {
    if (window.taquitoTaskData.type == "connect") {
        if (myAddress) {
            callback(100, "You are connected to a wallet.");
        } else {
            callback(0, "You are not connected to any wallet.");
        }
        return;
    }
    if (window.taquitoTaskData.wallet && !myAddress) {
        callback(0, "You must be connected to a wallet first.");
        return;
    }

    if (window.taquitoTaskData.type == "input") {
        if (typeof window.taquitoTaskData.expectedAnswer == "function") {
            function cb(correct, msg) {
                if (correct) {
                    callback(100, msg || "Your answer is correct.")
                } else {
                    callback(0, msg || "Your answer is incorrect.")
                }
            }
            window.taquitoTaskData.expectedAnswer(window.taquitoTaskData, answer, cb);
        } else {
            if (answer === window.taquitoTaskData.expectedAnswer) {
                callback(100, "Your answer is correct.")
            } else {
                callback(0, "Your answer is incorrect.")
            }
        }
        return;
    } else if (window.taquitoTaskData.type == "button") {
        window.taquitoTaskData.validate(window.taquitoTaskData, callback);
        return;
    } else if (window.taquitoTaskData.type == "editor") {
        resetConsole();
        window.taquitoTaskData.gradingCallback = callback;
        window.taquitoTaskData.consoleContents = "";
        const code = window.taquitoTaskData.beforeExecute(window.taquitoTaskData, getCode());
        consoleContents = window.taquitoTaskData.consoleContents;
        updateConsole();
        runCode(code);
        return;
    }
    callback(0, "Not implemented : " + window.taquitoTaskData.type);
}

window.task.load = function (views, success, error) {
    init().then(success).catch(error);
}

window.task.getAnswer = function (success, error) {
    success(getCode());
}

window.task.reloadAnswer = function (answer, success) {
    setCode(answer);
    success();
}

window.task.getState = function (success, error) {
    success("");
}

window.task.reloadState = function (state, success, error) {
    success();
}

window.task.getLevelGrade = function (answer, token, success, error) {
    checkAnswer(answer, success);
}

window.task.gradeAnswer = function (answer, token, success, error) {
    checkAnswer(answer, success);
}

export { init, connectWallet };