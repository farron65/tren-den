import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import Signup from "./components/Signup";

import AppLayout from "./components/AppLayout";

import WorkoutsHistory from "./components/WorkoutsHistory";
import WorkoutView from "./components/WorkoutView";
import WorkoutForm from "./components/WorkoutForm";
import LogWorkout from "./components/LogWorkout";
import TemplateList from "./components/TemplateList";
import TemplateView from "./components/TemplateView";
import EditWorkoutForm from "./components/EditWorkoutForm";
import Graphs from "./components/Graphs";
import { useState } from "react";


type ProtectedRouteProps = {
    token: string | null;
    redirectPath?: string;
    children: React.ReactNode;
}

const ProtectedRoute = ({ token, redirectPath="/", children }: ProtectedRouteProps) => {
    if (!token) {
        return <Navigate to={redirectPath} replace/>
    }
    return children
}

function App() {
    const [access_token, setToken] = useState<string | null>(localStorage.getItem("access_token"));

    const updateToken = (newToken: string) => {
        localStorage.setItem("access_token", newToken);
        setToken(newToken);
    }

    return (
        <BrowserRouter>
            <Routes>

                <Route path={"/signup"} element={<Signup />}></Route>
                <Route path={"/"} element={<Login updateToken={updateToken}/>}></Route>
                <Route path={"/login"} element={<Login updateToken={updateToken}/>}></Route>

                <Route element={
                    <ProtectedRoute token={access_token}>
                        <AppLayout/>
                    </ProtectedRoute>}>
                    <Route
                        path={"/workouts"}
                        element={<WorkoutsHistory/>}>
                    </Route>
                    <Route
                        path={"/workouts/:id"} 
                        element={<WorkoutView />}>
                    </Route>
                    <Route 
                        path={"/log-workout/:id"}
                        element={<LogWorkout />}>
                    </Route>
                    <Route 
                        path={"/create-workout/"}
                        element={<WorkoutForm isTemplate={false}/>}>
                    </Route>
                    <Route 
                        path={"/create-template/"}
                        element={<WorkoutForm isTemplate={true}/>}>
                    </Route>
                    <Route 
                        path={"/templates/"}
                        element={<TemplateList />}>
                    </Route>
                    <Route
                        path={"/templates/:id"}
                        element={<TemplateView />}>
                    </Route>
                    <Route
                        path={"/edit-template/:id"}
                        element={<EditWorkoutForm isTemplate={true}/>}>
                    </Route>
                    <Route
                        path={"/edit-workout/:id"}
                        element={<EditWorkoutForm isTemplate={false}/>}>
                    </Route>
                    <Route path={"/analytics"}
                        element={<Graphs/>}>
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
