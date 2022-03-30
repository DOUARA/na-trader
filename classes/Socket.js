import WebSocket  from 'ws';
import zlib from "zlib";

class Socket {
    constructor (url, sub) {
        this.sub = sub;
        this.socket = new WebSocket(url);
    }

    run = ( callback ) => {

        this.socket.onopen = (e) => {
          console.log("[open] Connection established");
          console.log("Sending to server");
          console.log("sub:", this.sub);
          
          // Subscribe 
          this.socket.send(this.sub);
        };
        
        this.socket.onmessage = (event) => {
            
            if (Buffer.isBuffer(event.data)) {

                zlib.unzip(event.data, (err, buffer) => {
      
                    let result = JSON.parse(buffer.toString('utf8'));
                    //console.log(result)
                    if(result.tick) {
                      callback(result);
                    }

                    //console.log(result);

                    //console.log(result)

                    // send the pong
                    if(result.ping){
                        this.socket.send(JSON.stringify({pong:result.ping}));
                    }
                      
                });

            } else {
                console.log("Result: " , event.data);
            }
        };

        this.socket.onclose = function(event) {
          if (event.wasClean) {
            console.log(event.code, event.reason);
          } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            console.log('[close] Connection died');
          }
        };
        
        this.socket.onerror = function(error) {
          console.log(error);
        };

    } // init 

    close = () => {
      this.socket.close();
      console.log("Socket has been closed!");
    }
}

export default Socket;