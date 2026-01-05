import { useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

interface ChartPoint {
    "workout_name": string
    date: string,
    session_volume: number,
    best_set_volume: number,
    weight: number,
    reps: number,
    sets: {
        weight: number,
        reps: number
    }
}

export default function Graphs() {

    const [exerciseData, setExercise] = useState<ChartPoint[]>([]);
    const [selectedMetric, setSelectedMetric] = useState("weight");

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

        }
        catch (error) {
            alert(error);
        }
    }

    const debouncedRequest = useRef(debounce(getExerciseData, 1000));

    function ChangeInputValues(exerciseName: string) {
        debouncedRequest.current(exerciseName);
    }

    const formatXAxis = (tickItem: string | number) => {
        return new Date(tickItem).toLocaleDateString("en-US", {month: "short", day: "numeric"})
    }

    function SetsToolTip({ active, payload}: any) {
        if (!active || !payload.length) return;

        const point = payload[0].payload;

        return (
            <div style={{padding: 10, borderRadius: 6 }}>
                <div>
                    <strong>{point.workout_name}</strong>
                </div>
                <div>
                    {new Date(point.date).toLocaleDateString()}
                </div>

                <hr />
                <div>
                    {selectedMetric === "weight" && 
                        <strong>Heaviest Weight: {point.weight} lbs x {point.reps}</strong>
                    }
                    {selectedMetric === "session_volume" && 
                        <strong>Session Volume: {point.session_volume} lbs </strong>
                    }
                    {selectedMetric === "best_set_volume" && 
                        <strong>Best Set Volume: {point.best_set_volume} lbs </strong>
                    }
                    
                    {point.sets.map((set: any, i: number) => (
                        <div key={i}>
                            Set {i+1}: {set.weight} lbs x {set.reps}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div>
            <LineChart style={{  width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }} responsive data={exerciseData}
                    margin={{
                    top: 20,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    }}>
                <CartesianGrid/>
                <XAxis dataKey={"date"} tickFormatter={formatXAxis} padding={{ left: 30, right: 30}}/>
                <YAxis dataKey={selectedMetric} unit=" lbs" tickCount={6} padding={{ top: 30}}/>
                <Tooltip cursor={{ strokeDasharray: "3 3"}} content={SetsToolTip}/>
                <Line dataKey={selectedMetric} name="Heaviest Weight" fill="#1dd617ff"/>
                <Legend />
            </LineChart>
            <div>
                <h3>
                    Exercise: <input type="text" onChange={(e) => ChangeInputValues(e.target.value)}/>
                </h3>
                <label htmlFor="metrics">Metrics: </label>
                <select name="metrics" id="metrics" defaultValue="weight"
                    onChange={e => setSelectedMetric(e.target.value)}>
                    <option value="weight">Heaviest Weight</option>
                    <option value="session_volume">Session Volume</option>
                    <option value="best_set_volume">Best Set Volume</option>
                </select>
            </div>
        </div>
    )
}