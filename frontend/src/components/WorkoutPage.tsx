import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function WorkoutPage() {
    const workoutId = useParams();
    const [workout, setWorkout] = useState<any>(null);
    const access_token = localStorage.getItem("access_token");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchWorkout = async () => {
            const url = "http://127.0.0.1:8000/workouts/" + workoutId.id;

            if (!access_token) {
                alert("Access token needed");
                return;
            }

            try {
                const response = await fetch(url, {headers: {"Authorization": `Bearer ${access_token}`}});
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                setWorkout(result);
            }
            catch(error) {
                alert(error);
            }
        };
        fetchWorkout();
    }, []);

    function getWorkoutDate(workoutDate: Date) {
        const dt = new Date(workoutDate)

        const month = dt.toLocaleString("default", {month: "short"});
        const day = dt.getDate();
        const year = dt.getFullYear();

        return `${month} ${day}, ${year}`; 
    }
    

    if (!workout) {
        return (
            <div>
                <h1>Loading...</h1>
                <button onClick={() => navigate("/workouts")}>Go back</button>
            </div>
        )
    }
    return (
        <div>
            <h1>
                {workout.workout_name}
            </h1>
            <button onClick={() => navigate("/workouts")}>Go back</button>
            <button onClick={() => navigate(`/edit-workout/${workout.id}`, {replace: true})}>Edit</button>
            <h4>Date: {getWorkoutDate(workout.date)} </h4>
            {workout.exercises.map((exercise: any) => (
                <li key={exercise.id}>
                    <h3>
                        Exercise Name: {exercise.exercise_name}
                    </h3>
                    {exercise.sets.map((set: any) => (
                        <div key={set.id}>
                            <label>
                                {set.weight} lbs x {set.reps}
                            </label>
                        </div>
                        ))}
                </li>
            ))}

        </div>
    )
}

