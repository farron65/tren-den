import { useState } from "react"

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

export function useWorkout(initialWorkout: Workout) {
    const [workout, setWorkout] = useState<Workout>(initialWorkout);
    
    function ChangeWorkoutValues(newWorkoutName: string) {
        const updatedWorkout = {...workout, workoutName: newWorkoutName}
        setWorkout(updatedWorkout);
    }

    function AddExercise() {
        const newExercise = [...workout.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}]
        setWorkout({...workout, exercises: newExercise})
    }
    
    function DeleteExercise(exerciseId: string) {
        const updatedExercise = {...workout, exercises: workout.exercises.filter((exercise) => exercise.id != exerciseId)}
        setWorkout(updatedExercise);
    }

    function AddNewSet(id: string) {
        const newSet = workout.exercises.map((exercise) => exercise.id == id
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0}]}
            : exercise
        )
        setWorkout({...workout, exercises: newSet});
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

    return { workout, setWorkout, ChangeWorkoutValues, AddExercise, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet}
}