import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./templatelist.css";

interface Exercise {
    id: number,
    exercise_name: string,
}

interface Template {
    id: number
    workout_name: string,
    exercises: Exercise[]
}

export default function ListTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);

    const navigate = useNavigate();
    const access_token = localStorage.getItem("access_token");
    const url = "http://127.0.0.1:8000/templates"

    async function handleDelete(targetId: number) {
        const headers = {"Authorization": `Bearer ${access_token}`}

        try {
            const response = await fetch(`${url}/${targetId}`, {method: "DELETE", headers: headers});
            
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            else {
                const updatedTemplate = templates.filter((template) => template.id != targetId);
                setTemplates(updatedTemplate);
            }

        }
        catch (error) {
            alert(error);
        }
    }
    useEffect(() => {   

        const fetchTemplates = async () => {
            if (!access_token) {
                alert("Access token needed");
                return;
            }
            const headers = {"Authorization": `Bearer ${access_token}`}

            try {
                const response = await fetch(url, {headers: headers});
                
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                setTemplates(result);
            }
            catch (error) {
                alert(error);
            }
        }
        fetchTemplates();
    }, []);

    return (
        
        <div className="templates-page">
            <header className="templates-header">
                <h1 className="templates-title">TEMPLATES</h1>
                <button className="back-btn" onClick={() => navigate("/workouts")}>
                    BACK
                </button>
            </header>

            <main className="templates-list">
                {templates.map((template) => (
                <section key={template.id} className="template-card">
                    <div className="template-header">
                    <h2 className="template-name">{template.workout_name}</h2>

                    <button
                        className="start-btn"
                        onClick={() => navigate(`/log-workout/${template.id}`)}
                    >
                        START
                    </button>
                    </div>

                    <div className="template-exercises">
                    {template.exercises.map((exercise) => (
                        <div key={exercise.id} className="template-exercise">
                        {exercise.exercise_name}
                        </div>
                    ))}
                    </div>

                    <div className="template-actions">
                    <button
                        className="edit-btn"
                        onClick={() => navigate(`/edit-template/${template.id}`)}
                    >
                        EDIT
                    </button>

                    <button
                        className="delete-template-btn"
                        onClick={() => handleDelete(template.id)}
                    >
                        DELETE
                    </button>
                    </div>
                </section>
                ))}
            </main>
        </div>  
    )
}