import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";

export default function WorkoutsHistory() {

    const [workouts, setWorkouts] = useState<any[]>([]);
    const navigate = useNavigate();
    
    const access_token = localStorage.getItem("access_token");
    const url = "http://127.0.0.1:8000/workouts";

    useEffect(() => {
        const fetchWorkouts = async () => {
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

    async function handleDelete(targetID: string) {
        const url = `http://127.0.0.1:8000/workouts/${targetID}`;
        const requestOptions = {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            }
        }

        try {
            const response = await fetch(url, requestOptions);
    
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            alert("Successfully deleted workout");
            const updatedWorkouts = workouts.filter((workout) => workout.id != targetID);
            setWorkouts(updatedWorkouts);
        }
        catch (error) {
            alert(error);
        }

    }

    if (workouts.length == 0){
        return (
            <div>
                <h1>No past workouts</h1>
                <button onClick={() => navigate("/create-workout")}>Create Workout</button>
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
                        <button onClick={() => handleDelete(workout.id)}>X</button>
                    </li> 
                ))}
            </ul>
            <button onClick={() => navigate("/create-workout")}>Create Workout</button>
            <button onClick={() => navigate("/templates/")}>Templates</button>
        </div>
    )
}