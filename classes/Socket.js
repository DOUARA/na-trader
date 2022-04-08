import WebSocket  from 'ws';
import zlib from "zlib";

class Socket {
    constructor (url, sub) {
        this.sub = sub;
        this.socket;
        this.url = url;
        this.restart = true;
    }

    run = ( callback ) => {
        this.socket = new WebSocket(this.url);
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

                    if(result.tick) {
                      callback(result);
                    }

                    // send the pong
                    if(result.ping){
                        this.socket.send(JSON.stringify({pong:result.ping}));
                    }
                      
                });

            } else {
                console.log("Result: " , event.data);
            }
        };

        this.socket.onclose = (event) => {
          if (event.wasClean) {
            console.log(event.code, event.reason);
          } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            console.log('[close] Connection died, Trying to reconnect in 1 second');
           
          }
          
          if( this.restart ) {
            setTimeout( () => {
              this.run( callback );
            }, 1000);
          }
          
          
        };
        
        this.socket.onerror = (error) => {
          console.log(error);
          
          if( this.restart ) {
            setTimeout( () => {
              this.run( callback );
            }, 1000);
          }

        };

    } // init 

    close = () => {
      this.restart = false;
      this.socket.close();
      console.log("Socket has been closed!");
    }
}

export default Socket;