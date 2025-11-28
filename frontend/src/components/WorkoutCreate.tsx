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
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export default function CreateWorkout() {

    const [workout, setWorkout] = useState<Workout>({
        workout_name: "",
        date: "",
        exercises: []
    });
    const navigate = useNavigate();
    const access_token = localStorage.getItem("access_token");

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault();

        const url = "http://127.0.0.1:8000/workouts";
        const dataToSend = {
            workout_name: workout.workout_name,
            date: workout.date,
            exercises: workout.exercises.map((exercise) => ({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight, 
                    reps: set.reps
                }))
            }))
        }

        const requestOptions = {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
                },
            body: JSON.stringify(dataToSend)
        }

        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            const result = await response.json();
            alert("Successfully created new workout");
            console.log(result);

            return (
                navigate(`/workouts/${result.id}`)
            );
        }
        catch (error) {
            alert(error);
        }
    }

    function ChangeWorkoutValues(field: "workout_name" | "date", value: string) {
        const updatedWorkout = {...workout, [field]: value}
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
    
    const exercises = workout.exercises.map((exercise) => {
        return (
            <div key={exercise.id}>
                <label>Exercise Name</label>
                <input type="text" onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)} key={exercise.id} />
                
                <button onClick={() => AddNewSet(exercise.id)}>Add Set</button>
                <button onClick={() => DeleteExercise(exercise.id)}>Delete Exercise</button>
                {exercise.sets.map((set) => 
                    <div key={set.id}>
                        <label>Weight</label>
                        <input type="number" onChange={(e) => ChangeSetValues(exercise.id, set.id, "weight", parseFloat(e.target.value))} value={set.weight}/>
                        <label>Reps</label>
                        <input type="number" onChange={(e) => ChangeSetValues(exercise.id, set.id, "reps", parseInt(e.target.value))} value={set.reps}/>
                        <button onClick={() => DeleteSet(exercise.id, set.id)}>Delete</button>
                    </div>
                )}
            </div>
        )
    })

    return (
        <>
        <div>
            <input onChange={(e) => ChangeWorkoutValues("workout_name", e.target.value)} type="text" value={workout.workout_name}/>
        </div>
        <div>
            <input onChange={(e) => ChangeWorkoutValues("date", e.target.value)} type="text" value={workout.date}/>
        </div>
        <div>
            <button onClick={AddExercise}>Add Exercise</button>
        </div>
        <div>
            <ol>
                {exercises}
            </ol>
        </div>
        <button onClick={(e) => handleSubmit(e)}>Submit</button>
        </>
    )

}