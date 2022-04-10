import styled from "styled-components";

const Button = ({text, onClick, type}) => {
    return <StyledButton type={type || "button"} onClick={onClick}>{text}</StyledButton>
}


const StyledButton = styled.button`
    width: 200px;
    padding: 20px;
    font-size: 18px;
    cursor: pointer;
    margin-top: 50px;
`

export default Button;