var taquitoTaskData = {
    type: "editor",
    wallet: 'any',
    // wallet: true,
    initialCode: `
async function mintToken(contractAddress, content) {
    const contract = await Tezos.wallet.at(contractAddress);
    const op = await contract.methods.mint(content).send({ amount: 0.001 });
    await op.confirmation();
    return op;
}

async function openAuction(contractAddress, deadline, tokenID, amount) {
    const contract = await Tezos.wallet.at(contractAddress);
    const op = await contract.methods.openAuction(deadline, tokenID).send({ amount: amount });
    await op.confirmation();
    return op;
}
`,
    initData: function(data) {
        data.nftContent = "NFT";
    },
    taskStatement: function(data) {
        return `This task is about interacting with a NFT smart contract at address <a href="https://better-call.dev/ghostnet/${data.contractAddress}" target="_blank">${data.contractAddress}</a>.<br>
The contract has multiple entrypoints, and we are interested in these two entrypoints :
<ul><li>the <code>mint</code> entrypoint takes a string as a parameter and mints a new token with that content</li>
<li>The <code>openAuction</code> entrypoint takes a string representing a deadline, an integer representing the token ID, and opens an auction for the token with the given ID.</li></ul>
Write two functions :
<ul><li><code>async function mintToken(contractaddress, content)</code> that calls the <code>mint</code> endpoint with the content supplied by the user</li>
<li><code>async function openAuction(contractaddress, deadline, tokenID, amount)</code> that opens an auction for the token with the given ID.</li></ul>
These two functions should return a promise indicating the confirmation of the operation.
`;
    },
    beforeExecute: function(data, code) {
        data.result = "";
        data.consoleContents = `You are about to mint a token and open an auction on it.\nPlease enter the content of the token: ${data.nftContent}\nMinting token...\n`;
        data.deadline = new Date();
        data.deadline.setHours(data.deadline.getHours() + 1);
        data.deadline = data.deadline.toISOString();
        return code + `

mintToken("${data.contractAddress}", "${data.nftContent}").then(window.taquitoTaskData.mintCallback).then(function(tokenID) {
    
    return openAuction("${data.contractAddress}", "${data.deadline}", tokenID, 0.001);
}).then(window.taquitoTaskData.auctionCallback);
`
    },

    mintCallback: function(op) {
        console.error(op);
        if (op.params) {
            return taquitoTaskData.mintCheck({ parameters: op.params.paramters, operation_result: op.results[0].metadata.operation_result });
        } else {
            return op.transactionOperation().then(function(op) {
                return taquitoTaskData.mintCheck({ parameters: op.parameters, operation_result: op.metadata.operation_result });
            })
        }
    },

    mintCheck: function(op) {
        if (op.parameters.entrypoint != "mint") {
            taquitoTaskData.gradingCallback(0, "The operation wasn't a call to the mint function.");
            throw "The operation wasn't a call to the mint function.";
        }
        if (op.operation_result.status != "applied") {
            taquitoTaskData.gradingCallback(0, "The mint operation failed.");
            throw "The mint operation failed.";
        }
        var tokenID = op.operation_result.storage[3].int - 1;
        taquitoTaskData.tokenID = tokenID;
        console.log(`Minted token with ID ${tokenID}.\nPlease enter a deadline for the auction: ${taquitoTaskData.deadline}\nOpening auction...`);
        return "" + tokenID;
    },

    auctionCallback: function(op) {
        console.error(op);
        if (op.params) {
            return taquitoTaskData.auctionCheck({ parameters: op.params.paramters, operation_result: op.results[0].metadata.operation_result });
        } else {
            return op.transactionOperation().then(function(op) {
                return taquitoTaskData.auctionCheck({ parameters: op.parameters, operation_result: op.metadata.operation_result });
            })
        }            
    },

    auctionCheck: function(op) {
        if (op.parameters.entrypoint != "openAuction") {
            taquitoTaskData.gradingCallback(0, "The operation wasn't a call to the openAuction function.");
            throw "The operation wasn't a call to the openAuction function.";
        }
        if (op.operation_result.status != "applied") {
            taquitoTaskData.gradingCallback(0, "The openAuction operation failed.");
            throw "The openAuction operation failed.";
        }
        return Tezos.contract.at(taquitoTaskData.contractAddress).then(function (contract) {
            contract.storage().then(function(storage) {
                return storage['auctions'].get(taquitoTaskData.tokenID);
            }).then(function(auction) {
                if(auction) {
                    console.log("Opened auction.");
                    taquitoTaskData.gradingCallback(40, "The token was minted and the auction was opened.");
                } else {
                    taquitoTaskData.gradingCallback(0, "The auction was not opened.");
                }
            })
        });
    },

    consoleCallback: function(contents) {
        if (contents.indexOf("done") == -1) {
            return;
        }
        Tezos.contract.at(taquitoTaskData.selectedContract).then(function (contract) {
            contract.storage().then(function(storage) {
                if(storage.c[0] > taquitoTaskData.currentStorage) {
                    taquitoTaskData.gradingCallback(40, "The call has been made.");
                } else {
                    taquitoTaskData.gradingCallback(0, "The call has not been made, or not enough time has elapsed for the transaction to be confirmed.");
                }
            });
        });
    },

    validate: function(data, callback) {
        callback(0, "Not implemented");
    }
};    

taquitoTaskData.contractAddress = "KT1Pe6gQ2rfoJkLLGL321evVmc2KFhPAAARN";