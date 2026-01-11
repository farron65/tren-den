import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./workoutform.css";
import deleteButtonIcon from "../assets/delete.png";
import checkIcon from "../assets/check.png";

import { useWorkout } from "./useWorkout";
import { usePreviousSets } from "./usePreviousSets";

interface Set {
    id: string
    weight: number,
    reps: number,
    completed?: boolean
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

export default function EditWorkoutForm({isTemplate}: WorkoutProps) {
    
    const { workoutForm, setWorkoutForm, AddExercise, AddNewSet, ChangeWorkoutValues, ChangeSetValues, DeleteExercise, DeleteSet, ToggleSetCompleted } = useWorkout({
        workout_name: "",
        date: "",
        exercises: []
    })

    const { workoutExercises, debouncedRequest, ShowPreviousSets } = usePreviousSets();

    const [confirmExerciseId, setConfirmExerciseId] = useState<string | null>(null);
    const [confirmExerciseName, setConfirmExerciseName] = useState("");
    

    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    const access_token = localStorage.getItem("access_token");
    const headers = {"Authorization": `Bearer ${access_token}`}

    const formID = useParams();

    const url = `http://127.0.0.1:8000/`;

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                let response;
                if (isTemplate) {
                    console.log(url);
                    response = await fetch(`${url}templates/${formID.id}`, {headers: headers});
                }

                else {
                    response = await fetch(`${url}workouts/${formID.id}`, {headers: headers})
                }

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                setWorkoutForm(result);
            }
            catch (error) {
                alert(error);
            }
            finally {
                setLoading(false);
            }
        }
            fetchTemplate();
            console.log("I worked")
            
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        console.log(workoutForm.workout_name, workoutForm.date);
        const dataToSend = {
            workout_name: workoutForm.workout_name,
            date: workoutForm.date,
            exercises: workoutForm.exercises.map((exercise) => ({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight,
                    reps: set.reps
                }))
            }))
        }

        try {
            let response;
            if (isTemplate) {
                const {date, ...templateUpdateData} = dataToSend
                response = await fetch(`${url}templates/${formID.id}`, getRequestOptions(templateUpdateData));
            }

            else {
                response = await fetch(`${url}workouts/${formID.id}`, getRequestOptions(dataToSend));
            }

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const result = await response.json();
            console.log(result);
            if (isTemplate) {
                alert("Successfully saved template changes");

                return (
                    navigate(`/templates/${result.id}`)
                )
            }
            else {
                alert("Successfully saved workout changes");

                return (
                    navigate(`/workouts/${result.id}`)
                )
            }
        }
        catch (error) {
            alert(error);
        }
    }

    function getRequestOptions(data: object) {
        const requestOptions = {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        }
        return requestOptions
    }

    function getUserDate(workoutDate: string) {
        const userDate = new Date(workoutDate);

        const year = userDate.getFullYear();
        const month = String(userDate.getMonth() + 1).padStart(2, "0");
        const day = String(userDate.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function ChangeExerciseName(targetExID: string, newExerciseName: string) {
        const updatedExercise = workoutForm.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, exercise_name: newExerciseName}
            : exercise
        );
        setWorkoutForm({...workoutForm, exercises: updatedExercise});
        debouncedRequest.current(newExerciseName, workoutExercises)
    }

    function ChangeFormDate(newDate: string) {
        setWorkoutForm({...workoutForm, date: newDate})
    }

    if (loading)  {
        return <h1>Loading</h1>
    }

    const exercises = workoutForm.exercises.map((exercise) => (
        <section key={exercise.id} className="exercise-block">
                {/* Exercise header*/}
                <div className="exercise-header">
                    <input type="text" className="exercise-name"
                        value={exercise.exercise_name} placeholder="Exercise Name"
                        onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)}
                    />

                    <button className="delete-btn" onClick={() => {
                        setConfirmExerciseId(exercise.id)
                        setConfirmExerciseName(exercise.exercise_name)
                    }}>
                        <img src={deleteButtonIcon} alt="delete exercise" />
                    </button>
                </div>

                {/* Sets */}
                <div className="set-table">
                    <div className="set-row header">
                        <span>Set</span>
                        <span>Previous</span>
                        <span>LBS</span>
                        <span>Reps</span>
                        <span></span>
                    </div>

                    {exercise.sets.map((set, index) => {
                        const prevSet = index > 0 ? exercise.sets[index-1] : null;
                        
                        const prevWeight = prevSet?.weight || "";
                        const prevReps = prevSet?.reps || "";

                        return (
                            <div key={set.id} className={`set-row ${set.deleting ? "deleting" : ""}  ${set.completed ? "checked" : ""}`}>
                                <span className="set-index">{index + 1}</span>
                                
                                <span className="previous">
                                    {ShowPreviousSets(exercise.exercise_name, index)}
                                </span>

                                <input type="number"
                                    value={set.weight || ""} placeholder={prevWeight ? String(prevWeight) : "—"}
                                    onChange={(e) => ChangeSetValues(exercise.id, set.id, "weight", +e.target.value)}
                                />
                                <input type="number"
                                    value={set.reps || ""} placeholder={prevReps ? String(prevReps) : "—"}
                                    onChange={(e) => ChangeSetValues(exercise.id, set.id, "reps", +e.target.value)}
                                />
                                {!isTemplate && 
                                    <button
                                        className={`check-btn ${set.completed ? "" : "checked"}`}
                                        onClick={() => ToggleSetCompleted(exercise.id, set.id)}
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
                        )
                    })}
                </div>
            <button className="add-set-btn" onClick={() => AddNewSet(exercise.id)}>
                + ADD SET
            </button>
        </section>
        )
    );

    return (

        <div className="workout-page">
            {/* HEADER */}
            <header className="workout-header">
                <div className="workout-meta">
                    <input type="text" className="workout-title-input"
                        value={workoutForm.workout_name} placeholder={!isTemplate ? "WORKOUT" : "TEMPLATE NAME"}
                        onChange={(e) => ChangeWorkoutValues(e.target.value)}
                    />
                    {!isTemplate && 
                        <input type="date" className="workout-date" onChange={(e) => ChangeFormDate(e.target.value)}
                        value={getUserDate(workoutForm.date)}
                    />    
                    }
                </div>

                <button className="finish-btn" onClick={handleSave}>
                    Update
                </button>

                {!isTemplate &&
                    <button className="cancel-btn" onClick={() => navigate("/workouts")}>Cancel</button>  
                }
                {isTemplate &&
                    <button className="cancel-btn" onClick={() => navigate("/templates")}>Cancel</button>  
                }
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
                                    }} >x   x
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}