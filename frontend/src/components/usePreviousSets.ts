import { useEffect, useRef, useState } from "react"

import { authenticatedFetch } from "../api/apiClient"

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
    rest_time: number,
    sets: Set[]
}

export function usePreviousSets() {
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
            
        const debouncedRequest = useRef(debounce(GetPreviousSets, 1000));
    
        useEffect(() => {
            const fetchExercises = async () => {
                try {
                    const response = await authenticatedFetch("/exercises/recent", "GET");
                    
                    if (!response.ok) {
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

    async function GetPreviousSets(targetExName: string) {
        // const exerciseInWorkout = allExercises.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());

        // if (exerciseInWorkout) {
        //     return;
        // }

        // if (!targetExName) return;

        try {
            console.log("Called");
            const response = await authenticatedFetch(`/exercises/${targetExName}`, "GET");

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
        console.log(targetExName, workoutExercises);
        const originalExercise = workoutExercises.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());
        
        if (!originalExercise) {
            return;
        }
        
        const previousOriginalSet = originalExercise.sets.at(setIndex);
        if (!previousOriginalSet || previousOriginalSet.reps === 0) {
            return;
        }
        return [previousOriginalSet.weight, previousOriginalSet.reps]
    }

    return { workoutExercises, debouncedRequest, GetPreviousSets, ShowPreviousSets}
}