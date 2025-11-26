import { useState } from "react";

interface Set {
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
        workout_name: "Bro",
        date: "11 22 33",
        exercises: []
    });

    function changeExerciseName(id: string, newExerciseName: string) {
        const updatedExerciseName = workout.exercises.map((exercise) => exercise.id == id ? {...exercise, exercise_name: newExerciseName} : exercise);
        setWorkout({...workout, exercises: updatedExerciseName});
    }

    function AddExercise() {
        const newExercise = [...workout.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}]
        setWorkout({...workout, exercises: newExercise})
    }
    
    const exercises = workout.exercises.map((exercise) => {
        return (
            <>
            <label>Exercise Name</label>
            <input type="text" onChange={(e) => changeExerciseName(exercise.id, e.target.value)} key={exercise.id} />
            </>
        )
    })

    return (
        <>
        <div>
            <input type="text" value={workout.workout_name}/>
        </div>
        <div>
            <input type="text" value={workout.date}/>
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