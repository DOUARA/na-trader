import { useState, useEffect } from "react";
import styled from "styled-components";
import Button from "./Button";
import Select from "react-select"


const Form = ( {setRenderTable } ) => {
    const [symbol, setSymbol] = useState();
    const [type, setType] = useState( { value: 'data-collection', label: 'Data Collection' });
    const [tradingTime, setTradingTime] = useState(40);
    console.log(type);
    const typeOptions = [
        { value: 'data-collection', label: 'Data Collection' },
        { value: 'real-trading', label: 'Real Trading' }
    ]

    const handleClick = async () => {
        let start =  await fetch("/api/start", {
            method: 'POST', 
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symbol, type: type.value, time: tradingTime
            }) 
        });

        start = await start.json();
        if(start.success == "ok") {
            setRenderTable(true)
        }   
    }

    return (
        <>
            <h1> Start New Process</h1>
            <StyledForm>
                <StyledInput placeholder="Symbol..." value={symbol} onChange={(event) => setSymbol(event.target.value)}></StyledInput>
                <Select defaultValue={type} value={type} onChange={(option) => setType(option)} options={typeOptions} />
                <StyledInput type="number" placeholder="Trading Time..." value={tradingTime} onChange={(event) => setTradingTime(event.target.value)}></StyledInput>
                <Button type="submit" text="Submit" onClick={handleClick} />
            </StyledForm>
        </>

    )
}


const StyledForm = styled.form`
    display: flex;
    flex-direction: column;
    width: 800px;
    max-width: 100%;
    margin: auto;
    flex-wrap: wrap;
    margin-top: 50px;
    justify-content: center;
`

const StyledInput = styled.input`
    padding: 20px;
    font-size: 20px;
    margin: 30px 0;
`


export default Form;