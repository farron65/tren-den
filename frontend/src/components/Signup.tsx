import { useState } from "react";
import { Link } from "react-router-dom";

export default function Signup() {
    const [userName, setUserName] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [userEmail, setUserEmail] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        const url = "http://127.0.0.1:8000/signup";
        if (userName.trim().length === 0 || userPassword.trim().length === 0) {
            return alert("All fields must be filled.");
        }

       
        if (userEmail.trim().length === 0) {
            return alert("All fields must be filled.");
        }
        const data = {
            username: userName,
            email: userEmail,
            password: userPassword
        }

        const jsonData = JSON.stringify(data);

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
                "SUCCESS\nUsername: " + result.username + "\nEmail" + result.email
            );

            setUserName("");
            setUserPassword("");
            setUserEmail("");

        }
        catch(error) {
            alert(error);
        }
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
        <Link to="/login">
                <h3>Already have an account</h3>
        </Link>
        </>
    )
}