import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar"

export default function AppLayout() {
    return (
        <div>
            <Sidebar/>
            <Outlet/>
        </div>
    )
}