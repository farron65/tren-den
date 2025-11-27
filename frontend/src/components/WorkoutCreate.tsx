import { useState } from "react";

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
    id: string
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export default function CreateWorkout() {

    const [workout, setWorkout] = useState<Workout>({
        id: crypto.randomUUID(),
        workout_name: "",
        date: "",
        exercises: []
    });

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
            <div>
                <label>Exercise Name</label>
                <input type="text" onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)} key={exercise.id} />
                
                <button onClick={() => AddNewSet(exercise.id)}>Add Set</button>
                {exercise.sets.map((set) => 
                    <div key={set.id}>
                        <label>Weight</label>
                        <input type="number" onChange={(e) => ChangeSetValues(exercise.id, set.id, "weight", parseFloat(e.target.value))} value={set.weight}/>
                        <label>Reps</label>
                        <input type="number" onChange={(e) => ChangeSetValues(exercise.id, set.id, "reps", parseInt(e.target.value))} value={set.reps}/>
                    </div>
                )}
            </div>
        )
    })

    return (
        <>
        <div>
            <input type="text" value={workout.workout_name}/>
        </div>
        <div>
            <input type="text" key={workout.id} value={workout.date}/>
        </div>
        <div>
            <button onClick={AddExercise}>Add Exercise</button>
        </div>
        <div>
            <ol>
                {exercises}
            </ol>
        </div>
        </>
    )

}