import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

export default function TemplateView() {
    const [template, SetTemplate] = useState<Template>({
        workout_name: "",
        date: "",
        exercises: []
    });
    const templateId = useParams();
    const access_token = localStorage.getItem("access_token");
    const url = `http://127.0.0.1:8000/templates/${templateId.id}`

    function getDate() {
        const today = new Date();
        const month = today.toLocaleString("default", {month: "short"});
        const day = today.getDate();
        const year = today.getFullYear();
        return `${month} ${day}, ${year}`; 
    }

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!access_token) {
                alert("Access token needed");
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

    if (template.exercises.length == 0) {
        return (
            <div>
                Empty template
            </div>
        );
    }

    return (
        <div>
            <h1>
                {template.workout_name}
            </h1>
            <h3>
                {getDate()}
            </h3>
            {template.exercises.map((exercise: Exercise) => (
                <li key={exercise.id}>
                    <h3>{exercise.exercise_name}</h3>
                    {exercise.sets.map((set: any) => (
                        <div key={set.id}>
                            <h4>
                                Weight: {set.weight}
                            </h4>
                            <h4>
                                Reps: {set.reps}
                            </h4>
                        </div>
                    ))}
                </li>
            ))}
        </div>
    );
}