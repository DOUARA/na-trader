import fetch from 'node-fetch';

class Telegram {
    constructor() {
        this.key = "5220201260:AAFctVpg-l4FDVM7ttXkn0fJMfE0_FsbYV8"
        this.channelName = "-1001576024085"
    }

    sendMessage = async ( message ) => {
       /*
        try {
            const result = await fetch(`https://api.telegram.org/bot${this.key}/sendMessage?chat_id=${this.channelName}&text=${message}`);
            const json = await result.json();
            console.log(json);
        } catch(err) {
            console.error(err);
        }
        */

    }
}

export default Telegram;