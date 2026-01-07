import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar"

import "./applayout.css";

export default function AppLayout() {
    return (
        <div className="layout">
            <Sidebar/>
            <div className="main">
                <Outlet/>
            </div>
        </div>
    )
}