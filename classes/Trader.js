import { v4 as uuidv4 } from 'uuid';
import CryptoJS from "crypto-js";
import fetch from 'node-fetch';

class Trader {
    constructor(){
        this.accessKey = "";
        this.secretKey = "";
        this.accountID = "47737782";
        this.domain = "api.huobi.pro";
    }

    getTimeStamp = () => {
        const currentDate = new Date(Date.now());
        let timestamp = currentDate.toISOString().slice(0, 19);
        return encodeURIComponent(timestamp);
    }

    generateApiUrl = (method, path, params = []) => {
        const timestamp = this.getTimeStamp();
        
        /* Generating Signature */
        let requestText = `${method}\n`;
        requestText += `${this.domain}\n`;
        requestText += `${path}\n`;
        requestText += `AccessKeyId=${this.accessKey}`;
        requestText += "&SignatureMethod=HmacSHA256";
        requestText += "&SignatureVersion=2";
        requestText += `&Timestamp=${timestamp}`
        
        // Adding Params
        params.forEach((param)=> {
            requestText += `&${param}`
        });
        const hash = CryptoJS.HmacSHA256(requestText, this.secretKey);
        const hashInBase64 = CryptoJS.enc.Base64.stringify(hash);
        const signature = encodeURIComponent(hashInBase64);

        /* Writing URL */
        let url = "https://";
        url += this.domain;
        url += path;
        url += `?AccessKeyId=${this.accessKey}`;
        url += "&SignatureMethod=HmacSHA256";
        url += "&SignatureVersion=2";
        url += `&Timestamp=${timestamp}`
        url += `&Signature=${signature}`

        //Adding parameters 
        params.forEach((param)=> {
            url += `&${param}`
        });

        return url;
    }

    placeTrade = async ( amount, symbol, type ) => {
        
        const orderDetails ={
            "account-id": this.accountID,
            "amount": amount,
            "symbol": symbol,
            "type": type,
            "client-order-id": uuidv4()
        }
        
        const tradeUrl = this.generateApiUrl("POST", "/v1/order/orders/place");
        
        const result = await fetch( tradeUrl, {
            method: 'POST', 
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderDetails)
        }
        );
        const json = await result.json();
        return json.status;
    }

    precise = async (symbol, currency, amount) => {
        
        const settings = await fetch(`https://api.huobi.pro/v1/settings/common/market-symbols?symbols=${symbol}`)
        const json = await settings.json();
        const { pp } = json?.data[0];
        const { ap } = json?.data[0];
        let result; 
        
        if( currency == "usdt" ) {
            result = Math.floor(amount * (10 ** pp) ) / (10 ** pp);
        } else {
            result = Math.floor(amount * (10 ** ap) ) / (10 ** ap);
        }
        console.log(result);
        return result;
    }

    getBalance = async (currency) => {
        const accountAPIURL = this.generateApiUrl("GET", "/v1/account/accounts/47737782/balance");
        const result = await fetch(accountAPIURL);
        const json = await result.json();
        const balancesList = json.data.list;
        const { balance } = balancesList.filter((obj) => obj.currency === currency && obj.type === "trade")[0];
        return balance;
    }
}

export default Trader;