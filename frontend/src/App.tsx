import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Workouts from "./components/Workouts";
import WorkoutPage from "./components/WorkoutPage";
import CreateWorkout from "./components/WorkoutCreate";


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
    const access_token = localStorage.getItem("access_token");

    return (
        <BrowserRouter>
            <Routes>
                <Route path={"/signup"} element={<Signup />}></Route>
                <Route path={"/"} element={<Signup />}></Route>
                <Route path={"/login"} element={<Login />}></Route>

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
            </Routes>
        </BrowserRouter>
    )
}

export default App
