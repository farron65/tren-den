import { Link, useNavigate} from "react-router-dom";
import { useState } from "react";

import "./auth.css";

type LoginProps = {
    updateToken: (token: string) => void
}
export default function Login({updateToken}: LoginProps) {

    const [userName, setUserName] = useState("");    
    const [userPassword, setUserPassword] = useState("");
    const navigate = useNavigate();

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
            updateToken(result.access_token);
    
            setUserName("");
            setUserPassword("");

            return (
                navigate("/workouts")
            );
        }
        catch(error) {
            alert(error);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Login</h1>
                <form className="auth-form">
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="username" required/>
                    <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="password"/>
                </form>
                <button className="auth-submit" type="submit" onClick={(e) => handleSubmit(e)}>Login</button>
                <p className="auth-footer">
                    Not registered?
                    <Link to="/signup">Create an account</Link>
                </p>
            </div>
        </div>
    )
}