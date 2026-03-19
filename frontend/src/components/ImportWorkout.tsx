import { useState } from "react"
import { authenticatedFetch } from "../api/apiClient";

import "./importworkout.css";

export default function ImportWorkout() {
    const [importWorkout, setImportWorkout] = useState("");

    function parseImportWorkout() {
        const lines = importWorkout.trim().split("\n\n");
        let jsonWorkout = {
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

    async function handleSubmit() {
        try {
            const response = await authenticatedFetch("/workouts", "POST", parseImportWorkout());
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            alert("Success");
        }
        catch (error) {
            alert(error);
        }
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
                        <p className="import-step-text">Tap the workout you want to import, then tap <strong>Share → Copy Workout</strong>.</p>
                    </div>
                    <div className="import-step">
                        <span className="import-step-number">3</span>
                        <p className="import-step-text">Paste the copied text into the box and hit <strong>Import</strong>.</p>
                    </div>
                    <p className="import-supported">Supported: <span>Strong</span> — more apps coming soon</p>
                </div>
                <div className="import-form">
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