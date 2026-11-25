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

type MetricKey = "weight" | "session_volume" | "best_set_volume";

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
    // Phones start on a shorter range so the chart isn't crammed on first load
    const [selectedRange, setSelectedRange] = useState(window.innerWidth <= 450 ? "3M" : "6M");

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

    // Above this many points, dots overlap and chop up the line, so hide them.
    // Phones have about a third of the width, so they hit that much sooner.
    const DENSE_POINT_THRESHOLD = isMobile ? 12 : 30;

    const hasAnyData = !!exerciseData?.data && exerciseData.data.length > 0;

    const PR_COLOR = "#fa1515";

    // Timestamps let the x-axis space workouts by real time instead of evenly
    const allPoints = (exerciseData?.data ?? [])
        .map(point => ({ ...point, timestamp: new Date(point.date).getTime(), isPR: false }))
        .sort((a, b) => a.timestamp - b.timestamp);

    // A PR beats every earlier workout on the selected metric (ties don't count).
    // Runs over the full history before the range filter, so a short range
    // doesn't turn its first workout into a fake PR.
    let bestSoFar = -Infinity;
    allPoints.forEach((point, i) => {
        const value = point[selectedMetric as MetricKey];
        point.isPR = i > 0 && value > bestSoFar;
        bestSoFar = Math.max(bestSoFar, value);
    });

    const rangeDays = RANGE_DAYS[selectedRange];
    const rangeStart = rangeDays === null ? null : Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const chartData = allPoints.filter(point => rangeStart === null || point.timestamp >= rangeStart);

    const isDense = chartData.length > DENSE_POINT_THRESHOLD;

    // PR dots always show; normal dots are hidden when the chart is dense
    function renderDot({ cx, cy, index, payload }: { cx?: number, cy?: number, index?: number, payload?: { isPR?: boolean } }) {
        const key = `dot-${index}`;
        if (cx == null || cy == null) return <g key={key} />;

        if (payload?.isPR) {
            return (
                <g key={key}>
                    <circle className="pr-pulse" cx={cx} cy={cy} r={9} fill={PR_COLOR} opacity={0.25} />
                    <circle cx={cx} cy={cy} r={5} fill={PR_COLOR} stroke={DOT_STYLE.stroke} strokeWidth={1.5} />
                </g>
            );
        }

        if (isDense) return <g key={key} />;
        return <circle key={key} cx={cx} cy={cy} r={4} fill={DOT_STYLE.fill} stroke={DOT_STYLE.stroke} />;
    }

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
        const metricValue = selectedMetric === "weight"
            ? `${point.weight} lbs × ${point.reps}`
            : `${point[selectedMetric]} lbs`;
        const change: number = point.volume_change;
        const changeClass = change > 0 ? "positive" : change < 0 ? "negative" : "stagnation";

        return (
            <div className="graph-tooltip" style={{ borderColor: METRIC_STYLE[selectedMetric].color }}>
                <div className="tooltip-header">
                    <span className="tooltip-title">{point.workout_name}</span>
                    {point.isPR && <span className="tooltip-pr">PR</span>}
                </div>
                <div className="tooltip-date">
                    {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>

                <div className="tooltip-metric-label">{METRIC_NAME[selectedMetric]}</div>
                <div className="tooltip-metric-value">{metricValue}</div>

                <div className="tooltip-sets">
                    {point.sets.map((set: any, i: number) => (
                        <div key={i} className="set-line">
                            <span className="set-number">Set {i+1}</span>
                            <span>{set.weight} lbs × {set.reps}</span>
                        </div>
                    ))}
                </div>

                <div className={`tooltip-change ${changeClass}`}>
                    {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {Math.abs(change)}% volume vs last session
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
                        dot={renderDot}
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