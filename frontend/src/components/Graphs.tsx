import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import "./graph.css";
import sadFaceIcon from "../assets/sad.png";
import happyFaceIcon from "../assets/happiness.png";
import { authenticatedFetch } from "../api/apiClient";
import { useExerciseSearch } from "./useExerciseSearch";

interface ChartPoint {
    workout_name: string,
    date: string,
    session_volume: number,
    best_set_volume: number,
    weight: number,
    reps: number,
    sets: {
        weight: number,
        reps: number
    },
    volume_change: number
}

interface AnalyticsResponse {
    data: ChartPoint[]
    summary: {
        avg_last_3: number | null,
        avg_last_7: number | null
    }
}

export default function Graphs() {

    const [exerciseData, setExercise] = useState<AnalyticsResponse | null>(null);
    const [selectedMetric, setSelectedMetric] = useState("weight");
    const [selectedRange, setSelectedRange] = useState("6M");

    const {searchedExercise, debouncedExerciseSearch, setSearchedExercise} = useExerciseSearch();
    const [inputFieldValue, setInputFieldValue] = useState("");

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 450);

    const METRIC_NAME: Record<string, string> = {
        weight: "Heaviest Weight",
        session_volume: "Session Volume",
        best_set_volume: "Best Set Volume"
    }

    const METRIC_STYLE: Record<string, {color: string}> = {
        weight: {color: "#2c8863"},
        session_volume: {color: "#3b82f6"},
        best_set_volume: {color: "#f59e0b"},
    }
    
    const DOT_STYLE = {
        fill: "#eaeaea",     // same as your text color
        stroke: "#0b0b0b",   // chart background
    };

    // Days covered by each range option; null means show everything
    const RANGE_DAYS: Record<string, number | null> = {
        "1M": 30,
        "3M": 90,
        "6M": 182,
        "1Y": 365,
        "All": null,
    };

    // Above this many points, dots overlap and chop up the line, so hide them
    const DENSE_POINT_THRESHOLD = 30;

    const hasAnyData = !!exerciseData?.data && exerciseData.data.length > 0;

    // Timestamps let the x-axis space workouts by real time instead of evenly
    const rangeDays = RANGE_DAYS[selectedRange];
    const rangeStart = rangeDays === null ? null : Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const chartData = (exerciseData?.data ?? [])
        .map(point => ({ ...point, timestamp: new Date(point.date).getTime() }))
        .filter(point => rangeStart === null || point.timestamp >= rangeStart);

    const isDense = chartData.length > DENSE_POINT_THRESHOLD;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 450);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const chartMargin = isMobile 
        ? { top: 10, right: 8, bottom: 0, left: -20 }
        : { top: 20, right: 32, bottom: 0, left: 0 };

    async function getExerciseData(exerciseName: string) {
        if (!exerciseName) return;

        try {
            const response = await authenticatedFetch(`/exercises/analytics/${exerciseName}`, "GET");
    
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

    function ChangeInputValues(exerciseName: string) {
        if (exerciseName !== "") {
            setInputFieldValue(exerciseName);
            debouncedExerciseSearch.current.run(exerciseName);
        }
        else {
            debouncedExerciseSearch.current.cancel()
            setInputFieldValue("");
            setSearchedExercise({});
        }
    }

    function selectExercise(exerciseName: string) {
        setInputFieldValue(exerciseName);
        setSearchedExercise({});
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
                    {
                        <strong>Volume {point.volume_change > 0 ? "+" : ""} {point.volume_change}% last session</strong>
                    }
                </div>
            </div>
        )
    }

    return (
        <div className="page graph-page">
            <div className="graph-card">
                {hasAnyData && chartData.length === 0 &&
                    <div className="graph-empty">
                        <div className="graph-empty-content">
                            <div className="graph-empty-row">
                                <span>No workouts in this time range, try a longer one</span>
                            </div>
                        </div>
                    </div>
                }
                {!hasAnyData &&
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
                {exerciseData?.summary && 
                    <div className="graph-summary">
                        <div className="graph-summary-title">
                            Latest workout vs recent average (volume)
                        </div>

                        {exerciseData.summary.avg_last_3 !== null && (
                            <div
                                className={`graph-summary-item
                                    ${exerciseData.summary.avg_last_3 > 0 ? "positive" : exerciseData.summary.avg_last_3 < 0 ? "negative" : "stagnation"}`}
                                >
                                    vs last 3 workouts: {exerciseData.summary.avg_last_3 > 0 ? "+" : ""}{exerciseData.summary.avg_last_3}%
                                
                                </div>
                        )}
                        {exerciseData.summary.avg_last_7 !== null && (
                            <div
                                className={`graph-summary-item ${
                                    exerciseData.summary.avg_last_7 > 0 ? "positive" : exerciseData.summary.avg_last_7 < 0 ? "negative" : "stagnation"}`}
                            >
                                vs last 7 workouts: {exerciseData.summary.avg_last_7 > 0 ? "+" : ""}{exerciseData.summary.avg_last_7}%
                            </div>
                        )}
                    </div>
                
                }
                <LineChart className="progress-chart" responsive data={chartData}
                    style={{ width: "100%" }}
                    margin={chartMargin}>
                    <CartesianGrid/>
                    <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]}
                        tickFormatter={formatXAxis} tickCount={isMobile ? 4 : 8} padding={{ left: 30, right: 30}}/>
                    <YAxis dataKey={selectedMetric} unit=" lbs" tickCount={6} padding={{ top: 30}}/>
                    <Tooltip cursor={{ strokeDasharray: "3 3"}} offset={isMobile ? 20 : 10} content={SetsToolTip}/>
                    <Line dataKey={selectedMetric} name={METRIC_NAME[selectedMetric]} fill="#1dd617ff"
                        stroke={METRIC_STYLE[selectedMetric].color}
                        type="monotone"
                        strokeWidth={isDense ? 2 : 3}
                        dot={isDense ? false : { r: 4, fill: DOT_STYLE.fill, stroke: DOT_STYLE.stroke}}
                        activeDot={{ r: 6, fill: DOT_STYLE.fill, stroke: DOT_STYLE.stroke }}
                    />
                    <Legend />
                </LineChart>
            </div>
            <div className="graph-controls">
                <div className="graph-input">
                    <label> Exercise: </label>
                    <input type="text" placeholder="e.g. Bench Press" value={inputFieldValue} onChange={(e) => ChangeInputValues(e.target.value)}/>
                    {Object.keys(searchedExercise).length > 0 && (
                        <ul className="exercise-dropdown">
                            {Object.keys(searchedExercise).map((name) => (
                                <li key={name} onClick={function()
                                    { 
                                        selectExercise(name);
                                        getExerciseData(name);
                                    }}>
                                    {name}
                                    <span className="exercise-date">
                                        {new Date(searchedExercise[name]).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"})}
                                    </span>

                                </li>
                            ))}
                        </ul>
                    )}
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
                <div className="graph-select">
                    <label>Range</label>

                    <select name="range" id="range" value={selectedRange}
                        onChange={e => setSelectedRange(e.target.value)}>
                        {Object.keys(RANGE_DAYS).map(range => (
                            <option key={range} value={range}>{range}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}