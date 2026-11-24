import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./auth.css";

export default function Signup() {
    const [userName, setUserName] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [error, setError] = useState("");

    const isValid = userName.trim() && userPassword.trim() && userEmail.includes("@")

    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const url = import.meta.env.VITE_API_URL;

        const data = {
            username: userName,
            email: userEmail,
            password: userPassword
        }

        const jsonData = JSON.stringify(data);

        setError("");

        let response: Response;
        try {
            response = await fetch(`${url}/signup`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: jsonData
            });
        }
        catch {
            setError("Can't reach the server. Check your connection and try again.");
            return;
        }

        if (!response.ok) {
            setError(await getSignupError(response));
            return;
        }

        const result = await response.json();
        navigate("/login", { state: { signedUpAs: result.username } });
    }

    // Turns the backend's error response into a message that says what to fix
    async function getSignupError(response: Response) {
        if (response.status === 409) {
            return "That username is already taken.";
        }
        if (response.status === 422) {
            const body = await response.json().catch(() => null);
            // FastAPI validation errors: detail is a list like [{ loc: ["body", "email"], msg: "..." }]
            const field = body?.detail?.[0]?.loc?.at(-1);
            if (field === "email") return "Enter a valid email address.";
            if (field === "username") return "Enter a valid username.";
            if (field === "password") return "Enter a valid password.";
        }
        return "Something went wrong creating your account. Please try again.";
    }
    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Sign Up</h1>
                {error && (
                    <div className="auth-error" role="alert">
                        <span className="auth-error-icon">!</span>
                        <span>{error}</span>
                    </div>
                )}
                <form className="auth-form" onSubmit={(e) => handleSubmit(e)}>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="username" required/>
                    <input type="text" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="email address"/>
                    <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="password"/>
                    
                    <button className="auth-submit" disabled={!isValid} type="submit">Create</button>
                </form>
                <p className="auth-footer">
                    Already registered?
                    <Link to="/login">Sign In</Link>
                </p>
            </div>
        </div>
    )
}