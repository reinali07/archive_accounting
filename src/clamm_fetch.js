import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
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

const main = async () => {

    // Set timestamp
    const timestamp = '2024-05-11T00:00:00Z';

    // UNI Contract Address
    const poolAddress = "0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801";
    const NFTAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
    const NFTid = 720499;
    const ownerAddress = "0x48b62eac0230f474ae109de0e085d4608b4b6400";

    const startTime = performance.now()

    let block = await dater.getDate(timestamp);
    let blockNum = ethers.toQuantity(block['block']).toString();

    // ABI
    let abi1 = [
        'function slot0()',
    ];
    let abi2 = [
        'function positions(uint256 tokenId)','function ownerOf(uint256 tokenId)',
    ]

    // Create function call data
    let iface1 = new ethers.Interface(abi1);
    let iface2 = new ethers.Interface(abi2);
    
    let edata1 = iface1.encodeFunctionData("slot0", []);
    let edata2 = iface2.encodeFunctionData("positions", [NFTid]);
    let edata3 = iface2.encodeFunctionData("ownerOf",[NFTid]);

    const reqs = []
    reqs.push({
        jsonrpc: "2.0",
        id: 0,
        method: "eth_call", // usage of eth_call
        params: [
            {
                to: poolAddress,
                data: edata1,
            },
            blockNum,
        ]
    });
    reqs.push({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call", // usage of eth_call
        params: [
            {
                to: NFTAddress,
                data: edata2,
            },
            blockNum,
        ]
    });
    reqs.push({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_call", // usage of eth_call
        params: [
            {
                to: NFTAddress,
                data: edata3,
            },
            blockNum,
        ]
    })

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(reqs),
        redirect: 'follow'
    };
    //console.log(requestOptions);
    //JSONToFile(requestOptions, 'testJsonFile');

    const res = await fetch(fetchURL, requestOptions)
    const data = await res.json()

    const endTime = performance.now()

    console.log(`Query took ${endTime - startTime} milliseconds`)
      
    //JSONToFile(data,'unformatted_results');

    const formatted = {tick:ethers.fromTwos(ethers.dataSlice(data[0].result,61,64),24).toString(),
        liquidity:ethers.toBigInt(ethers.dataSlice(data[1].result,224,256)).toString(),
        owner:ethers.dataSlice(data[2].result,16)}

    JSONToFile(formatted, 'clamm_results');
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