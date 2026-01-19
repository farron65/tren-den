
import { useState } from "react";

import "./auth.css";


export default function ForgetPassword() {
    const [userEmail, setEmail] = useState("");
    const [success, setSuccess] = useState(false);

    const baseURL = import.meta.env.VITE_API_URL;
    
    const isValid = userEmail.includes("@")

    async function handleSendResetLink(e: React.FormEvent) {

        e.preventDefault();

        const url = `${baseURL}/forgot-password`;

        const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email: userEmail})
        }

        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                throw new Error("Error");
            }

            const result = await response.json();
            if (result) setSuccess(true);
        }
        catch (error) {
            alert(error)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Forgot Password</h1>

                {!success && 
                    <form className="auth-form" onSubmit={(e) => handleSendResetLink(e)}>
                        <input
                            type="email"
                            placeholder="email"
                            value={userEmail}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <button className="auth-submit" type="submit" disabled={!isValid}>
                            Send Reset Link
                        </button>
                    </form>
                }

                {success && (
                    <div className="auth-success">
                        <span className="auth-success-icon">&#10003;</span>
                        <p>Check your email for a reset link</p>
                    </div>
                )}


                <p className="auth-footer">
                    Remembered your password?
                    <a href="/login">Back to login</a>
                </p>
            </div>
        </div>
    );
}

