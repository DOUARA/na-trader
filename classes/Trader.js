import { v4 as uuidv4 } from 'uuid';
import CryptoJS from "crypto-js";
import fetch from 'node-fetch';

class Trader {
    constructor(){
        this.accessKey = "2c408747-7b23d6c1-6576a6ab-xa2b53ggfc";
        this.secretKey = "5db34c6d-d8bc1f9a-657d02ac-0409e";
        this.accountID = "47737782";
        this.domain = "api.huobi.pro";
        this.stopLimit = 15;
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

    placeArbitrageTrade = async (usdtAmount = 10, currency) => {
        // Stop trading if usdt balance is < 10 
        const usdtBalance = await this.getBalance('usdt');
        console.log("usdt balance ", Number(usdtBalance));
        if ( Number(usdtBalance) <= 15 ){
            return;
        }

        let order_1, order_2, order_3;
        
        // First order 
        order_1 = await this.placeTrade(usdtAmount, `${currency}usdt`, 'buy-market');
       
        // Second order
        console.log("order_1", order_1);
        if( order_1 == "ok" ) {
            let currBalance = await this.getBalance(currency);
            currBalance = Math.floor(currBalance);
            console.log("tnb balance ", currBalance);
            order_2 = await this.placeTrade(currBalance, `${currency}btc`, 'sell-market');
            console.log("order_2", order_2)
            if(order_2 == "ok") {
                let btcBalance = await this.getBalance('btc');
                btcBalance = Math.floor(btcBalance * 1000000) / 1000000;
                console.log("btcBalance", btcBalance);
                order_3 = await this.placeTrade(btcBalance, `btcusdt`, 'sell-market');
                console.log("order_3", order_3)
                console.log("One Arbitrage Trade has been made, Congratulations!");

            } else {
                console.log("Order 2 have not been made! ")
            }
        } else {
            console.log(" Order 1 have not been made! ")
        }

        
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