import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import "./graph.css";
import sadFaceIcon from "../assets/sad.png";
import happyFaceIcon from "../assets/happiness.png";
import { authenticatedFetch } from "../api/apiClient";

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

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 450);

    const METRIC_STYLE: Record<string, {color: string}> = {
        weight: {color: "#2c8863"},
        session_volume: {color: "#3b82f6"},
        best_set_volume: {color: "#f59e0b"},
    }
    
    const DOT_STYLE = {
        fill: "#eaeaea",     // same as your text color
        stroke: "#0b0b0b",   // chart background
    };
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 450);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const chartMargin = isMobile 
        ? { top: 10, right: 8, bottom: 0, left: -20 }
        : { top: 20, right: 32, bottom: 0, left: 0 };

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

        try {
            const response = await authenticatedFetch(`/analytics/${exerciseName}`, "GET");
    
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
    
            const result = await response.json();
            if (result) setExercise(result); 

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
            <div className="graph-tooltip">
                <strong>{point.workout_name}</strong>
                <div className="tooltip-date">
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
                        <div key={i} className="set-line">
                            Set {i+1}: {set.weight} lbs x {set.reps}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="page graph-page">
            <div className="graph-card">
                {exerciseData.length === 0 &&
                    <div className="graph-empty">
                        <div className="graph-empty-content">
                            <div className="graph-empty-row">
                                <span>No data yet for this exercise</span>
                                <img src={sadFaceIcon} className="graph-empty-icon" />
                            </div>

                            <div className="graph-empty-row">
                                <span>Log a workout with this exercise to see your progress here</span>
                                <img src={happyFaceIcon} className="graph-empty-icon" />
                            </div>
                        </div>
                    </div>

                }
                <LineChart className="progress-chart" responsive data={exerciseData}
                    style={{ width: "100%" }}
                    margin={chartMargin}>
                    <CartesianGrid/>
                    <XAxis dataKey={"date"} tickFormatter={formatXAxis} padding={{ left: 30, right: 30}}/>
                    <YAxis dataKey={selectedMetric} unit=" lbs" tickCount={6} padding={{ top: 30}}/>
                    <Tooltip cursor={{ strokeDasharray: "3 3"}} offset={isMobile ? 20 : 10} content={SetsToolTip}/>
                    <Line dataKey={selectedMetric} name={selectedMetric} fill="#1dd617ff"
                        stroke={METRIC_STYLE[selectedMetric].color}
                        strokeWidth={3}
                        dot={{ r: 4, fill: DOT_STYLE.fill, stroke: DOT_STYLE.stroke}}
                        activeDot={{ r: 6 }}
                    />
                    <Legend />
                </LineChart>
            </div>
            <div className="graph-controls">
                <div className="graph-input">
                    <label> Exercise: </label>
                    <input type="text" placeholder="e.g. Bench Press" onChange={(e) => ChangeInputValues(e.target.value)}/>
                </div>
                <div className="graph-select">
                    <label>Metric</label>
                    
                    <select name="metrics" id="metrics" defaultValue="weight"
                        onChange={e => setSelectedMetric(e.target.value)}>
                        <option value="weight">Heaviest Weight</option>
                        <option value="session_volume">Session Volume</option>
                        <option value="best_set_volume">Best Set Volume</option>
                    </select>
                </div>
            </div>
        </div>
    )
}