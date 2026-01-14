var url = new URL(window.location.href);
var version = url.searchParams.get('version');

if(version == "1") {
    var taquitoTaskData = {
        type: "input",
        wallet: 'any',
        initData: function(data) {
            var contracts = ['KT1QJ43yyrtVkMVEDmB3rEuiTHT3V57CSUCJ', 'KT1ByGoHdEpFNWsfbsw2cUSXDeH9Krktpd9p', 'KT1VBGzfgxDnYGEiPC2mSZq5sG2hXs9FPgqg', 'KT1RjApJevAMVMmcCQvaUgFC6j3ZTvo4VuPy'];
            data.selectedContract = contracts[Math.floor(Math.random() * contracts.length)];
        },
        taskStatement: function(data) {
            return "Get the storage of the contract <code>" + data.selectedContract + "</code>.";
        },
        expectedAnswer: function(data, answer, callback) {
            Tezos.contract.at(data.selectedContract).then(function (contract) {
                contract.storage().then(function(storage) {
                    callback(answer === storage.c[0].toString());
                });
            });
        }
    };
} else if(version == "2") {
    var taquitoTaskData = {
        type: "button",
        wallet: 'any',
        initData: function(data) {
            var contracts = ['KT1QJ43yyrtVkMVEDmB3rEuiTHT3V57CSUCJ', 'KT1ByGoHdEpFNWsfbsw2cUSXDeH9Krktpd9p', 'KT1VBGzfgxDnYGEiPC2mSZq5sG2hXs9FPgqg', 'KT1RjApJevAMVMmcCQvaUgFC6j3ZTvo4VuPy'];
            data.selectedContract = contracts[Math.floor(Math.random() * contracts.length)];
            Tezos.contract.at(data.selectedContract).then(function (contract) {
                contract.storage().then(function(storage) {
                    data.currentStorage = storage.c[0];
                });
            });
        },
        taskStatement: function(data) {
            return "Call the default entrypoint of the contract <code>" + data.selectedContract + "</code>, whose parameter is of type Unit.";
        },
        validate: function(data, callback) {
            Tezos.contract.at(data.selectedContract).then(function (contract) {
                contract.storage().then(function(storage) {
                    if(storage.c[0] > data.currentStorage) {
                        callback(40, "The call has been made.");
                    } else {
                        callback(0, "The call has not been made, or not enough time has elapsed for the transaction to be confirmed.");
                    }
                });
            });
        }
    };
} else {
    var taquitoTaskData = {
        type: "editor",
        wallet: 'any',

        initialCode: `
function callContract(address, callback) {
    // Fill this function
    Tezos.contract.at(address).then(function (contract) {
        contract.methods.default().send().then(function (op) {
            op.confirmation(1).then(callback);
        });
    });
}`,

        initData: function(data) {
            var contracts = ['KT1QJ43yyrtVkMVEDmB3rEuiTHT3V57CSUCJ', 'KT1ByGoHdEpFNWsfbsw2cUSXDeH9Krktpd9p', 'KT1VBGzfgxDnYGEiPC2mSZq5sG2hXs9FPgqg', 'KT1RjApJevAMVMmcCQvaUgFC6j3ZTvo4VuPy'];
            data.selectedContract = contracts[Math.floor(Math.random() * contracts.length)];
            Tezos.contract.at(data.selectedContract).then(function (contract) {
                contract.storage().then(function(storage) {
                    data.currentStorage = storage.c[0];
                });
            });
        },

        taskStatement: function(data) {
            return "Write a function <code>callContract(address, callback)</code> that calls the default entrypoint of the contract whose address is passed as a parameter, then calls the callback function when the transaction is confirmed.";
        },

        beforeExecute: function(data, code) {
            data.result = "";
            return code + `

callContract("${data.selectedContract}", window.taquitoTaskData.finished);
`
        },

        finished: function() {
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
}