import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./workoutform.css";

import deleteButtonIcon from "../assets/delete.png";
import checkIcon from "../assets/check.png";
import { useWorkout } from "./useWorkout";
import { usePreviousSets } from "./usePreviousSets";

interface Set {
    id: string
    weight: number,
    reps: number,
    completed?: boolean,
    deleting?: boolean
}

interface Exercise {
    id: string,
    exercise_name: string,
    sets: Set[]
}

interface Workout {
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

interface WorkoutProps {
    isTemplate: boolean
}

export default function WorkoutForm({isTemplate}: WorkoutProps) {

    const { workoutForm, setWorkoutForm, ChangeWorkoutValues, AddExercise, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet } = useWorkout({
        workout_name: "",
        date: "",
        exercises: []
    })

    const { workoutExercises, debouncedRequest, ShowPreviousSets} = usePreviousSets();
    
    const [confirmExerciseId, setConfirmExerciseId] = useState<string | null>(null);
    const [confirmExerciseName, setConfirmExerciseName] = useState("");
    
    const navigate = useNavigate();
    const access_token = localStorage.getItem("access_token");

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();
        
        const workout_name = workoutForm.workout_name ? workoutForm.workout_name : getHH();

        const url = "http://127.0.0.1:8000/";

        const validData = workoutForm.exercises.every(isValidData);
        if (!validData) {
            alert("All fields must be filled")
            return;
        }
    
        const dataToSend = {
            workout_name: workout_name,
            date: getDate("post"),
            exercises: workoutForm.exercises.map((exercise) => ({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight, 
                    reps: set.reps
                }))
            }))
        }

        try {
            if (isTemplate) {
                const {date, ...templateToSend} = dataToSend;

                const response = await fetch(`${url}templates`, getRequestOptions("POST", templateToSend));
                
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                alert("Successfully created a new template");
    
                return (
                    navigate(`/templates/${result.id}`)
                );
            }
            else {
                const response = await fetch(`${url}workouts`, getRequestOptions("POST", dataToSend));
                
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                alert("Successfully created a new workout");
    
                return (
                    navigate(`/workouts/${result.id}`)
                );
            }
        }
        catch (error) {
            alert(error);
        }
    }

    function getRequestOptions(method: string, data: object) {
        const requestOptions = {
            method: method,
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
                },
            body: JSON.stringify(data)
        }
        return requestOptions;
    }

    function getDate(dateType: string) {
        const today = new Date();

        if (dateType === "view") {
            const month = today.toLocaleString("default", {month: "short"});
            const day = today.getDate();
            const year = today.getFullYear();
    
            return `${month} ${day}, ${year}`; 
        }
        return today.toISOString();
    }

    function getHH() {
        const today = new Date()
        return today.getHours() < 12 ? "Morning Workout" : today.getHours() < 18 ? "Afternoon Workout" : "Evening workout";
    }

    function isValidData(exercise: Exercise) {
        if (!exercise.exercise_name) {
            return false
        }
        const valid = exercise.sets.every((set) => {
            if (!set.reps) {
                return false;
            }
            return true;
        })
        return valid;
    }
    
    function ChangeExerciseName(id: string, newExerciseName: string) {
        const updatedExerciseName = workoutForm.exercises.map((exercise) => exercise.id == id ? {...exercise, exercise_name: newExerciseName} : exercise);
        setWorkoutForm({...workoutForm, exercises: updatedExerciseName});

        debouncedRequest.current(newExerciseName, workoutExercises);
    }

    const exercises = workoutForm.exercises.map((exercise) => (
        <section key={exercise.id} className="exercise-block">
            {/* Exercise header */}
            <div className="exercise-header">
                <input
                    className="exercise-name"
                    value={exercise.exercise_name}
                    placeholder="Exercise name"
                    onChange={(e) =>
                    ChangeExerciseName(exercise.id, e.target.value)
                    }
                />

                <button
                    className="delete-btn"
                    onClick={() => {
                        setConfirmExerciseId(exercise.id);
                        setConfirmExerciseName(exercise.exercise_name);
                    }}
                    >
                    <img src={deleteButtonIcon} alt="delete exercise" />
                </button>
            </div>

            {/* Sets */}
            <div className="set-table">
                <div className="set-row header">
                    <span>SET</span>
                    <span>PREVIOUS</span>
                    <span>LBS</span>
                    <span>REPS</span>
                    <span></span>
                </div>

                {exercise.sets.map((set, index) => {
                    const prevSet = index > 0 ? exercise.sets[index - 1] : null;

                    const prevWeight = prevSet?.weight || "";
                    const prevReps = prevSet?.reps || "";

                    return (
                        <div key={set.id} className={`set-row ${set.completed ? "checked" : ""} ${set.deleting ? "deleting" : ""}`}>
                            <span className="set-index">{index + 1}</span>

                            <span className="previous">
                                {ShowPreviousSets(exercise.exercise_name, index)}
                            </span>

                            <input
                                type="number"
                                value={set.weight || ""}
                                placeholder={prevWeight ? String(prevWeight) : "—"}
                                onChange={(e) =>
                                ChangeSetValues(
                                    exercise.id,
                                    set.id,
                                    "weight",
                                    +e.target.value
                                )}
                            />

                            <input
                                type="number"
                                value={set.reps || ""}
                                placeholder={prevReps ? String(prevReps) : "—"}
                                onChange={(e) =>
                                ChangeSetValues(
                                    exercise.id,
                                    set.id,
                                    "reps",
                                    +e.target.value
                                )}
                            />

                            <button
                                className={`check-btn ${set.completed ? "checked" : ""}`}
                                onClick={() => ToggleSetCompleted(exercise.id, set.id)}
                                >
                                <img src={checkIcon} alt="complete set" />
                            </button>
                            <button
                                className={`set-delete-btn ${set.deleting ? "deleted" : ""}`}
                                onClick={() => DeleteSet(exercise.id, set.id)}
                                >
                                &#10006;
                            </button>
                        </div>
                    );
                })}
            </div>

            <button
                className="add-set-btn"
                onClick={() => AddNewSet(exercise.id)}
                >
                + ADD SET
            </button>
        </section>
        ));

    return (
        <div className="workout-page">
            {/* HEADER */}
            <header className="workout-header">
            <div className="workout-meta">
                <input className="workout-title-input" value={workoutForm.workout_name} placeholder={!isTemplate ? "WORKOUT" : "TEMPLATE NAME"} onChange={(e) => ChangeWorkoutValues(e.target.value)} />

                {!isTemplate && <span className="workout-date">{getDate("view")}</span>}
            </div>

            <button className="finish-btn" onClick={handleSubmit}>
                FINISH
            </button>
            </header>

            {/* MAIN */}
            <main className="exercise-list">
            {exercises}

            <button className="add-exercise-btn" onClick={AddExercise}>
                + ADD EXERCISE
            </button>
            </main>

            {confirmExerciseId && (
                <div className="modal">
                    <div className="overlay" onClick={() => setConfirmExerciseId(null)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <h3>
                                Remove Exercise
                                <strong>{confirmExerciseName ? `: ${confirmExerciseName} ?` : ""}</strong>
                            </h3>
                            <div className="modal-actions">
                                <button onClick={() => setConfirmExerciseId(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="danger"
                                    onClick={() => {
                                    DeleteExercise(confirmExerciseId);
                                    setConfirmExerciseId(null);
                                    }} >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}