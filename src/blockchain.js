/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */

     _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                block.time = new Date().getTime().toString().slice(0,-3);
                block.height = self.chain.length;
                if(self.chain.length > 0) {
                    block.previousBlockHash = self.chain[self.chain.length - 1].hash;
                }
                block.hash = SHA256(JSON.stringify(block)).toString();
                self.chain.push(block);
                self.height = self.chain.length;
                let valid = await this.validateChain();
                if(valid.length === 0) {
                    resolve(block);
                }
            } catch (error) {
                console.log('Unable to add block: chain is invalid.');
                reject(error);
            }          
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            let messageToBeSigned = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`;
            resolve(messageToBeSigned);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
           let time = parseInt(message.split(':')[1]);
           let currentTime = parseInt(new Date().getTime().toString().slice(0,-3));
           
           //5 * 60 seconds = 300
           const MAX_TIME_ELAPSE = 300;

           //Confirm time elapsed is not greater than 5 minutes
           if ((currentTime - time) <= MAX_TIME_ELAPSE) {
               //Verify the message with wallet addressa nd signature
               const verify = bitcoinMessage.verify(message, address, signature);
               if (verify) {
                   //Verification has passed, create the block
                   let block = new BlockClass.Block({
                       owner: address,
                       data: star
                   });
                   //Finally add the new block created
                   console.log('adding block...');
                   await this._addBlock(block);
                   resolve(block);
               }
           }
           else {
               reject('Block add failed: Signature time exceeded.');
           }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.find(p => p.hash === hash);
            if (block) {
                resolve(block);
            }
            else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.find(p => p.height === height);
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach(async myBlock => {
                //Temporary retrieve and store data into 'data' variable
                let data = await myBlock.getBData();
                //Checking if there is an address match
                if (address === data.owner) {
                    //We have confirmed the address owns this data and push the data to the stars array.
                    stars.push(data);
                }
            });
            resolve(stars);    
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
     
    validateChain() {
        let self = this;
        let errorLog = [];
        let prevBlockHash = null;
        return new Promise(async (resolve, reject) => {
           //Checking the chain for invalid blocks
           for (let i = 0; i < await self.getChainHeight(); i++) {
               let isValid = await self.chain[i].validate();
               if (!isValid) {
                   //We have found invalid block, push to the error log.
                   errorLog.push(self.chain[i]);
                   console.log(self.chain[i] + ' is not a valid block');
               }
               else if (prevBlockHash !== self.chain[i].previousBlockHash) {
                   //Checking second case where block hash of previous block
                   //is mismatched
                   errorLog.push(self.chain[i]);
                   console.log(self.chain[i] + ' blockhash is invalid.');
               }
               //Update the previous block hash so we can compare the next iteration
               prevBlockHash = self.chain[i].hash;
           } 
           resolve(errorLog);
        });
    }
}
module.exports.Blockchain = Blockchain;   