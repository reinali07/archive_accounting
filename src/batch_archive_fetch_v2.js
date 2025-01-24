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
    const contractAddress = "0xd3d2E2692501A5c9Ca623199D38826e513033a17";
    const numDecimals = 18;

    // wallet addresses
    const addresses = FileToJSON('univ2providers');

    const startTime = performance.now()

    let block = await dater.getDate(timestamp);
    let blockNum = ethers.toQuantity(block['block']).toString();

    // ABI
    let abi = [
        'function balanceOf(address account)'
    ];

    // Create function call data
    let iface = new ethers.Interface(abi);
    let edata = iface.encodeFunctionData("balanceOf", [contractAddress]);

    const reqs = []
    reqs.push({
        jsonrpc: "2.0",
            id: 0,
            method: "eth_call", // usage of eth_call
            params: [
                {
                    to: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
                    data: edata,
                },
                blockNum,
            ]
    })

    for (let i = 0; i<addresses.length; i++) {

        // Create function call data
        let edata = iface.encodeFunctionData("balanceOf", [addresses[i]]);

        let raw = {
            jsonrpc: "2.0",
            id: i+1,
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
      
    //JSONToFile(data,'unformatted_results');

    if (data[0].result==null){
        console.log('failed');
    };

    const formatted = []

    const startTime2 = performance.now();

    const totalBalance = parseInt(data[0].result);
    formatted.push({id:0,address:contractAddress,data:totalBalance});
    const endTime2 = performance.now();

    const startTime3 = performance.now();
    
    var totalSupply = 0;
    for (let i = 1; i<data.length; i++) {
        let value = parseInt(data[i].result);
        totalSupply += value;
    };
    for (let i = 1; i<data.length; i++) {
        let value = parseInt(data[i].result);
        formatted.push({id:i,address:addresses[i-1],data:value*totalBalance/totalSupply});
    };

    const endTime3 = performance.now();
    
    console.log(`Query took ${endTime1 - startTime1} milliseconds`);
    console.log(`Parse total balance took ${endTime2-startTime2} milliseconds`);
    console.log(`Get ratios took ${endTime3-startTime3} milliseconds`);
    console.log(`Total time is ${(((endTime1 - startTime1)+(endTime3-startTime3))*3000/300+(endTime-startTime)+(endTime2-startTime2))/1000} seconds`)
    console.log(`Per user is ${(((endTime1 - startTime1)+(endTime3-startTime3))*3000/300+(endTime-startTime)+(endTime2-startTime2))/3000} milliseconds`)

    JSONToFile(formatted, 'uniform_results');
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