import styled from "styled-components";

const Button = ({text, onClick, type}) => {
    const clickHandle = (event) => {
        if ( window.confirm('Are you sure to perform this action?') ) {
            onClick();
        }
       
        event.preventDefault()
    }
    return <StyledButton type={type || "button"} onClick={clickHandle}>{text}</StyledButton>
}


const StyledButton = styled.button`
    width: 200px;
    padding: 20px;
    font-size: 18px;
    cursor: pointer;
    margin:40px auto;
`

export default Button;