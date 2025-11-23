import { useState, useEffect } from "react"

export default function Workouts() {

    const [workouts, setWorkouts] = useState<any[]>([]);
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
                        {workout.workout_name}
                        {workout.date}
                    </li>  
                ))}
            </ul>
        </div>
    )
}