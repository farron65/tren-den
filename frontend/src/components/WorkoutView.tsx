import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { authenticatedFetch } from "../api/apiClient";

import "./workoutview.css";

interface Set {
    id: string
    weight: number,
    reps: number,
    completed: boolean,
    deleting?: boolean,
    rest_time: number
}

interface Exercise {
    id: string,
    exercise_name: string,
    rest_time: number
    sets: Set[]
}

interface Workout {
    id: string,
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export default function WorkoutView() {
    const workoutId = useParams();
    const [workout, setWorkout] = useState<Workout>({
        id: "",
        workout_name: "",
        date: "",
        exercises: []
    });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchWorkout = async () => {
            try {
                const response = await authenticatedFetch(`/workouts/${workoutId.id}`, "GET");
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

    async function SaveWorkoutAsTemplate() {

        const dataToSend = {
            workout_name: workout.workout_name,
            exercises: workout.exercises.map((exercise: Exercise) => ({
                exercise_name: exercise.exercise_name,
                rest_time: exercise.rest_time,
                sets: exercise.sets.map((set: Set) => ({
                    weight: set.weight,
                    reps: set.reps,
                    rest_time: set.rest_time
                }))
            }))
        }

        try {
            const newWorkoutTemplate = await authenticatedFetch(`/templates`, "POST", dataToSend);
            if (!newWorkoutTemplate.ok) {
                if (newWorkoutTemplate.status === 409) {
                    alert(`Template with name: '${workout.workout_name}' already exists. Please update the current workout name, to save it as a template.`);
                    return;
                }
                throw new Error(`Response status: ${newWorkoutTemplate.status}`);
            }

            alert(`New template with name: '${workout.workout_name}' has been created successfully`);
            navigate("/templates");
        }
        catch (error) {
            alert(error);
        }
    }

    function getWorkoutDate(workoutDate: string) {
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
                    <button className="finish-btn" onClick={SaveWorkoutAsTemplate}>
                        SAVE AS TEMPLATE
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

