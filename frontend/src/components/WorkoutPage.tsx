import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function WorkoutPage() {
    const workoutId = useParams();
    const [workout, setWorkout] = useState<any>(null);
    const access_token = localStorage.getItem("access_token");

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
    

    if (!workout) {
        return (
            <div>
                <h1>Loading...</h1>
            </div>
        )
    }
    return (
        <div>
            <h1>
                Workout: {workout.workout_name}
            </h1>
            <h4>Date: {workout.date} </h4>
            {workout.exercises.map((exercise: any) => (
                <li key={exercise.id}>
                    <h3>
                        Exercise Name: {exercise.exercise_name}
                    </h3>
                    {exercise.sets.map((set: any) => (
                        <h4 key={set.id}>
                            Weight: {set.weight}

                            Reps: {set.reps}
                        </h4>
                        ))}
                </li>
            ))}
        </div>
    )
}

