import fetch from 'node-fetch';
import { writeFileSync, readFileSync } from 'fs';
import { ethers } from 'ethers';
import pkg from 'ethereum-block-by-date';
const EthDater = pkg;
import { performance } from 'perf_hooks';

const apiKey = process.env.ALCHEMY_API_KEY;

const provider = new ethers.AlchemyProvider(null, apiKey);
const dater = new EthDater(provider);

const fetchURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

const JSONToFile = (obj, filename) =>
    writeFileSync(`results/${filename}.json`, JSON.stringify(obj, null, 2));

const FileToJSON = (filename) => 
    JSON.parse(readFileSync(`data/${filename}.json`, 'utf8'));

const main = async () => {

    // Set timestamp
    const timestamp = '2024-05-11T00:00:00Z';

    // UNI Contract Address
    const contractAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
    const numDecimals = 18;

    // wallet addresses
    const addresses = FileToJSON('unitokenholders');

    const startTime = performance.now()

    let block = await dater.getDate(timestamp);
    let blockNum = ethers.toQuantity(block['block']).toString();

    // ABI
    let abi = [
        'function balanceOf(address account)'
    ];

    // Create function call data
    let iface = new ethers.Interface(abi);

    const reqs = []
    for (let i = 0; i<addresses.length; i++) {

        // Create function call data
        let edata = iface.encodeFunctionData("balanceOf", [addresses[i]]);

        let raw = {
            jsonrpc: "2.0",
            id: i,
            method: "eth_call", // usage of eth_call
            params: [
                {
                    to: contractAddress,
                    data: edata,
                },
                blockNum,
            ]
        };
        reqs.push(raw);
    }

    const endTime = performance.now();
    console.log(`Building query took ${endTime - startTime} milliseconds`)

    const startTime1 = performance.now()

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(reqs.slice(0,300)),
        redirect: 'follow'
    };
    //console.log(requestOptions);
    //JSONToFile(requestOptions, 'testJsonFile');

    const res = await fetch(fetchURL, requestOptions)
    const data = await res.json()

    const endTime1 = performance.now()
    console.log(`Query took ${endTime1 - startTime1} milliseconds`);
    console.log(`Total time is ${((endTime1 - startTime1)*380000/300+(endTime-startTime))/1000} seconds`)
    console.log(`Per user is ${((endTime1 - startTime1)*380000/300+(endTime-startTime))/380000} milliseconds`)
      
    //JSONToFile(data,'unformatted_results');

    if (data[0].result==null){
        console.log('failed');
    };
    const formatted = []

    for (let i = 0; i<data.length; i++) {
        formatted.push({id:i,address:addresses[i],data:parseInt(data[i].result)});
    };
    JSONToFile(formatted, 'wallet_results');
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

runMain();