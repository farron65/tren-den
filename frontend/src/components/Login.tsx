import { useState } from "react";

export default function Login() {

    const [userName, setUserName] = useState("");    
    const [userPassword, setUserPassword] = useState("");

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();

        const url = "http://127.0.0.1:8000/login";
        const formData = new URLSearchParams();
    
        formData.append("username", userName);
        formData.append("password", userPassword);
    
        const requestOptions = {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: formData
            }
    
        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                throw new Error(`Response status:${response.status}`);
            }
    
            const result = await response.json();
            localStorage.setItem("access_token", result.access_token);
    
            setUserName("");
            setUserPassword("");
        }
        catch(error) {
            alert(error);
        }
    }

    return (
        <div>
            <h1>Login</h1>
            <div>
                <label>Username</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)}/> 
            </div>
            <div>
                <label>Password</label>
                <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)}/> 
            </div>
            <button onClick={(e) => handleSubmit(e)}>Submit</button>
        </div>
    )
}