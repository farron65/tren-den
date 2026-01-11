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
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export function useWorkout(initialWorkout: Workout) {
    const [workoutForm, setWorkoutForm] = useState<Workout>(initialWorkout);
    
    function ChangeWorkoutValues(newWorkout_name: string) {
        const updatedWorkout = {...workoutForm, workout_name: newWorkout_name}
        setWorkoutForm(updatedWorkout);
    }

    function AddExercise() {
        const newExercise = [...workoutForm.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}]
        setWorkoutForm({...workoutForm, exercises: newExercise})
    }
    
    function DeleteExercise(exerciseId: string) {
        const updatedExercise = {...workoutForm, exercises: workoutForm.exercises.filter((exercise) => exercise.id != exerciseId)}
        setWorkoutForm(updatedExercise);
    }

    function AddNewSet(id: string) {
        const newSet = workoutForm.exercises.map((exercise) => exercise.id == id
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0}]}
            : exercise
        )
        setWorkoutForm({...workoutForm, exercises: newSet});
    }

    function ChangeSetValues(exerciseId: string, setId: string, field: "weight" | "reps", value: number) {
        const newSetValue = isNaN(value) ? 0 : value;
        const updatedSet = workoutForm.exercises.map((exercise) => exercise.id == exerciseId
            ? {...exercise, sets: exercise.sets.map((set) => set.id == setId
                ? {...set, [field]: newSetValue}
                : set)}
            : exercise
        )
        setWorkoutForm({...workoutForm, exercises: updatedSet})
    }

    function ToggleSetCompleted(exerciseId: string, setId: string) {
        setWorkoutForm({
            ...workoutForm,
            exercises: workoutForm.exercises.map(ex =>
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
        setWorkoutForm(prev => ({
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
            setWorkoutForm(prev => ({
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

    return { workoutForm, setWorkoutForm, ChangeWorkoutValues, AddExercise, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet}
}