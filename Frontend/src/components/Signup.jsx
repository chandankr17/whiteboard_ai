
import { useState } from "react";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";

export default function Signup({ onLogin }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/auth/register", { name, email, password });
            const token = res.data.token;

            // Auto-login
            localStorage.setItem("token", token);
            onLogin(token);
            navigate("/");
        } catch (err) {
            console.error(err);
            if (err.response) {
                setError(err.response.data.error || "Server Error: " + err.response.status);
            } else if (err.request) {
                setError("Network Error: Can't reach server. Is it running?");
            } else {
                setError("Error: " + err.message);
            }
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column" }}>
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", width: "300px", gap: "10px" }}>
                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: "8px" }} />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: "8px" }} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: "8px" }} />
                <button type="submit" style={{ padding: "10px", backgroundColor: "#1e40af", color: "white", border: "none", cursor: "pointer" }}>Sign Up</button>
                {error && <p style={{ color: "red" }}>{error}</p>}
            </form>
            <p>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
}
