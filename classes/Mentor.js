import Trader from './Trader.js';
import Socket from './Socket.js';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import fetch from 'node-fetch';
import fs from 'fs';

class Mentor {
    constructor(symbol = 'ksmusdt', period = "5min") {
        this.sub = `{"sub": "market.${symbol}.kline.${period}", "id": "${uuidv4()}"}`;
        this.symbol = symbol;
        this.socket = new Socket("wss://api.huobi.pro/ws", this.sub);

        this.time = 0;
        this.marketPrice = 0;

        // Initial values 
        this.afmax = 0.2;
        this.afmin = 0.02;
        
        this.af = {
            prev: 0.02,
            curr: NaN
        };

        this.psar = {
            prev: NaN,
            curr: NaN
        };
        
        this.ep = {
            prev: NaN,
            curr: NaN
        };
        
        this.deff_asset = {
            prev: NaN,
            curr: NaN
        };
        
        this.trend = {
            prev: NaN,
            curr: NaN
        };

        this.high;
        this.low;
    }

    init = () => {
        this.getPeriodicCandle();
    }

    caTrend = () => {
        
        if ( this.psar.curr < this.high ) {
            this.trend.curr = "up"
        }

        if ( this.psar.curr < this.low ) {
            this.trend.curr = "down"
        } 

    }

    caPsar = () => {
        
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
        
        if ( this.trend.curr == "up" && this.high > this.ep.prev ) {
            this.ep.curr = this.high
        }

        if ( this.trend.curr == "up" && this.high <= this.ep.prev ) {
            this.ep.curr = this.ep.prev
        }

        if ( this.trend.curr == "down" && this.low < this.ep.prev ) {
            this.ep.curr = this.low
        }

        if ( this.trend.curr == "down" && this.low >= this.ep.prev ) {
            this.ep.curr = this.ep.prev
        }
    }


    caAf = () => {

        if( this.trend.prev == this.trend.curr ) {
            
            if ( this.af.prev == this.afmax) {
                this.af.curr = this.afmax
            }

            if( this.trend.curr == "up" && this.ep.curr > this.ep.prev ) {
                this.af.curr = this.af.prev + this.afmin
            }

            if( this.trend.curr == "up" && this.ep.curr <= this.ep.prev ) {
                this.af.curr = this.af.prev
            }

            if( this.trend.curr == "down" && this.ep.curr < this.ep.prev ) {
                this.af.curr = this.af.prev + this.afmin
            }

            if( this.trend.curr == "down" && this.ep.curr >= this.ep.prev ) {
                this.af.curr = this.af.prev 
            }
            
        } else {
            this.af.curr = this.afmin;
        }

    }

    caDeff = () => {
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
        
        // In case we don't have previous values 
        if( !this.psar.prev ) this.psar.prev = this.low;
        if( !this.ep.prev ) this.ep.prev = this.high;
        if( !this.deff_asset.prev ) this.deff_asset.prev = (this.ep.prev - this.psar.prev) * this.af.prev;

        // In case we don't have current values 
        if( !this.psar.curr ) this.psar.curr = this.low;
        if( !this.ep.curr ) this.ep.curr = this.high;
        if( !this.deff_asset.curr ) this.deff_asset.curr = (this.ep.curr - this.psar.curr) * this.af.curr;

        // Start calculation
        this.caDeff()
        this.caPsar();
        this.caTrend();
        this.caEp();
        this.caAf();
        
        // Get the current market price 
        const marketResult = await fetch(`https://api.huobi.pro/market/trade?symbol=${this.symbol}`)
        const json = await marketResult.json();
        this.marketPrice = json?.tick?.data[0]?.price;
        
        // Print results 
        this.print();

        // Normalize previous values
        this.af.prev = this.af.curr;
        this.psar.prev = this.psar.curr;
        this.ep.prev = this.ep.curr;
        this.deff_asset.prev = this.deff_asset.curr;
        this.trend.prev = this.trend.curr;
    }
    
    // Get 5min candlestick
    getPeriodicCandle = () => {

        let stage;

        let candles = [];

        this.socket.run( async ( result ) =>  { 
            
            if ( result?.tick ) { 
                
                // time
                const time = result.ts;
                const minute = parseInt( moment(time).format('mm') );

                if ( !stage ) {
                    stage = Math.floor( minute / 5 );
                    candles.push(result);
                } else {
                    if( Math.floor( minute / 5 ) !== stage ) {
                
                        // Calculate final results 
                        this.caFinalResults( candles[candles.length - 1] );
                        
                        candles = [];
                        candles.push(result);
                        stage = Math.floor( minute / 5 )

                    } else { 
                        candles.push( result );
                    }
                }

            }
        })
    }

    print = () => {
        const headLine = "time,trend,deff,af,ep,psar,low,high,market";
        
        let line = `${this.time},`
        line += `${this.trend.curr},`
        line += `${this.deff_asset.curr},`
        line += `${this.af.curr},`
        line += `${this.ep.curr},`
        line += `${this.psar.curr},`
        line += `${this.low},`
        line += `${this.high},`
        line += `${this.marketPrice}`
        
        console.log("headline", headLine)
        console.log("line", line)

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
            this.marketPrice 
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
}

export default Mentor;