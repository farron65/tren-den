import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { authenticatedFetch } from "../api/apiClient";

import "./workoutform.css";

import deleteButtonIcon from "../assets/delete.png";
import checkIcon from "../assets/check.png";
import { useWorkout } from "./useWorkout";
import { usePreviousSets } from "./usePreviousSets";

interface Set {
    id: string
    weight: number,
    reps: number,
    completed: boolean,
    deleting?: boolean,
    restTime: number
}

interface Exercise {
    id: string,
    exercise_name: string,
    sets: Set[]
}

interface WorkoutProps {
    isTemplate: boolean
}

export default function WorkoutForm({isTemplate}: WorkoutProps) {

    const { workoutForm, requestsInFlight, setWorkoutForm, ChangeWorkoutValues, AddExercise, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet, stopAllOtherRestTimers, sleep, countdown, resetRestTime } = useWorkout({
        workout_name: "",
        date: "",
        exercises: []
    })

    const { workoutExercises, debouncedRequest, ShowPreviousSets} = usePreviousSets();
    
    const [confirmExerciseId, setConfirmExerciseId] = useState<string | null>(null);
    const [confirmExerciseName, setConfirmExerciseName] = useState("");

    // const requestsInFlight = useRef<Record<string, boolean>>({});

    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();
        
        const workout_name = workoutForm.workout_name ? workoutForm.workout_name : getHH();

        const validData = workoutForm.exercises.every(isValidData);
        if (!validData) {
            alert("All fields must be filled");
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

                const response = await authenticatedFetch("/templates", "POST", templateToSend);
                
                if (!response.ok) {
                    if (response.status === 409) {
                        alert("Template with this kind of name already exists.");
                        return;
                    }
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                alert("Successfully created a new template");
    
                return (
                    navigate(`/templates/${result.id}`)
                );
            }
            else {
                const response = await authenticatedFetch("/workouts", "POST", dataToSend);

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
                    const PreviousWorkoutSetValues = ShowPreviousSets(exercise.exercise_name, index);
                    const PreviousWorkoutSetWeight = PreviousWorkoutSetValues?.[0];
                    const PreviousWorkoutSetReps = PreviousWorkoutSetValues?.[1];

                    const prevSet = index > 0 ? exercise.sets[index - 1] : null;

                    const prevWeight = prevSet?.weight;
                    const prevReps = prevSet?.reps;

                    const setRestTime = set.restTime;
                    const setRestMinutes = Math.floor((setRestTime / (1000 * 60)) % 60);
                    const setRestSeconds = Math.floor(setRestTime / 1000) % 60;

                    const TOTAL_REST_TIME = 180000;
                    const restProgress = Math.max(0, (setRestTime / TOTAL_REST_TIME) * 100); // for css

                    return (
                        <div key={set.id} className={`set-row-wrapper ${set.deleting ? "deleting" : ""}`}>
                            <div className={`set-row-content ${set.completed ? "checked" : ""}`}>

                                <span className="set-index">{index + 1}</span>

                                {PreviousWorkoutSetReps && 
                                    <span className="previous">
                                        <label>{PreviousWorkoutSetWeight} lbs x {PreviousWorkoutSetReps}</label>
                                    </span>
                                }

                                {!PreviousWorkoutSetReps &&
                                    <span className="previous">
                                        <label> — </label>
                                    </span>
                                }

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

                                {!isTemplate && <button
                                    className={`check-btn ${set.completed ? "checked" : ""}`}
                                    onClick={() => {
                                        ToggleSetCompleted(exercise.id, set.id, prevWeight, prevReps, PreviousWorkoutSetWeight, PreviousWorkoutSetReps);
                                        if (!set.completed) {
                                            countdown(exercise.id, set.id);
                                        }
                                        else {
                                            if (requestsInFlight.current[set.id]) {
                                                requestsInFlight.current[set.id] = false;
                                                resetRestTime(exercise.id, set.id);
                                            }
                                        }
                                    }}
                                    >
                                    <img src={checkIcon} alt="complete set" />
                                </button>}
                                <button
                                    className={`set-delete-btn ${set.deleting ? "deleted" : ""}`}
                                    onClick={() => DeleteSet(exercise.id, set.id)}
                                    >
                                    &#10006;
                                </button>
                            </div>

                            <div className="rest-timer-bar">
                                <div className="rest-progress" style={{ width: `${restProgress}%`}}>
                                </div>
                                {setRestTime > 0 && (
                                    <span className="rest-time">
                                        {setRestMinutes}:{String(setRestSeconds).padStart(2, "0")}
                                    </span>
                                )}
                            </div>
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
        <div className="page workout-page">
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