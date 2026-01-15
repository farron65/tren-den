import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./templateview.css";

interface Set {
    id: string
    weight: number,
    reps: number,
}

interface Exercise {
    id: string,
    exercise_name: string,
    sets: Set[]
}

interface Template {
    id: string
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export default function TemplateView() {
    const [template, SetTemplate] = useState<Template>({
        id: "",
        workout_name: "",
        date: "",
        exercises: []
    });
    const templateId = useParams();
    const navigate = useNavigate();
    
    const access_token = localStorage.getItem("access_token");
    
    const baseURL = import.meta.env.VITE_API_URL;
    const url = `${baseURL}/templates/${templateId.id}`

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!access_token) {
                return;
            }

            try {
                const response = await fetch(url, {headers: {"Authorization": `Bearer ${access_token}`}});
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }

                const result = await response.json();
                SetTemplate(result);
            }
            catch (error) {
                alert(error);
            }
        }
        fetchTemplate();
    }, []);

    return (
        <div className="page app template-view">
            <header className="template-view-header">
                <h1 className="template-view-title">{template.workout_name}</h1>

                <div className="template-view-actions">
                    <button className="start-btn" onClick={() => navigate(`/log-workout/${template.id}`)}>START</button>
                    <button className="edit-btn" onClick={() => navigate(`/edit-template/${template.id}`)}>EDIT</button>
                    <button className="back-btn" onClick={() => navigate("/templates")}>BACK</button>
                </div>
            </header>
            <section className="template-view-body">
                {template.exercises.map((exercise: Exercise) => (
                <div key={exercise.id} className="exercise-block">
                    <h3 className="exercise-title">{exercise.exercise_name}</h3>
                    <div className="set-list">
                        {exercise.sets.map((set: any) => (
                            <div key={set.id} className="set-row">
                                {set.weight} lbs x {set.reps}
                            </div>
                        ))}
                    </div>
                </div>
                ))}
            </section>
            
        </div>
    );
}