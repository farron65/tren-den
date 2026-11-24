import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

import "./auth.css";

type LoginProps = {
    updateToken: (access_token: string, refresh_token: string) => void
}
export default function Login({updateToken}: LoginProps) {

    const [userName, setUserName] = useState("");    
    const [userPassword, setUserPassword] = useState("");
    const [error, setError] = useState("");

    // Set by Signup when it redirects here after creating an account
    const location = useLocation();
    const signedUpAs: string | undefined = location.state?.signedUpAs;

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
    
        setError("");

        try {
            const response = await fetch(`${url}/login`, requestOptions);
            if (!response.ok) {
                setError(response.status === 401
                    ? "Wrong username or password."
                    : "Something went wrong logging in. Please try again.");
                return;
            }

            const result = await response.json();
            updateToken(result.access_token, result.refresh_token);
    
            setUserName("");
            setUserPassword("");

            return (
                navigate("/workouts")
            );
        }
        catch {
            setError("Can't reach the server. Check your connection and try again.");
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Login</h1>
                {error ? (
                    <div className="auth-error" role="alert">
                        <span className="auth-error-icon">!</span>
                        <span>{error}</span>
                    </div>
                ) : signedUpAs && (
                    <div className="auth-success">
                        <span className="auth-success-icon">&#10003;</span>
                        <span>Account created. Log in as {signedUpAs} to get started.</span>
                    </div>
                )}
                <form className="auth-form" onSubmit={(e) => handleSubmit(e)}>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="username" required/>
                    <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="password"/>
                    <div className="forgot-password">
                        <Link to={"/forgot-password"}>Forgot password?</Link>
                    </div>

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