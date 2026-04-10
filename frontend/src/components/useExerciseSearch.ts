
import { useRef, useState } from "react";
import { authenticatedFetch } from "../api/apiClient"

interface SearchedExercises {
    [key: string]: string
}

export function useExerciseSearch() {
    const [searchedExercise, setSearchedExercise] = useState<SearchedExercises>({});

    const debounce = <T extends unknown[]> (
        callback: (...args: T) => void,
        delay: number,
    ) => {
        let timeoutTimer: ReturnType<typeof setTimeout>;

        return {
            run: (...args: T) => {
            clearTimeout(timeoutTimer);
            timeoutTimer = setTimeout(() => {
                callback(...args);
            }, delay)},

            cancel: () => {
                clearTimeout(timeoutTimer);
            }
        }
    };
    
    const debouncedExerciseSearch = useRef(debounce(SearchExercises, 1000));

    async function SearchExercises(targetExName: string) {
        if (targetExName === "") return;
        try {
            const response = await authenticatedFetch(`/exercises/?exercise_name=${targetExName}`, "GET");
    
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
    
            const result = await response.json();
            setSearchedExercise(result);

        }
        catch (error) {
            alert(error);
        }
    }

    return {searchedExercise, debouncedExerciseSearch, setSearchedExercise}
}