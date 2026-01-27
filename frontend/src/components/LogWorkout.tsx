import { useRef, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { authenticatedFetch } from "../api/apiClient";

import "./workoutform.css";

import { useWorkout } from "./useWorkout";

import deleteButtonIcon from "../assets/delete.png";
import checkIcon from "../assets/check.png";

interface Set {
    id: string
    weight: number,
    reps: number,
    completed: boolean,
    restTime: number,
    deleting?: boolean
}

interface Exercise {
    id: string,
    exercise_name: string,
    rest_time: number,
    sets: Set[]
}

export default function LogWorkout() {

    const { workoutForm, requestsInFlight, setWorkoutForm, AddExercise, GetExerciseRestTime, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet, countdown, resetRestTime } = useWorkout({
            workout_name: "",
            date: "",
            exercises: []
    });;

    const [confirmExerciseId, setConfirmExerciseId] = useState<string | null>(null);
    const [confirmExerciseName, setConfirmExerciseName] = useState("");

    const [loading, setLoading] = useState(true);

    // Previous workout data used only to render the "Previous" column.
    // showPreviousSet uses this
    // Updating it triggers a rerender
    const [originalTemplate, setOriginalTemplate] = useState<Exercise[]>([]);

    // Snapshot of the original workout structure on the first page load
    // Never changes after initialization
    // hasTemplateChanged uses this
    const originalTemplateRef = useRef<Exercise[]>([]);
    
    const [modal, setModal] = useState(false);
    const [modalText, setModalText] = useState("");

    const toggleModal = () => {
        setModal(!modal);
    }

    const debounce = <T extends unknown[]> (
        callback: (...args: T) => void,
        delay: number,
    ) => {
        let timeoutTimer: ReturnType<typeof setTimeout>;

        return (...args: T) => {
            clearTimeout(timeoutTimer);

            timeoutTimer = setTimeout(() => {
                callback(...args);
            }, delay)
        }
    };
    
    // Debounced function created ONCE on mount
    // Because of Js closures, it would use stale values
    // Using templateRef.current ensures we always read the latest data.
    const debouncedRequest = useRef(debounce(getPreviousSets, 1000));
    
    const navigate = useNavigate();
    const templateId = useParams();


    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const response = await authenticatedFetch(`/templates/${templateId.id}`, "GET");

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                
                setWorkoutForm(result); // editable workout
                setOriginalTemplate(result.previous_workout_data); // UI "Previous" column
                // templateRef.current = result.previous_workout_data; // keep ref in sync
                originalTemplateRef.current = result.previous_workout_data; // immutable snapshot
            }
            catch (error) {
                alert(error);
            }
            finally {
                setLoading(false);
            }
        }
        fetchTemplate();
    }, []);

    async function handleSave(method: string) {

        const dataToSend = {
            workout_name: workoutForm.workout_name,
            date: getDate("post"),
            exercises: workoutForm.exercises.map((exercise: Exercise) => ({
                exercise_name: exercise.exercise_name,
                rest_time: 180,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight,
                    reps: set.reps
                }))
            }))
        }

        try {
            const saveWorkout = await authenticatedFetch(`/workouts`, "POST", dataToSend);
            if (!saveWorkout.ok) {
                throw new Error(`Response status: ${saveWorkout.status}`);
            }
            alert("You are a beast 💪🏆");

            if (method === "Save") {
                const exercises = dataToSend.exercises;

                const response = await authenticatedFetch(`/templates/${templateId.id}`, "PATCH", exercises);
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                alert("Successfully saved workout, without changing the workout template");
            }

            else if (method === "Update") {
                const { date, ...updatedWorkout} = dataToSend;
                const response = await authenticatedFetch(`/templates/${templateId.id}`, "PUT", updatedWorkout);
    
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                alert("Successfully saved workout, and updated the workout template");
            }

            navigate("/workouts");

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

    function ShowPreviousSet(targetExName: string, setIndex: number) {

        const originalExercise = originalTemplate.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());
        
        if (!originalExercise) {
            return;
        }
        const previousOriginalSet = originalExercise.sets.at(setIndex);
        if (!previousOriginalSet || (previousOriginalSet.weight === 0 && previousOriginalSet.reps === 0)) {
            return;
        }
        return [previousOriginalSet.weight, previousOriginalSet.reps];
    }

    // Uses REF because this function is called by a debounced callback
    // Avoids stale closures by reading from templateRef.current
    async function getPreviousSets(targetExName: string) {
        try {
            const response = await authenticatedFetch(`/exercises/${targetExName}`, "GET");

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`)
            }
            
            const previousSetData = await response.json();
            if (previousSetData) {
                setOriginalTemplate(setsData => [...setsData, previousSetData]); // update UI
            }
        }
        catch (error) {
            alert(error);
        }
    }

    function hasTemplateChanged(template: Exercise[], templateRef: Exercise[]) {
        let message = "";
        let exAdded = 0;
        let exRemoved = 0;
        let setsAdded = 0;
        let setsRemoved = 0;

        const validWorkout = template.every(isValidData)
        if (!validWorkout) {
            alert("All fields must be filled")
            return;
        }

        template.forEach((exercise) => {
            const refExercise = templateRef.find((refEx) => refEx.exercise_name === exercise.exercise_name);
            if (!refExercise) {
                exAdded += 1;
                setsAdded += exercise.sets.length;
            }
            else {
                if (refExercise.sets.length > exercise.sets.length) {
                    setsRemoved += refExercise.sets.length - exercise.sets.length;
                }
                else if (refExercise.sets.length < exercise.sets.length) {
                    setsAdded += exercise.sets.length - refExercise.sets.length

                }
            }
        })

        templateRef.forEach((exercise) => {
            const templateExercise = template.find((templateEx) => templateEx.exercise_name === exercise.exercise_name);
            if (!templateExercise) {
                exRemoved += 1;
                setsRemoved += exercise.sets.length;
            }
        })

        message += exAdded === 1 ? `Adds ${exAdded} exercises. `: exAdded > 1 ? `Adds ${exAdded} exercises. ` : ""; 
        message += exRemoved === 1 ? `Removes ${exRemoved} exercises. `: exRemoved > 1 ? `Removes ${exRemoved} exercises. ` : "";  
        message += setsAdded === 1 ? `Adds ${setsAdded} set. `: setsAdded > 1 ? `Adds ${setsAdded} sets. ` : "";
        message += setsRemoved === 1 ? `Removes ${setsRemoved} set. `: setsRemoved > 1 ? `Removes ${setsRemoved} sets. ` : "";
        
        if (message) {
            setModalText(message);
            toggleModal();
        }

        else {
            handleSave("Save");
        }
    }

    function isValidData(exercise: Exercise) {

        if (!exercise.exercise_name) {
            return false
        }

        const valid = exercise.sets.every((set) => {
            if (!set.reps) {
                console.log("Rep is empty");
                return false;
            }
            return true;
        })

        return valid;
    }

    function ChangeExerciseName(targetExID: string, newExerciseName: string) {
        const updatedExercise = workoutForm.exercises.map((exercise: Exercise) => exercise.id === targetExID
            ? {...exercise, exercise_name: newExerciseName, restTime: GetExerciseRestTime(newExerciseName)}
            : exercise
        );
        setWorkoutForm({...workoutForm, exercises: updatedExercise});
        debouncedRequest.current(newExerciseName);
    }

    if (loading)  {
        return <h1>Loading</h1>
    }
    else if (!workoutForm.workout_name) {
        return <h1>Template doesn't exist</h1>
    }

    const exercises = workoutForm.exercises.map((exercise: Exercise) => {
        return (
            <section key={exercise.id} className="exercise-block">
            {/* Exercise header */}
            <div className="exercise-header">
                <input
                className="exercise-name"
                onChange={(e) =>
                    ChangeExerciseName(exercise.id, e.target.value)
                }
                type="text"
                value={exercise.exercise_name}
                />

                <button
                className="delete-btn"
                onClick={() => {
                    setConfirmExerciseId(exercise.id), setConfirmExerciseName(exercise.exercise_name)
                    }}>
                    <img src={deleteButtonIcon} alt="delete exercise" />
                </button>

            </div>

            {/* Sets table */}
            <div className="set-table">
                <div className="set-row header">
                    <span>SET</span>
                    <span>PREVIOUS</span>
                    <span>LBS</span>
                    <span>REPS</span>
                    <span></span>
                </div>

                {exercise.sets.map((set, index) => {
                    const PreviousWorkoutSetValues = ShowPreviousSet(exercise.exercise_name, index);
                    const PreviousWorkoutSetWeight = PreviousWorkoutSetValues?.[0];
                    const PreviousWorkoutSetReps = PreviousWorkoutSetValues?.[1];

                    const previousSet = index > 0 ? exercise.sets[index - 1] : null;
                    const previousWeight = previousSet?.weight;
                    const previousReps = previousSet?.reps;

                    if (!set.restTime) set.restTime = 180000;

                    const setRestMinutes = Math.floor((set.restTime / (1000 * 60)) % 60);
                    const setRestSeconds = Math.floor(set.restTime / 1000) % 60;

                    
                    const TOTAL_REST_TIME = 180000;
                    const restProgress = Math.max(0, (set.restTime / TOTAL_REST_TIME) * 100); // for css

                    return (
                        <div key={set.id} className={`set-row ${set.deleting ? "deleting" : ""}`}>
                            <div className={`set-row-content ${set.completed ? "checked" : ""}`}>

                                <span className="set-index">{index + 1}</span>

                                {PreviousWorkoutSetReps &&
                                    <span className="previous">
                                        <label>{PreviousWorkoutSetWeight} lbs x {PreviousWorkoutSetReps}</label>
                                    </span>
                                }

                                {!PreviousWorkoutSetWeight && !PreviousWorkoutSetReps && 
                                    <span className="previous">
                                        <label> — </label>
                                    </span>
                                }

                                <input
                                    type="number"
                                    value={set.weight || ""}
                                    placeholder={`${previousWeight ? previousWeight : "—"}`}
                                    onChange={(e) =>
                                    ChangeSetValues(
                                        exercise.id,
                                        set.id,
                                        "weight",
                                        +e.target.value
                                    )
                                    }
                                />

                                <input
                                    type="number"
                                    value={set.reps || ""}
                                    placeholder={`${previousReps ? previousReps : "—"}`}
                                    onChange={(e) =>
                                    ChangeSetValues(
                                        exercise.id,
                                        set.id,
                                        "reps",
                                        Number(e.target.value)
                                    )
                                    }
                                />
                                <button
                                    className={`check-btn ${set.completed ? "checked" : ""}`}
                                    onClick={() => {
                                        ToggleSetCompleted(exercise.id, set.id, previousWeight, previousReps, PreviousWorkoutSetWeight, PreviousWorkoutSetReps)
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
                                <button
                                    className={`set-delete-btn ${set.completed ? "deleted" : ""}`}
                                    onClick={() => DeleteSet(exercise.id, set.id)}
                                    >
                                    &#10006;
                                </button>
                            </div>

                            <div className="rest-timer-bar">
                                <div className="rest-progress" style={{ width: `${restProgress}%`}}>
                                </div>
                                {set.restTime > 0 && (
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
        );
    });

    return (
        <div className="page workout-page">
            <header className="workout-header">
                <div className="workout-meta">
                    <input
                    className="workout-title-input"
                    value={workoutForm.workout_name}
                    readOnly
                    />
                    <span className="workout-date">{getDate("view")}</span>
                </div>

                <button
                    className="finish-btn"
                    onClick={() =>
                    hasTemplateChanged(
                        workoutForm.exercises,
                        originalTemplateRef.current
                    )
                    }
                >
                    FINISH
                </button>
            </header>

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
                                }}
                            >
                                Remove
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modal && (
                <div className="modal">
                    <div className="overlay" onClick={toggleModal}>
                        <div
                            className="modal-box"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p>
                            You've made changes from original template.
                            {modalText}
                            </p>

                            <div className="modal-actions">
                            <button onClick={() => handleSave("Save")}>
                                Save Workout Only
                            </button>
                            <button
                                className="danger"
                                onClick={() => handleSave("Update")}
                            >
                                Save Workout and Update Template
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        );
}