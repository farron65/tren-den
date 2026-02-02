import { useRef, useState } from "react"

interface Set {
    id: string
    weight: number,
    reps: number,
    completed: boolean,
    deleting?: boolean,
    restTime: number
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

    // Track which set is currently has an active rest timer.
    // Keyed by set ID to allow multiple sets to exist but only one to run.
    const requestsInFlight = useRef<Record<string, boolean>>({});

    // Stores each set's original rest time before the countdown starts.
    // Used to restore correct values one the timer ends or switches
    const updatedSetRestTimes = useRef<Record<string, number>>({});
    
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
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0, completed: false, restTime: exercise.rest_time * 1000}]}
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
                                reps: !s.reps ? prevReps || prevWorkoutReps || s.reps : s.reps}
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

    function stopAllOtherRestTimers(setID: string) {
        
        for (const key of Object.keys(requestsInFlight.current)) {
            if (key !== setID) {
                requestsInFlight.current[key] = false;
            }
        }

        // Each set restores its own rest time from ref updatedSetRestTimers
        setWorkoutForm((prevState) => ({
            ...prevState,
            exercises: prevState.exercises.map((exercise) => (
                {...exercise,
                    sets: exercise.sets.map((set) => {
                        if (set.id === setID) {
                            return set;
                        } else if (set.completed) {
                            return {...set, restTime: updatedSetRestTimes.current[set.id]};
                        } else if (requestsInFlight.current[set.id] === false) {
                            return {...set, restTime: exercise.rest_time*1000};
                        } else {
                            return set;
                        }
                    })
                }
            ))
        }))
    }

    async function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Starts or stops a rest timer for a specific set
    // Saves the set's original rest time in ref before countdown
    async function countdown(exerciseTargetID: string, setID: string) {
        
        const targetExercise: Exercise | undefined = workoutForm.exercises.find((exercise) => exercise.id === exerciseTargetID)
        if (!targetExercise) return;
        const targetSet = targetExercise.sets.find((set) => set.id === setID)
        if (!targetSet) return;
        let setRestTime = targetSet?.restTime;
        if (!setRestTime) return;
        
        if (!requestsInFlight.current[setID]) {
            // Cache the original rest time so it can be restored later
            updatedSetRestTimes.current[setID] = setRestTime; 
            stopAllOtherRestTimers(setID);
            requestsInFlight.current[setID] = true

            while (setRestTime > 0 && requestsInFlight.current[setID]) {

                await sleep(100);

                setRestTime -= 1000;
                if (!requestsInFlight.current[setID]) {
                    return;
                }
      
                setWorkoutForm((prevState) => ({...prevState, exercises: prevState.exercises.map((exercise) => 
                    exercise.id === exerciseTargetID
                    ? {...exercise, sets: exercise.sets.map((set) => set.id === setID
                        ? {...set, restTime: setRestTime!}
                        : set)}
                    : exercise
                )}))
            }

            resetRestTime(exerciseTargetID, setID);
        }

        else {
            requestsInFlight.current[setID] = false;
            resetRestTime(exerciseTargetID, setID);
            return;
        }
    }

    function resetRestTime(exerciseID: string, setID: string) {
        // Restore a set's rest time to its cached original value
        // Used when countdown ends or is manually stopped
        setWorkoutForm((prevState) => ({...prevState, exercises: prevState.exercises.map((exercise) => exercise.id === exerciseID
            ? {...exercise, sets: exercise.sets.map((set) => set.id === setID 
                ? {...set, restTime: updatedSetRestTimes.current[setID]}
                : set)}
            : exercise
        )}))
    }

    // Updates a single set rest time
    // Also updates exercise rest_time so future sets inherit it
    function updateSetTime(exerciseID: string, setID: string, newRestTime: number) {
        setWorkoutForm((prevState) => ({...prevState, exercises: prevState.exercises.map((exercise) => exercise.id === exerciseID
            ? {...exercise, rest_time: newRestTime/1000, sets: exercise.sets.map((set) => set.id === setID
                ? {...set, restTime: newRestTime}
                : set)}
            : exercise
        )}))
    }

    return { workoutForm, inputRestTime, requestsInFlight, setWorkoutForm, setRestTime, ChangeWorkoutValues, AddExercise, GetExerciseRestTime, DeleteExercise, AddNewSet, ChangeSetValues, ToggleSetCompleted, DeleteSet, countdown, resetRestTime, updateSetTime}
}