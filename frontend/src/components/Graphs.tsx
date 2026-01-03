import { useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

interface ChartPoint {
    date: Date,
    weight: number,
    reps: number,
    "workout_name": string
}

export default function Graphs() {

    const [exerciseData, setExercise] = useState<ChartPoint[]>([]);

    const access_token = localStorage.getItem("access_token");
    const url = "http://127.0.0.1:8000";
    const headers = {"Authorization": `Bearer ${access_token}`};

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

    async function getExerciseData(exerciseName: string) {
        if (!exerciseName) return;
        console.log(exerciseName);
        try {
            const response = await fetch(`${url}/analytics/${exerciseName}`, {headers: headers});
    
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
    
            const result = await response.json();
    
            setExercise(result);
            console.log(result);
        }
        catch (error) {
            alert(error);
        }
    }

    const debouncedRequest = useRef(debounce(getExerciseData, 1000));

    function ChangeInputValues(exerciseName: string) {
        debouncedRequest.current(exerciseName);
    }

    return (
        <div>
            <LineChart style={{ width: "100%", aspectRatio: 1.618, maxWidth: 600}} responsive data={exerciseData}>
                <CartesianGrid/>
                <Line dataKey={"weight"}/>

                <XAxis dataKey={"date"} tickFormatter={(iso) => 
                    new Date(iso).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                    })
                }/>
                <YAxis dataKey={"weight"}/>
                <Tooltip />
                <Legend />
            </LineChart>
            <div>
                <h3>
                    Exercise: <input type="text" onChange={(e) => ChangeInputValues(e.target.value)}/>
                </h3>
            </div>
        </div>
    )
}

