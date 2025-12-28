import { useState } from "react";
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

export default function CreateWorkout() {

    const [workout, setWorkout] = useState<Workout>({
        workoutName: "",
        date: "",
        exercises: []
    });
    const navigate = useNavigate();
    const access_token = localStorage.getItem("access_token");

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();
        
        const workoutName = workout.workoutName ? workout.workoutName : getHH();

        const url = "http://127.0.0.1:8000/workouts";
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
        console.log(JSON.stringify(dataToSend));

        const requestOptions = {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
                },
            body: JSON.stringify(dataToSend)
        }

        try {
            console.log(url, requestOptions);
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            const result = await response.json();
            alert("Successfully created new workout");

            return (
                navigate(`/workouts/${result.id}`)
            );
        }
        catch (error) {
            alert(error);
        }
    }

    function getDate(dateType: string) {
        const today = new Date();
        const month = today.toLocaleString("default", {month: "short"});
        const day = today.getDate();
        const year = today.getFullYear();

        return  dateType === "view" ? `${month} ${day}, ${year}` : `${year}-${today.getMonth()+1}-${day} ${today.toLocaleTimeString("it-IT")}`; 
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
        const newSetValue = isNaN(value) ? "" : value;
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
    }

    function AddExercise() {
        const newExercise = [...workout.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}]
        setWorkout({...workout, exercises: newExercise})
    }

    function getHH() {
        const today = new Date()
        return today.getHours() < 12 ? "Morning Workout" : today.getHours() < 18 ? "Afternoon Workout" : "Evening workout";
    }
    
    const exercises = workout.exercises.map((exercise) => {
        return (
            <div key={exercise.id}>
                <label>Exercise Name</label>
                <input type="text" onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)} key={exercise.id} />
                
                <button onClick={() => AddNewSet(exercise.id)}>Add Set</button>
                <button onClick={() => DeleteExercise(exercise.id)}>X</button>
                {exercise.sets.map((set) => 
                    <div key={set.id}>
                        <label>Weight</label>
                        <input type="number" onChange={(e) => ChangeSetValues(exercise.id, set.id, "weight", parseFloat(e.target.value))} value={set.weight}/>
                        <label>Reps</label>
                        <input type="number" onChange={(e) => ChangeSetValues(exercise.id, set.id, "reps", parseInt(e.target.value))} value={set.reps}/>
                        <button onClick={() => DeleteSet(exercise.id, set.id)}>X</button>
                    </div>
                )}
            </div>
        )
    })

    return (
        <>
        <div>
            <input onChange={(e) => ChangeWorkoutValues(e.target.value)} type="text" value={workout.workoutName}/>
            <button onClick={(e) => handleSubmit(e)}>Submit</button>  
            <div>
                {getDate("view")}
            </div>
            <ol>
                {exercises}
            </ol>
            <button onClick={AddExercise}>Add Exercise</button>  
        </div>
        </>
    )

}