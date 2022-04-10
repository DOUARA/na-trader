import { useEffect, useState } from 'react';
import styled from "styled-components"
import Button from "./Button";

const titleBackground = "#FFE0DA";
const valuesBackground = "#E7F4FF";

const Table = ( { setRenderTable } ) => {

    const [ info, setInfo ]= useState({});

    useEffect(()=> {
        (async () => {
            let response = await fetch('/api/info')
            response = await response.json()
            setInfo(response);
            console.log(response);
        })();

    }, []);

    const handleClick = async () => {
        // Stop the previous process 
        let stop =  await fetch("/api/stop", { method: 'POST' });
        stop = await stop.json();
        if(stop.success == "ok") {
            setRenderTable(false)
        }
    }

    return (
        <>
        <h1>Current Process Info</h1>
       <Container>
           <Row>
            <Column background={titleBackground} size="18px">ID</Column>
            <Column background={valuesBackground}>{info.sessionId ? info.sessionId : "N/A"}</Column>
           </Row>
           <Row>
            <Column background={titleBackground} size="18px">Status</Column>
            <Column background={valuesBackground}>{info.status}</Column>
           </Row>
           <Row>
            <Column background={titleBackground} size="18px">Symbol</Column>
            <Column background={valuesBackground}>{info.symbol ? info.symbol : "N/A"}</Column>
           </Row>
           <Row>
            <Column background={titleBackground} size="18px">Type</Column>
            <Column background={valuesBackground}>{info.type ? info.type : "N/A"}</Column>
           </Row>
           <Row>
            <Column background={titleBackground} size="18px">Trading Time</Column>
            <Column background={valuesBackground}>{info.tradingTime ? info.tradingTime + "mins" : "N/A"}</Column>
           </Row>
       </Container>
       <Button text={`${info.status == "off" ? "Start New" : "Stop and start new"}`} onClick={handleClick} />
       </>
    )

}

export default Table;


const Container = styled.div`
    display: flex;
    width: 800px;
    max-width: 100%;
    margin: auto;
    flex-wrap: wrap;
    margin-top: 50px;
    justify-content: center;
`

const Row = styled.div`
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    border-bottom: 1px solid #0F3756;
`

const Column = styled.div`
    font-size: ${props => props.background};
    width: 50%;
    padding: 20px;
    box-sizing: border-box;
    background: ${props => props.background}
`