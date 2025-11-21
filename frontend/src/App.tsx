import { useState } from 'react'

function App() {

    const [userName, setUserName] = useState("");    
    const [userPassword, setUserPassword] = useState("");
    const [userEmail, setUserEmail] = useState("");

    const [isSignUpMode, setSignUpMode] = useState(false);

    async function handleSubmit(e: React.MouseEvent) {
        e.preventDefault();
        
        let url = "http://127.0.0.1:8000/";

        if (isSignUpMode) {
            const data = {
                username: userName,
                email: userEmail,
                password: userPassword
            }

            const jsonData = JSON.stringify(data);
            url += "signup"

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: jsonData
                });
    
                if (!response.ok) {
                    throw new Error(`Response status:${response.status}`);
                }
                const result = await response.json();
                alert(
                    "SUCCESS\nUsername: " + result.username + "\nEmail" + result.email + "\nPassword: " + result.password
                );
            }
            catch(error) {
                alert(error);
            }
        }
        else {
            const formData = new URLSearchParams();

            formData.append("username", userName);
            formData.append("password", userPassword);

            url += "login";
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
    }

    function handleSignUpMode(e: React.MouseEvent) {
        e.preventDefault();

        setSignUpMode(!isSignUpMode);
    }

    if (!isSignUpMode) {
        return (
            <>
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
            <button onClick={(e) => handleSignUpMode(e)}>Don't have an account?</button>
            </>
        )
    }
    return (
        <>
        <div>
            <h1>Signup</h1>
            <div>
                <label>Username</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)}/> 
            </div>
            <div>
                <label>Email</label>
                <input type="text" value={userEmail} onChange={(e) => setUserEmail(e.target.value)}/> 
            </div>
            <div>
                <label>Password</label>
                <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)}/> 
            </div>
            <button onClick={(e) => handleSubmit(e)}>Submit</button>
        </div>
        <button onClick={(e) => handleSignUpMode(e)}>Log in?</button>
        </>
    )
}

export default App
