import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Workouts from "./components/Workouts";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path={"/signup"} element={<Signup />}></Route>
                <Route path={"/login"} element={<Login />}></Route>
                <Route path={"/workouts"} element={<Workouts />}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
