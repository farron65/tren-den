
import { useState } from "react";

import "./auth.css";
import { useSearchParams } from "react-router-dom";

export default function ResetPassword() {
    
    const [searchParams] = useSearchParams();
    const resetToken = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [success, setSuccess] = useState(false);

    const baseURL = import.meta.env.VITE_API_URL;
    
    const isValid = password.trim() && confirmPassword.trim() && password === confirmPassword;

    async function HandleSubmit() {
        const url = `${baseURL}/reset-password`;

        const dataToSend = {
            token: resetToken,
            new_password: confirmPassword
        }

         const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(dataToSend)
        }

        console.log(JSON.stringify(dataToSend));

        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                throw new Error("Error");
            }

            const result = await response.json();
            console.log(result);

            if (result) setSuccess(true);
        }
        catch (error) {
            alert(error);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Forgot Password</h1>

                {!success && 
                    <form className="auth-form" onSubmit={() => HandleSubmit}>
                        <input
                            type="password"
                            placeholder="new password"
                            value={password}
                            required
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="confirm new password"
                            value={confirmPassword}
                            required
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <button className="auth-submit" type="submit" disabled={!isValid}>
                            Update password
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

