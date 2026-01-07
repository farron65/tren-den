import { NavLink } from "react-router-dom";

import "./sidebar.css";

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <h2 className="logo">TRENDEN</h2>

            <nav className="nav">
                <NavLink to="/workouts">Home</NavLink>
                <NavLink to="/create-workout">Start Workout</NavLink>
                <NavLink to="/templates">Templates</NavLink>
                <NavLink to="/analytics">Analytics</NavLink>
            </nav>
        </aside>
    );
}