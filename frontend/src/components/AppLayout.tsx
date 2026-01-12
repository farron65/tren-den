import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar"

import "./applayout.css";

export default function AppLayout() {
    return (
        <div className="app-layout">
            <Sidebar/>
            <div className="main-content">
                <Outlet/>
            </div>
        </div>
    )
}