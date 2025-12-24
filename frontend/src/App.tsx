import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Workouts from "./components/Workouts";
import WorkoutPage from "./components/WorkoutPage";
import CreateWorkout from "./components/WorkoutCreate";
import TemplateList from "./components/TemplateList";
import TemplateView from "./components/TemplateView";
import EditTemplate from "./components/EditTemplate";
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

                <Route
                    path={"/workouts"}
                    element={<ProtectedRoute token={access_token}>
                        <Workouts/>
                    </ProtectedRoute>}>
                </Route>
                <Route
                    path={"/workouts/:id"} 
                    element={<ProtectedRoute token={access_token}>
                        <WorkoutPage />
                    </ProtectedRoute>}>
                </Route>
                <Route 
                    path={"/create-workout/"}
                    element={<ProtectedRoute token={access_token}>
                        <CreateWorkout />
                    </ProtectedRoute>}>
                </Route>
                <Route 
                    path={"/templates/"}
                    element={<ProtectedRoute token={access_token}>
                        <TemplateList />
                    </ProtectedRoute>}>
                </Route>
                <Route
                    path={"/templates/:id"}
                    element={<ProtectedRoute token={access_token}>
                        <TemplateView />
                    </ProtectedRoute>}>
                </Route>
                <Route
                    path={"/edit-template/:id"}
                    element={<ProtectedRoute token={access_token}>
                        <EditTemplate />
                    </ProtectedRoute>}>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
