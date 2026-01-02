import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Set {
    id: string
    weight: number,
    reps: number,
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

    const navigate = useNavigate();
    const access_token = localStorage.getItem("access_token");

    const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);

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

    function ChangeWorkoutValues(newWorkoutName: string) {
        const updatedWorkout = {...workout, workoutName: newWorkoutName}
        setWorkout(updatedWorkout);
    }

    function DeleteSet(exerciseId: string, setId: string) {
        const updatedSet = workout.exercises.map((exercise) => exercise.id == exerciseId
            ? {...exercise, sets: exercise.sets.filter((set) => set.id != setId)}
            : exercise
        )
        setWorkout({...workout, exercises: updatedSet})
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

    const exercises = workout.exercises.map((exercise) => {
        return (
            <div key={exercise.id}>
                <input onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)} type="text" value={exercise.exercise_name}></input>
                <button onClick={() => DeleteExercise(exercise.id)}>X</button>
                <div className="container-row">
                    <label>Set</label>
                    <label>Previous</label>
                </div>
                {exercise.sets.map((set, index) => {
                    const previousSet = index > 0 ? exercise.sets[index-1] : null;
                    const previousWeight = previousSet ? previousSet.weight : 0;
                    const previousReps = previousSet ? previousSet.reps : 0;
                    return (
                        <div key={set.id} className="container">
                            <div className="container-row">
                                {!isTemplate && showPreviousSet(exercise.exercise_name, index)}
                            </div>
                            <div key={set.id} className="container">
                                <label>lbs</label>
                                <input onChange={(e) => ChangeSetValues(exercise.id, set.id, "weight", parseFloat(e.target.value))} type="number" value={set.weight === 0 && set.reps === 0 ? "" : set.weight} placeholder={`${previousWeight}`}/>
                                <label>Reps</label>
                                <input onChange={(e) => ChangeSetValues(exercise.id, set.id, "reps", parseInt(e.target.value))} type="number" value={set.reps === 0 ? "" : set.reps} placeholder={`${previousReps}`}/>
                                <button onClick={() => DeleteSet(exercise.id, set.id)}>X</button>
                            </div>
                        </div>
                    )
                })}
                <button onClick={() => AddNewSet(exercise.id)}>Add Set</button>
            </div>
        )
    })

    return (
        <>
        <div>
            <input onChange={(e) => ChangeWorkoutValues(e.target.value)} type="text" value={workout.workoutName}/>
            <button onClick={(e) => handleSubmit(e)}>Submit</button>  
            {!isTemplate && <button onClick={() => navigate("/workouts")}>Cancel Workout</button>}
            <div>
                {!isTemplate && getDate("view")}
            </div>
            <ol>
                {exercises}
            </ol>
            <button onClick={AddExercise}>Add Exercise</button>  
        </div>
        </>
    )

}