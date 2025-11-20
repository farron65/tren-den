import { useState } from "react";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!username || !password) {
            setError("please fill in both fields");
            return;
        }

        setLoading(true);
        setError("");

        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        try {
            const response = await fetch("http://localhost:8000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString(),
            });

            if (!response.ok) {
                setError("Invalid username or password");
                setLoading(false);
                return;
            }

            const data = await response.json();
            localStorage.setItem("token", data.access_token);

        } catch (err) {
            setError("Something went wrong. Try again");
        }

        setLoading(false);

    }

    return (
        <div className="login-page">
            <h1>Log in to Tren Den</h1>

            {error && <p className="error">{ error }</p>}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label htmlFor="User">Username</label>
                    <input
                        id="username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="field">
                    <label htmlFor="Password">Password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                </button>
            </form>
        </div>
    );
}