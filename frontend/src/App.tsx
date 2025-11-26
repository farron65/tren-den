import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Workouts from "./components/Workouts";
import WorkoutPage from "./components/WorkoutPage";
import CreateWorkout from "./components/WorkoutCreate";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path={"/signup"} element={<Signup />}></Route>
                <Route path={"/"} element={<Signup />}></Route>
                <Route path={"/login"} element={<Login />}></Route>
                <Route path={"/workouts"} element={<Workouts />}></Route>
                <Route path={"/workouts/:id"} element={<WorkoutPage/>}></Route>
                <Route path={"/create-workout/"} element={<CreateWorkout/>}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
