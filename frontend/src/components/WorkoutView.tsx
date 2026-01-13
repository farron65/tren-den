import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./workoutview.css";

export default function WorkoutView() {
    const workoutId = useParams();
    const [workout, setWorkout] = useState<any>(null);
    const access_token = localStorage.getItem("access_token");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchWorkout = async () => {
            const baseURL = import.meta.env.VITE_API_URL;

            const url = `${baseURL}/workouts/` + workoutId.id;

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
                console.log(result);
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
        <div className="page workout-page">
            {/* HEADER */}
            <header className="workout-header">
                <div className="workout-meta">
                    <h1 className="workout-title-input workout-view-title">
                        {workout.workout_name}
                    </h1>

                    <span className="workout-date">
                        {getWorkoutDate(workout.date)}
                    </span>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                    <button className="finish-btn" onClick={() => navigate("/workouts")}>
                        BACK
                    </button>
                    <button
                        className="finish-btn"
                        onClick={() =>
                        navigate(`/edit-workout/${workout.id}`, { replace: true })
                        }
                    >
                        EDIT
                    </button>
                </div>
            </header>

            {/* MAIN */}
            <main className="exercise-list">
                {workout.exercises.map((exercise: any) => (
                <section key={exercise.id} className="exercise-block">
                    {/* Exercise header */}
                    <div className="exercise-header">
                        <h3 className="exercise-name view">
                            {exercise.exercise_name}
                        </h3>
                    </div>

                    {/* Sets table */}
                    <div className="set-table">
                        <div className="set-row header view">
                            <span>SET</span>
                            <span></span> {/* Couldn't fix alignment, so did this instead*/}
                            <span>LBS</span>
                            <span>REPS</span>
                        </div>

                        {exercise.sets.map((set: any, index: number) => (
                            <div key={set.id} className="set-row view">
                            <span className="set-index">{index + 1}</span>
                            <span>{set.weight}</span>
                            <span>{set.reps}</span>
                            </div>
                        ))}
                    </div>
                </section>
                ))}
            </main>
        </div>
    )
}

