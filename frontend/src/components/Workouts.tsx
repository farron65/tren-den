import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";

export default function Workouts() {

    const [workouts, setWorkouts] = useState<any[]>([]);
    const navigate = useNavigate();
    
    const access_token = localStorage.getItem("access_token");
    
    useEffect(() => {
        const fetchWorkouts = async () => {
            const url = "http://127.0.0.1:8000/workouts";
            if (!access_token){
                alert("Access token needed");
                return;
            }
            try {
                const response = await fetch(url, {headers: {"Authorization": `Bearer ${access_token}`}});
                if (!response.ok) {
                    throw new Error(`Response status:${response.status}`);
                }
                
                const result = await response.json();
                setWorkouts(result);
            }
            catch(error) {
                alert(error);
            }
        };
        fetchWorkouts();
    }, []);

    if (workouts.length == 0){
        return (
            <div>
                <h1>No past workouts</h1>
            </div>
        )
    }

    return (
        <div>
            <h1>Past workouts</h1>
            <ul>
                {workouts.map(workout => (
                    <li key={workout.id}>
                        <Link to={`/workouts/${workout.id}`}>
                            {workout.workout_name}   
                        </Link>
                        {workout.date}
                    </li>  
                ))}
            </ul>
            <button onClick={() => navigate("/create-workout")}>Create Workout</button>
        </div>
    )
}