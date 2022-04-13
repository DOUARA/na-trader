import Mentor from './classes/Mentor.js';
import path from 'path'

const aMentor = new Mentor();

// Server
import express from 'express'
const app = express()

// MiddleWares
app.use(express.json({ extended: true }));

app.use('/', express.static(path.join("client", 'build')))

app.get('/api/info', (req, res) => {
  try {
    const info = aMentor.getInfo();
    res.send(info);
  } catch (error) {
    res.status(500).json([{ msg: "Internal Server Error" }]);
  }
});

app.post("/api/stop", (req, res) => {
  try {
    const info = aMentor.getInfo();
    if( info.status == "on") {
      aMentor.stop();
      res.send( { success: "ok", id: info.sessionId } );
    } else {
      res.send( { success: "ok" } );
    }
  } catch (error) {
    res.status(500).json([{ msg: "Internal Server Error" }]);
  }
});


app.post("/api/start", (req, res) => {
  try {
    const { symbol, type, time } = req.body;
    aMentor.setSymbol(symbol);
    aMentor.setType(type);
    aMentor.setTradingTime(time);
    aMentor.start();
    const info = aMentor.getInfo();
    res.send( { success: "ok", id: info.sessionId } );
  } catch (error) {
    console.log(error);
    res.status(500).json([{ msg: "Internal Server Error" }]);
  }
})

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server Running on Port ${PORT}`));
