import { NavLink } from "react-router-dom";
import { useState } from "react";

import "./sidebar.css";
import hamburgerIcon from "../assets/hamburger.png";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
        <button className="mobile-hamburger" onClick={() => setCollapsed(true)}>
            <img src={hamburgerIcon} alt="open menu" />
        </button>
        <div className={`sidebar-overlay ${collapsed ? "active" : ""}`}
            onClick={() => setCollapsed(false)}>
        </div>

        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-top">
                <h2 className="logo">TREN DEN</h2>

                <button
                className="collapse-btn"
                onClick={() => setCollapsed(!collapsed)}
                >
                <img src={hamburgerIcon} alt="close menu" />
                </button>
            </div>

            <nav className="nav">
                <NavLink to="/workouts">Home</NavLink>
                <NavLink to="/create-workout">Start Workout</NavLink>
                <NavLink to="/create-template">Create Template</NavLink>
                <NavLink to="/templates">Templates</NavLink>
                <NavLink to="/analytics">Analytics</NavLink>
                <NavLink to="/import-workout">Import Workout</NavLink>
            </nav>
        </aside>
    </>
  );
}
