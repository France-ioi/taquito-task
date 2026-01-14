var url = new URL(window.location.href);
var version = url.searchParams.get('version');

var CONTRACT_URL = "KT1XrDAuyqrvts84p565NchxgecmbzSJmkVx";


if(version == "1") {
    var taquitoTaskData = {
        type: "connect",
        wallet: true,
        taskStatement: function(data) {
            return "Connect to this task with a ghostnet wallet.";
        },
        hints: [
            `Click the "Connect" button`,
            'Try the <a href="https://templewallet.com/download" target="_blank">Temple Wallet Extension</a> (unless you have the Safari browser. In that case, try <a href="https://ghostnet.kukai.app" target="_blank">Kukai</a>).',
            `Make sure your wallet is connected to the ghostnet, and not the main tezos network!`
        ]
    };
} else if(version == "2") {
    var taquitoTaskData = {
        type: "button",
        wallet: true,
        taskStatement: function(data) {
            return 'Add funds to your wallet using a <a href="https://faucet.ghostnet.teztnets.com/" target="_blank">ghostnet faucet</a>. You need a balance of at least 1 ꜩ to complete this task. <span class="balance"></span>';
        },
        hints: [
            `Follow this link to the <a href="https://faucet.ghostnet.teztnets.com/" target="_blank">ghostnet faucet</a>.`,
            `Paste your wallet address in the "Fund any address" textbox.`,
            `Select 100 Tez as the amount and click "Request 100ꜩ".`
        ],
        uiUpdate: function(data) {
            if(!data.currentWallet) {
                $(".balance").html("");
            }
            Tezos.tz.getBalance(data.currentWallet).then(function(balance) {
                $(".balance").html("Current balance : " + (balance/1000000) + " ꜩ.");
            }).catch(function() {
                $(".balance").html("");
            });
        },
        validate: function(data, callback) {
            Tezos.tz.getBalance(data.currentWallet).then(function(balance) {
                if(balance >= 1000000) {
                    callback(100, "The balance on your wallet is enough : " + (balance/1000000) + " ꜩ.");
                } else {
                    callback(0, "You need a balance of at least 1 ꜩ to complete this task.");
                }
            });
        }
    };
} else if(version == "3") {
    var taquitoTaskData = {
        type: "button",
        wallet: true,
        taskStatement: function(data) {
            return 'Choose a fighter in the dApp.';
        },
        hints: [`Click on a fighter portrait.`, `With a fighter selected, click the "Choose fighter" button and follow the prompts to make an entrypoint call with your wallet`],
        validate: function(data, callback) {
            Tezos.contract.at(CONTRACT_URL).then(function (contract) {
                contract.storage().then(function(storage) {
                    storage.challengers_big_map.get(data.currentWallet).then(function(challenger) {
                        console.log(challenger);
                        callback(100, "You have chosen a fighter.");
                    }).catch(function() {
                        callback(0, "You have not yet chosen a fighter.");
                    });;
                });
            });

        }
    };
} else if(version == "4") {
    var taquitoTaskData = {
        type: "button",
        wallet: true,
        taskStatement: function(data) {
            return 'Initiate a battle in the dApp.';
        },
        hints: [`After choosing a fighter, click the "Enter the Arena" button`,`Once you are in the Arena, click "Fight" and follow the prompts`],
        validate: function(data, callback) {
            Tezos.contract.at(CONTRACT_URL).then(function (contract) {
                contract.storage().then(function(storage) {
                    storage.challengers_big_map.get(data.currentWallet).then(function(challenger) {
                        if(challenger.fightHistory.length > 0) {
                            callback(100, "You have initiated a battle.");
                        } else {
                            callback(0, "You have not yet initiated a battle.");
                        }
                    }).catch(function() {
                        callback(0, "You have not yet initiated a battle.");
                    });;
                });
            });

        }
    };
} else if(version == "5") {
    var taquitoTaskData = {
        type: "input",
        //wallet: true,
        taskStatement: function(data) {
            return 'What contract is this dApp making calls to?';
        },
        hints: [`Click on a button that triggers an entrypoint call.`, `Take a look at the data you are presented with when you are asked to confirm an operation with your wallet.`],
        expectedAnswer: function(data, answer, callback) {
            callback(answer == CONTRACT_URL);
        }
    };
} else if(version == "6") {
    var taquitoTaskData = {
        type: "input",
        //wallet: true,
        taskStatement: function(data) {
            return 'What is the name of the entrypoint that is called when you first choose or change fighter?';
        },
        hints: [`From the arena, you can click "Change Fighter" to go back to the fighter selection page`, `Look at the transaction details that appear in the wallet confirmation pop-up after clicking the button. You might have to dig into the raw object that is being sent `, `If you are using the temple wallet, click on the 'raw' tab. Then scroll down and open the 'parameters' section`],
        expectedAnswer: function(data, answer, callback) {
            callback(answer == "register_challenger");
        }
    };
} else if(version == "7") {
    var taquitoTaskData = {
        type: "input",
        //wallet: true,
        taskStatement: function(data) {
            return 'Investigate the contract at <a href="https://better-call.dev/" target="_blank">better-call.dev</a>. What is the name of the object that your register_challenger call modified?';
        },
        hints: [
            `Go to <a href="https://better-call.dev/" target="_blank">better-call.dev</a> and search for the contract address`,
            `Look for the "Operations" tab and find your recent transaction`,
            `Examine the "Storage Diff" section of your transaction`
        ],
        expectedAnswer: function(data, answer, callback) {
            callback(answer == "challengers_big_map");
        }
    };
} else if(version == "8") {
    var taquitoTaskData = {
        type: "input",
        wallet: true,
        taskStatement: function(data) {
            return 'What key was added to that storage object when you called register_challenger?';
        },
        hints: [
            `You just need to input the key as plain text.`,
            `Look at the "Storage Diff" section of your transaction in the block explorer`,
            `If you are having trouble copy-pasting from the better-call.dev UI... doesn't that address string used as the big_map key look familiar? Say maybe it is the address of someone you know well? Very well?`
        ],
        expectedAnswer: function(data, answer, callback) {
            callback(answer == data.currentWallet);
        }
    };
} else if(version == "9") {
    var taquitoTaskData = {
        type: "button",
        wallet: true,
        taskStatement: function(data) {
            return 'Fight the battlemaster at least twice, using different fighters each time.';
        },
        hints: [
            `Select a different fighter and click the "Fight!" button`,
            `Repeat this process with another fighter`
        ],
        validate: function(data, callback) {
            Tezos.contract.at(CONTRACT_URL).then(function (contract) {
                contract.storage().then(function(storage) {
                    storage.challengers_big_map.get(data.currentWallet).then(function(challenger) {
                        if(challenger.fightHistory.length < 2) {
                            callback(0, "You have not yet initiated a battle.");
                        } else {
                            var fighters = [];
                            for(var i = 0; i < challenger.fightHistory.length; i++) {
                                var fighterId = challenger.fightHistory[i].challenger_fighter_id.c[0];
                                if(fighters.indexOf(fighterId) == -1) {
                                    fighters.push(fighterId);
                                }
                            }
                            if(fighters.length >= 2) {
                                callback(100, "You have fought with at least two different fighters.");
                            } else {
                                callback(0, "You have not fought with at least two different fighters.");
                            }
                        }
                    }).catch(function() {
                        callback(0, "You have not yet initiated a battle.");
                    });;
                });
            });

        }
    };
} else if(version == "10") {
    var taquitoTaskData = {
        type: "input",
        wallet: true,
        taskStatement: function(data) {
            return 'What is the timestamp of your most recent fight?';
        },
        hints: [
            `Check your fight history in the UI`,
            `You can also find this information in the block explorer under your recent transactions`,
            `The timestamp should be in the iso format: YYYY-MM-DD HH:MM:SS`
        ],
        expectedAnswer: function(data, answer, callback) {
            Tezos.contract.at(CONTRACT_URL).then(function (contract) {
                contract.storage().then(function(storage) {
                    storage.challengers_big_map.get(data.currentWallet).then(function(challenger) {
                        if(challenger.fightHistory.length < 1) {
                            callback(false);
                        } else {
                            callback(answer == challenger.fightHistory[0].fight_timestamp);
                        }
                    }).catch(function() {
                        callback(false);
                    });;
                });
            });

        }
    };
} else if(version == "11") {
    var taquitoTaskData = {
        type: "input",
        //wallet: true,
        taskStatement: function(data) {
            return "Sign into better-call.dev with your wallet. Then, find an entrypoint on the contract that doesn't appear to be accessible directly from the app. What is its name?";
        },
        hints: [
            `On better-call.dev, find the 'Interact' tab for the contract to see a list of all the entrypoints`,
            `Look for an entrypoint that you haven't seen in the dApp interface`,
        ],
        expectedAnswer: function(data, answer, callback) {
            callback(answer == data.currentWallet);
        }
    };
} else if(version == "12") {
    var taquitoTaskData = {
        type: "button",
        wallet: true,
        taskStatement: function(data) {
            return 'Now, call the entrypoint you have identified using better-call.dev.';
        },
        hints: [
            `Make sure you are connected to better-call.dev with the same account as with the dApp AND are on the ghostnet`,
            `When you call the entrypoint, make sure you select "wallet" as the calling method`,
        ],
        validate: function(data, callback) {
            Tezos.contract.at(CONTRACT_URL).then(function (contract) {
                contract.storage().then(function(storage) {
                    storage.challengers_big_map.get(data.currentWallet).then(function(challenger) {
                        if(challenger.c_mode == "1") {
                            callback(100, "You have called the mysterious endpoint.");
                        } else {
                            callback(0, "You have not yet called the mysterious endpoint.");
                        }
                    }).catch(function() {
                        callback(0, "You have not yet initiated a battle.");
                    });;
                });
            });

        }
    };
} else if(version == "13") {
    var taquitoTaskData = {
        type: "button",
        wallet: true,
        taskStatement: function(data) {
            return 'Defeat the Battlemaster.';
        },
        hints: [
            `Try exploring the contract further. Is there anything here that gives a hint on how the winner is determined?`,
            `Have a look at the storage on the contract. What is there besides the challengers_big_map?`,
            `Look at the fighters_map in the contract storage. Look at the entries in the map. Anything helpful here?`,
            `Have another look at the entrypoints - can you find a way that you could take advantage of what you have learned about the different champions?`,
            `Notice that when you call the register_challenger entrypoint you must provide a parameter of type integer - what could this be?`,
            `Try calling the register_challenger entrypoint again, but changing the parameter. How does that impact who your fighter is in the dapp?`,
            `The integer parameter for register_challenger is what determines your fighter in the arena.`,
            `The solution: use better-call.dev to directly call register_challenger on the contract with int 7 as the paramter (which corresponds to the fighter_id of the hidden nano-bots fighter). You will see your fighter change in the dApp. Then you can call the fight entrypoint.`
        ],
        validate: function(data, callback) {
            Tezos.contract.at(CONTRACT_URL).then(function (contract) {
                contract.storage().then(function(storage) {
                    storage.challengers_big_map.get(data.currentWallet).then(function(challenger) {
                        for(var i = 0; i < challenger.fightHistory.length; i++) {
                            if(challenger.fightHistory[i].battlemaster_victorious === false) {
                                callback(100, "You have defeated the Battlemaster.");
                                return;
                            }
                        }
                        callback(0, "You have not yet defeated the Battlemaster.");
                    }).catch(function() {
                        callback(0, "You have not yet initiated a battle.");
                    });;
                });
            });

        }
    };
} else {
    var taquitoTaskData = {
        type: "connect",
        wallet: true,
        taskStatement: function(data) {
            return "Connect to this task with a ghostnet wallet.";
        },
        hints: [
            `Click the "Connect" button`,
            'Try the <a href="https://templewallet.com/download" target="_blank">Temple Wallet Extension</a> (unless you have the Safari browser. In that case, try <a href="https://ghostnet.kukai.app" target="_blank">Kukai</a>).',
            `Make sure your wallet is connected to the ghostnet, and not the main tezos network!`
        ]
    };
}

taquitoTaskdata.currentWalletName = "Battle Arena";

if(parseInt(version) >= 3) {
    var ts = taquitoTaskData.taskStatement;
    taquitoTaskData.taskStatement = function(data) {
        return "<a href='dapp/index.html' target='_blank'>Open the dApp.</a><br>" + ts(data);
    }
}