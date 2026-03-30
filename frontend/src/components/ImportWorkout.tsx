import { useState } from "react"
import { authenticatedFetch } from "../api/apiClient";

import "./importworkout.css";
import { useNavigate } from "react-router-dom";

export default function ImportWorkout() {
    const [importWorkout, setImportWorkout] = useState("");
    const [app, setApp] = useState("strong");

    const navigate = useNavigate();

    async function handleSubmit() {
        let workout;
        if (app === "strong") {workout = handleStrongApp()}
        else if (app === "hevy") {workout = handleHevyApp()}
        if (workout == null) {
            return;
        }
        try {
            const response = await authenticatedFetch("/workouts", "POST", workout);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            alert("Success");
            navigate("/workouts");
        }
        catch (error) {
            alert(error);
        }
    }

    function handleStrongApp() {
        const lines = importWorkout.trim().split("\n\n");
        if (lines.length < 2) {
            alert("Invalid format");
            return null;
        }

        const datePattern = /^\w+, \w+ \d+, \d+ at \d+:\d+$/;
        const setPattern = /^Set \d+: \d+ lb × \d+$/;
        if (!datePattern.test(lines[0].split("\n")[1])) {
           alert("Invalid format. Maybe you have a trailing whitespace?");
           return null;
        }
        let isValid = true;
        lines.slice(1, lines.length).forEach(line => {
                line.split("\n").slice(1).filter((s) => !s.startsWith("https")).forEach((s) => {
                    if (!setPattern.test(s)) {
                        isValid = false;
                    }
                })
           }
        );
        if (!isValid) {
            alert("Invalid set format.");
            return null;
        }

         const jsonWorkout = {
            "workout_name": lines[0].split("\n")[0],
            "date": new Date(lines[0].split("\n")[1].split(", ").slice(1).toString().replace("at", "")).toISOString(),
            "exercises": lines.slice(1, lines.length).map((ex) => ({
                "exercise_name": ex.split("\n")[0],
                "rest_time": 180,
                "sets": ex.split("\n").slice(1).filter((s) => !s.startsWith("https")).map((s) => 
                ({
                    "weight": Number(s.split(" ")[2]),
                    "reps": Number(s.split(" ")[5]),
                    "rest_time": 180000
                }))
            }))
        }
        return jsonWorkout;
    }

    function handleHevyApp() {
        const lines = importWorkout.trim().split("\n\n");
        if (lines.length < 2) {
            alert("Invalid format");
            return null;
        }

        const datePattern = /^\w+, \w+ \d+, \d+ at \d+:\d+\w+$/;
        const setPattern = /^Set \d+: \d+(\.\d)? lbs x \d+$/;
        if (!datePattern.test(lines[0].split("\n")[1])) {
           alert("Invalid format. Maybe you have a trailing whitespace?");
           return null;
        }
        let isValid = true;
        lines.slice(1, lines.length).forEach(line => {
                line.split("\n").slice(1).filter((s) => !s.startsWith("https") && !s.startsWith("@hevyapp")).forEach((s) => {
                    if (!setPattern.test(s)) {
                        isValid = false;
                    }
                })
           }
        );
        if (!isValid) {
            alert("Invalid set format.");
            return null;
        }

         const jsonWorkout = {
            "workout_name": lines[0].split("\n")[0],
            "date": new Date(lines[0].split("\n")[1].split(", ").slice(1).toString().replace("at", "").replace("am", "").replace("pm", "")).toISOString(),
            "exercises": lines.slice(1, lines.length).map((ex) => ({
                "exercise_name": ex.split("\n")[0],
                "rest_time": 180,
                "sets": ex.split("\n").slice(1).filter((s) => !s.startsWith("https")).map((s) => 
                ({
                    "weight": Number(s.split(" ")[2]),
                    "reps": Number(s.split(" ")[5]),
                    "rest_time": 180000
                }))
            }))
        }
        return jsonWorkout;

    }

    return (
        <div className="import-page">
            <div className="import-header">
                <h1 className="import-title">IMPORT WORKOUT</h1>
            </div>
            <div className="import-body">
                <div className="import-instructions">
                    <p className="import-instructions-title">How to import</p>
                    <div className="import-step">
                        <span className="import-step-number">1</span>
                        <p className="import-step-text">Open the <strong>Strong app</strong> on your iPhone and go to your workout history.</p>
                    </div>
                    <div className="import-step">
                        <span className="import-step-number">2</span>
                        <p className="import-step-text">Tap the workout you want to import, then tap <strong>Share &#8594; Copy Workout</strong>.</p>
                    </div>
                    <div className="import-step">
                        <span className="import-step-number">3</span>
                        <p className="import-step-text">Paste the copied text into the box and hit <strong>Import</strong>.</p>
                    </div>
                    <p className="import-supported">Supported: <span>Strong</span> — more apps coming soon</p>
                </div>
                <div className="import-form">
                    <div className="import-select-wrapper">
                        <label className="import-select-label">App</label>
                        <select className="import-select" onChange={e => setApp(e.target.value)}>
                            <option value="strong">Strong</option>
                            <option value="hevy">Hevy</option>
                        </select>
                    </div>
                    <textarea
                        className="import-textarea"
                        onChange={e => setImportWorkout(e.target.value)}
                        placeholder="Paste your Strong workout here..."
                    />
                    <button className="import-btn" onClick={handleSubmit}>IMPORT</button>
                </div>
            </div>
        </div>
    )
}