import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Workouts from "./components/Workouts";
import WorkoutPage from "./components/WorkoutPage"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path={"/signup"} element={<Signup />}></Route>
                <Route path={"/"} element={<Signup />}></Route>
                <Route path={"/login"} element={<Login />}></Route>
                <Route path={"/workouts"} element={<Workouts />}></Route>
                <Route path={"/workouts/:id"} element={<WorkoutPage/>}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
