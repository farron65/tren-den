import { useState } from 'react'

function App() {

    const [userName, setUserName] = useState("");    
    const [userPassword, setUserPassword] = useState("");

    async function handleSubmit(e: React.MouseEvent) {
        e.preventDefault();

        const formData = new URLSearchParams();
        formData.append("username", userName);
        formData.append("password", userPassword);

        const url = "http://127.0.0.1:8000/login";
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
            localStorage.setItem("Token", result.access_token);
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

export default App
