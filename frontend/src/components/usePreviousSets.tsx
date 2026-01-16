import { useEffect, useRef, useState } from "react"

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

export function usePreviousSets() {
    const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);

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
            
        const debouncedRequest = useRef(debounce(GetPreviousSets, 1000));
        
        const baseURL = import.meta.env.VITE_API_URL
        const url = `${baseURL}/recent/exercises`;
        const headers = {"Authorization": `Bearer ${access_token}`}
    
        useEffect(() => {
            const fetchExercises = async () => {
                try {
                    const response = await fetch(url, {headers: headers})
    
                    if (!response.ok) {
                        setWorkoutExercises([]);
                        return;
                    }
    
                    const result = await response.json();
                    setWorkoutExercises(result);
                }
                catch (error) {
                    alert(error);
                }
            }
            fetchExercises();
        }, []);

    async function GetPreviousSets(targetExName: string, allExercises: Exercise[]) {
        // console.log(targetExName, workoutExercises);
        const exerciseInWorkout = allExercises.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());
        // console.log(exerciseInWorkout);
        if (exerciseInWorkout) {
            return;
        }

        if (!targetExName) return;

        const headers = {"Authorization": `Bearer ${access_token}`}

        const baseURL = import.meta.env.VITE_API_URL;

        const url = `${baseURL}/exercises/${targetExName}`;
        try {
            const response = await fetch(url, {headers: headers});

            if (!response.ok) {
                return; 
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

    function ShowPreviousSets(targetExName: string, setIndex: number) {

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

    return { workoutExercises, debouncedRequest, ShowPreviousSets}
}