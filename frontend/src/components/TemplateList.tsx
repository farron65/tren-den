import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        <>
        <h1>Templates</h1>
            {templates.map((template) => (
                <div key={template.id}>
                    <h2>
                        {template.workout_name}
                    </h2>
                    {template.exercises.map((exercise: any) => (
                        <div key={exercise.id}>
                            <p>
                                {exercise.exercise_name}
                            </p>
                        </div>
                    ))}
                <button onClick={() => handleDelete(template.id)}>Delete</button>
                <button onClick={() => navigate(`/templates/${template.id}`)}>Edit</button>
                </div>
            ))}
        </>
    )
}