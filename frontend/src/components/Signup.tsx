import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./auth.css";

export default function Signup() {
    const [userName, setUserName] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [userEmail, setUserEmail] = useState("");

    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        const url = import.meta.env.VITE_API_URL;
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
            const response = await fetch(`${url}/signup`, {
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

            navigate("/workouts");
        }
        catch(error) {
            alert(error);
        }
    }
    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Sign Up</h1>
                <form className="auth-form">
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="username" required/>
                    <input type="text" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="email address"/>
                    <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="password"/>
                </form>
                <button className="auth-submit" type="submit" onClick={(e) => handleSubmit(e)}>Create</button>
                <p className="auth-footer">
                    Already registered?
                    <Link to="/login">Sign In</Link>
                </p>
            </div>
        </div>
    )
}