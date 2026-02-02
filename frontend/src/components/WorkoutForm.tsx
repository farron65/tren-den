import { useState } from "react";
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
    restTime: number,
    completed: boolean,
    deleting?: boolean
}

interface Exercise {
    id: string,
    exercise_name: string,
    rest_time: number,
    sets: Set[]
}

interface WorkoutProps {
    isTemplate: boolean
}

export default function WorkoutForm({isTemplate}: WorkoutProps) {

    const { workoutForm, inputRestTime, requestsInFlight, updatedSetRestTimes, setWorkoutForm, setRestTime, ChangeWorkoutValues, AddExercise, GetExerciseRestTime, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet, countdown, resetRestTime, updateSetTime } = useWorkout({
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
                rest_time: 180,
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
        const updatedExerciseName = workoutForm.exercises.map((exercise) => exercise.id == id ? {...exercise, exercise_name: newExerciseName, restTime: GetExerciseRestTime(newExerciseName)} : exercise);
        setWorkoutForm({...workoutForm, exercises: updatedExerciseName});

        debouncedRequest.current(newExerciseName, workoutExercises);
    }

    function getSetRestTime(setRestTime: number) {
        const setRestMinutes = Math.floor((setRestTime/ (1000 * 60)) % 60);
        const setRestSeconds = Math.floor(setRestTime/ 1000) % 60;
        return `${setRestMinutes}:${String(setRestSeconds).padStart(2, "0")}`
    }

    // Handles manual rest time edits for a SINGLE set.
    // Only updates state, it doesn't start/stop timers
    function updateInputSetTime(targetExerciseID: string, targetSetID: string, inputRestTime: string, completed?: boolean) {
        // Only commit once user has entered enough digits: e.g 245 -> 2:45

        if (completed) return;
        let newRestTime;
        if (inputRestTime.includes(":")) {
            inputRestTime = inputRestTime.split(":").join("");
        }
        setRestTime({setID: targetSetID, time: inputRestTime })
        if (inputRestTime.length > 2 && inputRestTime.length < 4) {
            newRestTime = parseInt(inputRestTime.charAt(0)) * 60000;
            newRestTime += parseInt(inputRestTime.slice(1).padStart(2, "0")) * 1000

            setRestTime({setID: "", time: ""});
            updateSetTime(targetExerciseID, targetSetID, newRestTime);
        }
    }

    function FocusInput(targetSetID: string, completed: boolean) {
        if (!completed) {
            setRestTime({setID: targetSetID, time: ""});
        }
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

                    let TOTAL_REST_TIME = updatedSetRestTimes.current[set.id];
                    if (!TOTAL_REST_TIME) {
                        TOTAL_REST_TIME = exercise.rest_time * 1000 // to turn s to ms;
                    }

                    const restProgress = Math.max(0, ((set.restTime / TOTAL_REST_TIME) * 100)); // for css
          
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
                                    </button>
                                }
                                <button
                                    className={`set-delete-btn ${set.deleting ? "deleted" : ""}`}
                                    onClick={() => DeleteSet(exercise.id, set.id)}
                                    >
                                    &#10006;
                                </button>
                            </div>
                            
                            {!isTemplate &&
                                <div className="rest-timer-bar">
                                    <div className="rest-progress" style={{ width: `${restProgress}%`}}>
                                    </div>
                                    <input className="rest-time" 
                                        onChange={(e) => updateInputSetTime(exercise.id, set.id, e.target.value, set.completed)}
                                        onFocus={() => FocusInput(set.id, set.completed)}
                                        placeholder={getSetRestTime(set.restTime)}
                                        value={inputRestTime.setID === set.id ? inputRestTime.time : getSetRestTime(set.restTime)}
                                    />
                                    
                                </div>
                            }
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