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

    const [modal, setModal] = useState(false);
    const [modalText, setModalText] = useState("");
    const [templateID, setTemplateID] = useState(0);

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
                setModal(false);
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

    const toggleModal = (templateName: string, templateID: number) => {
        setTemplateID(templateID);
        setModalText(templateName);
        setModal(!modal);
    }

    return (
        
        <div className="page templates-page">
            <header className="templates-header">
                <h1 className="templates-title">TEMPLATES</h1>
                <div>
                    <button className="create-template-btn" onClick={() => navigate("/create-template")}>
                        + TEMPLATE
                    </button>
                    <button className="back-btn" onClick={() => navigate("/workouts")}>
                        BACK
                    </button>
                </div>
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
                        onClick={() => toggleModal(template.workout_name, template.id)}
                    >
                        DELETE
                    </button>
                    </div>
                </section>
                ))}
            </main>
            {modal && 
                <div className="modal">
                    <div className="overlay" onClick={() => setModal(false)}>
                        <div
                            className="modal-box"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>DELETE TEMPLATE '{modalText}' ?</h3>
                            <p>This action is permanent.</p>

                            <div className="modal-actions">
                            <button onClick={() => setModal(false)}>
                                CANCEL
                            </button>
                            <button
                                className="danger"
                                onClick={() => handleDelete(templateID)}
                            >
                                DELETE
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>  
    )
}