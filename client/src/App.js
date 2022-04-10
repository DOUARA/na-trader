import { useState } from "react"; 
import './App.css';
import Table from './components/Table';
import Form from './components/Form';


function App() {
  const [renderTable, setRenderTable] = useState(true);

  return (
    <div className="App">
      {renderTable ? <Table setRenderTable = { setRenderTable } /> : <Form setRenderTable={setRenderTable} />}
    </div>
  );
}

export default App;
