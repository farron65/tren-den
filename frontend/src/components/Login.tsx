import { Link, useNavigate} from "react-router-dom";
import { useState } from "react";

import "./auth.css";

type LoginProps = {
    updateToken: (token: string) => void
}
export default function Login({updateToken}: LoginProps) {

    const [userName, setUserName] = useState("");    
    const [userPassword, setUserPassword] = useState("");

    const isValid = userName.trim() && userPassword.trim()

    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();

        const url = import.meta.env.VITE_API_URL;
        const formData = new URLSearchParams();
    
        formData.append("username", userName);
        formData.append("password", userPassword);
    
        const requestOptions = {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: formData
            }
    
        try {
            const response = await fetch(`${url}/login`, requestOptions);
            if (!response.ok) {
                throw new Error(`You entered invalid data.`);
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
                <form className="auth-form" onSubmit={(e) => handleSubmit(e)}>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="username" required/>
                    <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="password"/>
                    
                    <button className="auth-submit" disabled={!isValid} type="submit">Login</button>
                </form>
                <p className="auth-footer">
                    Not registered?
                    <Link to="/signup">Create an account</Link>
                </p>
            </div>
        </div>
    )
}