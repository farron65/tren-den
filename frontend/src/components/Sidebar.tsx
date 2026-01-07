import { NavLink } from "react-router-dom";

import "./sidebar.css";

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <h2 className="logo">TRENDEN</h2>

            <nav className="nav">
                <NavLink to="/create-workout"></NavLink>
                <NavLink to="/workouts"></NavLink>
                <NavLink to="/templates"></NavLink>
                <NavLink to="/analytics"></NavLink>
            </nav>
        </aside>
    );
}