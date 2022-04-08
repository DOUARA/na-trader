import Trader from './Trader.js';
import Socket from './Socket.js';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import fetch from 'node-fetch';
import fs from 'fs';
import Telegram from './Telegram.js';

class Mentor {
    constructor(symbol = 'ksmusdt') {
        this.sub = `{"sub": "market.${symbol}.kline.5min", "id": "${uuidv4()}"}`;
        this.symbol = symbol;
        this.telegram = new Telegram();
        this.valuesInit();
    }

    valuesInit = () => {

        this.socket = new Socket("wss://api.huobi.pro/ws", this.sub);

        this.startedTradeNotify = false;

        this.time = 0;

        this.profit = 0;

        this.totalProfit = 0;
        
        this.marketPrice = 0;

        this.runningTime = 0;

        this.tradingTime = 40;

        this.latestAction = {
            action: "",
            price: 0
        };

        this.stage = undefined;

        this.candles = [];

        // Trade action 
        this.tradeAction = "NO-ACTION" 

        // Initial values 
        this.afmax = 0.2;
        this.afmin = 0.02;
        
        this.af = {
            prev: this.afmin,
            curr: this.afmin
        };

        this.psar = {
            prev: undefined,
            curr: undefined
        };
        
        this.ep = {
            prev: undefined,
            curr: undefined
        };
        
        this.deff_asset = {
            prev: undefined,
            curr: undefined
        };
        
        this.trend = {
            prev: undefined,
            curr: undefined
        };

        this.high;
        this.low;
        this.open;
        this.close;
    }

    setSymbol = (symbol)=> {
        this.sub = `{"sub": "market.${symbol}.kline.5min", "id": "${uuidv4()}"}`;
        this.symbol = symbol;
    }

    init = () => {
        this.telegram.sendMessage(
            `New Session Has Started,%0ASymbol: ${this.symbol.toUpperCase()} 🔥`
            )
        this.getPeriodicCandle();
    }

    caTrend = () => {
        
        if ( this.psar.curr < this.high ) {
            this.trend.curr = "up"
        }

        else if ( this.psar.curr > this.low ) {
            this.trend.curr = "down"
        }

    }

    caPsar = () => {

        if( this.psar.prev == undefined && this.psar.curr == undefined  ) { 
            this.psar.prev = this.low;
            this.psar.curr = this.low;
            return;
        }
        
        if ( this.trend.prev == "up" && ( this.psar.prev + this.deff_asset.prev ) > this.low ) {
            this.psar.curr = this.ep.prev;
        }

        else if ( this.trend.prev == "down" && ( this.psar.prev + this.deff_asset.prev ) < this.high ) {
            this.psar.curr = this.ep.prev
        }

        else {
            this.psar.curr = this.psar.prev + this.deff_asset.prev;
        }

    }

    caEp = () => {

        if( this.ep.prev == undefined && this.ep.curr == undefined ) {
            this.ep.prev = this.high;
            this.ep.curr = this.high;
            return;
        }
        
        if ( this.trend.curr == "up" && this.high > this.ep.prev ) {
            this.ep.curr = this.high
        }

        else if ( this.trend.curr == "up" && this.high <= this.ep.prev ) {
            this.ep.curr = this.ep.prev
        }

        else if ( this.trend.curr == "down" && this.low < this.ep.prev ) {
            this.ep.curr = this.low
        }

        else if ( this.trend.curr == "down" && this.low >= this.ep.prev ) {
            this.ep.curr = this.ep.prev
        }
    }


    caAf = () => {

        if( this.trend.prev == this.trend.curr ) {
            if ( this.af.prev == this.afmax) {
                this.af.curr = this.afmax
            }
        }

        else if( this.trend.curr == "up" && this.ep.curr > this.ep.prev ) {
            this.af.curr = this.af.prev + this.afmin
        }

        else if( this.trend.curr == "up" && this.ep.curr <= this.ep.prev ) {
            this.af.curr = this.af.prev
        }

        else if( this.trend.curr == "down" && this.ep.curr < this.ep.prev ) {
            this.af.curr = this.af.prev + this.afmin
        }

        else if( this.trend.curr == "down" && this.ep.curr >= this.ep.prev ) {
            this.af.curr = this.af.prev 
        }

        else {
            this.af.curr = this.afmin;
        }
            
    }

    caDeff = () => {
        
        if( this.deff_asset.prev == undefined && this.deff_asset.curr == undefined ) { 
            this.deff_asset.prev = (this.ep.prev - this.psar.prev) * this.af.prev;
            this.deff_asset.curr = (this.ep.curr - this.psar.curr) * this.af.curr;
            return; 
        }
        
        this.deff_asset.curr = ( this.ep.curr - this.psar.curr ) * this.af.curr;
    }


    caFinalResults = async (result) => {
    
        // Format the time
        const formattedTime = moment(result.ts).format('HH:mm');
        let finalTime = formattedTime;

        const minute = formattedTime.slice(-1);

        if( parseInt(minute) > 0 &&  parseInt(minute) < 5 ) {
            finalTime = finalTime.replace(/.$/, '0');
        }

        if ( parseInt(minute) > 5 ) {
            finalTime = finalTime.replace(/.$/, '5');
        }

        this.time = finalTime;
        
        // High and low
        this.high = result.tick?.high;
        this.low = result.tick?.low;
        this.open = result.tick?.open;
        this.close = result.tick?.close;
        
        // Start calculation
        this.caPsar();
        this.caTrend();
        this.caEp();
        this.caAf();
        this.caDeff()
        
        // Get the current market price 
        const marketResult = await fetch(`https://api.huobi.pro/market/trade?symbol=${this.symbol}`)
        const json = await marketResult.json();
        this.marketPrice = json?.tick?.data[0]?.price;
        
        // Make Trade 
        this.makeTrade();
        
        // Print results 
        this.print();

        // Add to running time
        this.runningTime += 5;
        
        if( this.af.curr >= 1 ) {
            this.telegram.sendMessage("af has passed: 1, script will restart... 🔄 ");
            this.restart();
            return;
        }
        
        // Normalize previous values
        this.af.prev = this.af.curr;
        this.psar.prev = this.psar.curr;
        this.ep.prev = this.ep.curr;
        this.deff_asset.prev = this.deff_asset.curr;
        this.trend.prev = this.trend.curr;
    }
    
    // Get 5min candlestick
    getPeriodicCandle = () => {

        this.socket.run( async ( result ) =>  { 
            
            if ( result?.tick ) { 

                // time
                const time = result.ts;
                const minute = parseInt( moment(time).format('mm') );

                if ( this.stage === undefined ) {
                    this.stage = Math.floor( minute / 5 );
                    this.candles.push(result);
                } else {
                
                    if( Math.floor( minute / 5 ) !== this.stage ) {
                
                        // Calculate final results 
                        this.caFinalResults( this.candles[this.candles.length - 1] );
                        
                        this.candles = [];
                        this.candles.push(result);
                        this.stage = Math.floor( minute / 5 )

                    } else { 
                        this.candles.push( result );
                    }
                }

            }
        })
    }

    print = () => {
        const headLine = "time,open,high,low,close,deff,af,ep,psar,trend,market,action,rTime(min),profit,tProfit";
        
        let line = `${this.time},`
        line += `${this.open},`
        line += `${this.high},`
        line += `${this.low},`
        line += `${this.close},`
        line += `${this.deff_asset.curr},`
        line += `${this.af.curr},`
        line += `${this.ep.curr},`
        line += `${this.psar.curr},`
        line += `${this.trend.curr},`
        line += `${this.marketPrice},`
        line += `${this.tradeAction},`
        line += `${this.runningTime},`
        if(this.tradeAction === "SELL") {
            line += `${this.profit},`
            line += `${this.totalProfit}`
            
        } else {
            line += "N/A,"
            line += `N/A`
        }
        
        
        this.writeToFile(headLine, line)
       
        console.log ( 
            this.time,
            this.trend.curr, 
            this.deff_asset.curr, 
            this.af.curr, 
            this.ep.curr, 
            this.psar.curr, 
            this.low, 
            this.high, 
            this.marketPrice, 
            this.tradeAction,
            this.runningTime,
            this.profit,
            this.totalProfit
        )
    
    }

    writeToFile = (headline, line) => {
        const currentDate = moment().format('YYYY-MM-DD')
        const fileName = `${currentDate}_${this.symbol}.txt`
        
        const path = `./data/${fileName}`

        var dir = './data';

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        try {
            if (fs.existsSync(path)) {
                console.log("File exists")
                fs.appendFileSync(path, `\n${line}`, (err) => { if (err) throw err; });
            } else {
                console.log("File doesn't exist")
                fs.writeFileSync(path, headline, (err) => { if (err) throw err; });
                fs.appendFileSync(path, `\n${line}`, (err) => { if (err) throw err; });
            }
        } catch(err) {
            console.error(err)
        }
    }

    stop = () => {
        
        if( this.latestAction.action == "BUY" ) {
            this.sell();
            this.writeToFile("Selling Headline", "Selling Before Restart Done!")
        }

        this.telegram.sendMessage("Script Has Stopped!");

        this.socket.close();

        console.log("Script Has Stopped...");

        let profitPercentage = Math.floor(this.totalProfit * 100) / 100;
        if(profitPercentage < 0) {
            profitPercentage += " 🖕 😀"
        } else {
            profitPercentage += " 👏 👏"
        }

        this.telegram.sendMessage(`
            Session Has Closed with a profit of ${profitPercentage}
        `);


    }

    start = () => {
        this.valuesInit();

        this.writeToFile("start headline", "start")

        this.init();
    }


    restart = () => {
        this.stop();
        this.start();
    }

    makeTrade = () => {
        if( this.runningTime >= this.tradingTime ) {
            
            if( !this.startedTradeNotify ) {
                this.telegram.sendMessage(`We have passed ${this.tradingTime}min,%0Ascript will start trading now! stay tuned 🔥🔥🔥`)
                this.startedTradeNotify = true;
            }

            if(this.trend.curr == "up") {
                if(this.trend.prev == "down") {
                    this.buy();
                } else {
                    this.tradeAction = "NO-ACTION"
                } 
            } else {
                if(this.trend.prev == "up" && this.latestAction.action == "BUY") {
                    this.sell();
                } else {
                    this.tradeAction = "NO-ACTION"
                }  
            }
        } else {
            this.tradeAction = "NO-ACTION"
        }
    }


    buy = () => {
        this.latestAction.action = "BUY";
        this.latestAction.price = this.marketPrice;
        this.tradeAction = "BUY"
        this.telegram.sendMessage(`BUY at price ${this.latestAction.price}`);
    }

    sell = () => {
        this.profit = ( ( this.marketPrice - this.latestAction.price ) / this.latestAction.price ) * 100;
        this.totalProfit += this.profit;
        this.latestAction.action = "SELL";
        this.latestAction.price = 0;
        this.tradeAction = "SELL";

        let profitPercentage = Math.floor(this.profit * 100) / 100;
        if(profitPercentage < 0) {
            profitPercentage += " 🖕 😀"
        } else {
            profitPercentage += " 👏 👏"
        }
        let message = `SELL at price: ${this.marketPrice},%0A with a profit of: ${profitPercentage},%0A profit so far: ${Math.floor(this.totalProfit * 100) / 100}`
        
        this.telegram.sendMessage(message);
    }
}

export default Mentor;