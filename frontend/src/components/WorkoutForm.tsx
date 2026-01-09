import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./workoutform.css";

import deleteButtonIcon from "../assets/delete.png";
import checkIcon from "../assets/check.png";

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
    workoutName: string,
    date: string,
    exercises: Exercise[]
}

interface WorkoutProps {
    isTemplate: boolean
}

export default function WorkoutForm({isTemplate}: WorkoutProps) {

    const [workout, setWorkout] = useState<Workout>({
        workoutName: "",
        date: "",
        exercises: []
    });

    const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
    
    const [confirmExerciseId, setConfirmExerciseId] = useState<string | null>(null);
    const [confirmExerciseName, setConfirmExerciseName] = useState("");
    
    const navigate = useNavigate();
    const access_token = localStorage.getItem("access_token");
    
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
        
    const debouncedRequest = useRef(debounce(getPreviousSets, 1000));

    const url = "http://127.0.0.1:8000/recent/exercises";
    const headers = {"Authorization": `Bearer ${access_token}`}

    useEffect(() => {
        if (isTemplate) return;
        const fetchExercises = async () => {
            try {
                const response = await fetch(url, {headers: headers})

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }

                const result = await response.json();
                setWorkoutExercises(result);
                console.log(result);
            }
            catch (error) {
                alert(error);
            }
        }
        fetchExercises();
    }, [])

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();
        
        const workoutName = workout.workoutName ? workout.workoutName : getHH();

        const url = "http://127.0.0.1:8000/";

        const validData = workout.exercises.every(isValidData);
        if (!validData) {
            alert("All fields must be filled")
            return;
        }
    
        const dataToSend = {
            workout_name: workoutName,
            date: getDate("post"),
            exercises: workout.exercises.map((exercise) => ({
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

    async function getPreviousSets(targetExName: string, allExercises: Exercise[]) {
        // console.log(targetExName, workoutExercises);
        const exerciseInWorkout = allExercises.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());
        // console.log(exerciseInWorkout);
        if (exerciseInWorkout) {
            console.log("Found the exercise");
            return;
        }

        if (!targetExName) return;
        console.log("doing an API call");

        const headers = {"Authorization": `Bearer ${access_token}`}
        const url = `http://127.0.0.1:8000/exercises/${targetExName}`;
        try {
            const response = await fetch(url, {headers: headers});

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`)
            }

            const previousSetData = await response.json();

            if (previousSetData) {
                setWorkoutExercises(exercises => [...exercises, previousSetData])
                return previousSetData;
            }
        }
        catch (error) {
            alert(error);
        }
    }

    function showPreviousSet(targetExName: string, setIndex: number) {

        const originalExercise = workoutExercises.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());
        
        if (!originalExercise) {
            return <label> - </label>
        }
        
        const previousOriginalSet = originalExercise.sets.at(setIndex);
        if (!previousOriginalSet || previousOriginalSet.reps === 0) {
            return <label> - </label>
        }
        return <label>{previousOriginalSet.weight} lbs x {previousOriginalSet.reps}</label>
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

    function ToggleSetCompleted(exerciseId: string, setId: string) {
        setWorkout({
            ...workout,
            exercises: workout.exercises.map(ex =>
            ex.id === exerciseId
                ? {
                    ...ex,
                    sets: ex.sets.map(s =>
                    s.id === setId
                        ? { ...s, completed: !s.completed }
                        : s
                    )
                }
                : ex
            )
        });
    }

    function ChangeWorkoutValues(newWorkoutName: string) {
        const updatedWorkout = {...workout, workoutName: newWorkoutName}
        setWorkout(updatedWorkout);
    }

    function DeleteSet(exerciseID: string, setID: string) {

        // Before deleting the set, change it's class to 'deleting'
        setWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map(ex => 
                ex.id === exerciseID
                    ? {
                        ...ex, sets: ex.sets.map(set => 
                            set.id === setID ? {...set, deleting: true} : set
                        )
                    }
                    : ex
                )   
            })
        )

        // Delete set with a delay
        setTimeout(() => {
            setWorkout(prev => ({
                ...prev, exercises: prev.exercises.map(ex => 
                    ex.id === exerciseID
                        ? {
                            ...ex, sets: ex.sets.filter(set => set.id !== setID)
                        }
                        : ex
                )
            }))
        }, 220);
    }
    
    function ChangeSetValues(exerciseId: string, setId: string, field: "weight" | "reps", value: number) {
        const newSetValue = isNaN(value) ? 0 : value;
        const updatedSet = workout.exercises.map((exercise) => exercise.id == exerciseId
            ? {...exercise, sets: exercise.sets.map((set) => set.id == setId
                ? {...set, [field]: newSetValue}
                : set)}
            : exercise
        )
        setWorkout({...workout, exercises: updatedSet})
    }

    function AddNewSet(id: string) {
        const newSet = workout.exercises.map((exercise) => exercise.id == id
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0}]}
            : exercise
        )
        setWorkout({...workout, exercises: newSet});
    }

    function DeleteExercise(exerciseId: string) {
        const updatedExercise = {...workout, exercises: workout.exercises.filter((exercise) => exercise.id != exerciseId)}
        setWorkout(updatedExercise);
    }
    
    function ChangeExerciseName(id: string, newExerciseName: string) {
        const updatedExerciseName = workout.exercises.map((exercise) => exercise.id == id ? {...exercise, exercise_name: newExerciseName} : exercise);
        setWorkout({...workout, exercises: updatedExerciseName});

        debouncedRequest.current(newExerciseName, workoutExercises);
    }

    function AddExercise() {
        const newExercise = [...workout.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}]
        setWorkout({...workout, exercises: newExercise})
    }

    const exercises = workout.exercises.map((exercise) => (
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
                                {!isTemplate &&
                                showPreviousSet(exercise.exercise_name, index)}
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
                                className={`set-delete-btn ${set.completed ? "deleted" : ""}`}
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
                <input className="workout-title-input" value={workout.workoutName} placeholder={!isTemplate ? "WORKOUT" : "TEMPLATE NAME"} onChange={(e) => ChangeWorkoutValues(e.target.value)} />

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
                            }}
                        >
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