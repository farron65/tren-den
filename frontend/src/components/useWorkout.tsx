import { useRef, useState } from "react"

interface Set {
    id: string
    weight: number,
    reps: number,

    completed: boolean,
    deleting?: boolean,

    rest_time: number,
    original_rest_time: number,
    isRunning: boolean 
}

interface Exercise {
    id: string,
    exercise_name: string,
    rest_time: number
    sets: Set[]
}

interface Workout {
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export function useWorkout(initialWorkout: Workout) {
    const [workoutForm, setWorkoutForm] = useState<Workout>(initialWorkout);

    const [inputRestTime, setRestTime] = useState({
        setID: "",
        time: "",
    });

    const intervalID = useRef<number | null>(null);
    
    function ChangeWorkoutValues(newWorkout_name: string) {
        const updatedWorkout = {...workoutForm, workout_name: newWorkout_name}
        setWorkoutForm(updatedWorkout);
    }

    function AddExercise() {
        const newExercise = [...workoutForm.exercises, {id: crypto.randomUUID(), exercise_name: "", rest_time: 180, sets: []}]
        setWorkoutForm({...workoutForm, exercises: newExercise})
    }
    
    function DeleteExercise(exerciseId: string) {
        const updatedExercise = {...workoutForm, exercises: workoutForm.exercises.filter((exercise) => exercise.id != exerciseId)}
        setWorkoutForm(updatedExercise);
    }

    function AddNewSet(id: string) {
        const newSet = workoutForm.exercises.map((exercise) => exercise.id == id
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0, completed: false, rest_time: exercise.rest_time * 1000, original_rest_time: exercise.rest_time * 1000, isRunning: false}]}
            : exercise
        )
        setWorkoutForm({...workoutForm, exercises: newSet});
    }

    function GetExerciseRestTime(targetExName: string) {
        const restTime = workoutForm.exercises.find(exercise => exercise.exercise_name.toLowerCase() === targetExName)?.rest_time
        if (!restTime) return 180;
        return restTime;
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
        function ToggleSetCompleted(exerciseId: string, setId: string, prevWeight?: number, prevReps?: number, prevWorkoutWeight?: number, prevWorkoutReps?: number) {

        setWorkoutForm({
            ...workoutForm,
            exercises: workoutForm.exercises.map(ex =>
            ex.id === exerciseId
                ? {
                    ...ex,
                    sets: ex.sets.map(s =>
                    s.id === setId
                        ? { ...s, completed: !s.completed,
                                weight: !s.weight ? prevWeight || prevWorkoutWeight || s.weight : s.weight,
                                reps: !s.reps ? prevReps || prevWorkoutReps || s.reps : s.reps
                            }
                        : s
                    )
                }
                : ex
            )
        });
    }

    function stopAllOtherRestTimers(targetSetID: string) {

        setWorkoutForm((prevState) => ({
            ...prevState, 
            exercises: prevState.exercises.map((exercise) => (
                {...exercise, sets: exercise.sets.map((set) => {
                if (set.id === targetSetID) {
                    return {...set, isRunning: true};
                }
                else {
                    return {...set, rest_time: set.original_rest_time, isRunning: false};
                    }
                })}
            ))
        }))
    }

    // Starts or stops a rest timer for a specific set
    // Saves the set's original rest time in ref before countdown
    async function countdown(exerciseTargetID: string, targetSetID: string) {
        
        if(intervalID.current) {
            clearInterval(intervalID.current);
            intervalID.current = null;
        }
        stopAllOtherRestTimers(targetSetID);

        intervalID.current = setInterval(() => setWorkoutForm((prev) => 
            ({...prev, exercises: prev.exercises.map((exercise) => exercise.id === exerciseTargetID
                ? {...exercise, sets: exercise.sets.map((set) => {
                    if (set.id === targetSetID) {
                        if (set.rest_time >= 1000) {
                            return {...set, rest_time: set.rest_time - 1000};
                        }
                        clearInterval(intervalID.current!)
                        intervalID.current = null;
                        return {...set, rest_time: set.original_rest_time, isRunning: false}
                    }
                    else {
                        return set;
                    }})
                } 
                : exercise
            )})
        ), 100);
    }

    function resetRestTime(exerciseID: string, setID: string) {

        // to stop the countdown function
        if(intervalID.current) {
            clearInterval(intervalID.current);
            intervalID.current = null;
        }

        setWorkoutForm((prevState) => ({...prevState, exercises: prevState.exercises.map((exercise) => exercise.id === exerciseID
            ? {...exercise, sets: exercise.sets.map((set) => set.id === setID 
                ? {...set, rest_time: set.original_rest_time}
                : set)}
            : exercise
        )}))
    }

    // Updates a single set rest time
    // Also updates exercise rest_time so future sets inherit it
    function updateSetTime(exerciseID: string, setID: string, newRestTime: number) {
        setWorkoutForm((prevState) => ({...prevState, exercises: prevState.exercises.map((exercise) => exercise.id === exerciseID
            ? {...exercise, rest_time: newRestTime/1000, sets: exercise.sets.map((set) => set.id === setID
                ? {...set, rest_time: newRestTime, original_rest_time: newRestTime}
                : set)}
            : exercise
        )}))
    }

    return { workoutForm, inputRestTime, setWorkoutForm, setRestTime, ChangeWorkoutValues, AddExercise, GetExerciseRestTime, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet, countdown, resetRestTime, updateSetTime}
}