import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./sets.css";

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
    exercises: Exercise[]
}

export default function EditWorkoutForm() {
    const [template, setTemplate] = useState<Template>({
        workout_name: "",
        exercises: []
    });
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    const access_token = localStorage.getItem("access_token");
    const headers = {"Authorization": `Bearer ${access_token}`}

    const templateId = useParams();
    const url = `http://127.0.0.1:8000/templates/${templateId.id}`;

    useEffect(() => {
        
        const fetchTemplate = async () => {
            try {
                const response = await fetch(url, {headers: headers});

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                setTemplate(result);
            }
            catch (error) {
                alert(error);
            }
            finally {
                setLoading(false);
            }
        }
            fetchTemplate();
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        const dataToSend = {
            workout_name: template.workout_name,
            exercises: template.exercises.map((exercise) => ({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight,
                    reps: set.reps
                }))
            }))
        }

        const requestOptions = {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dataToSend),
        }

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const result = await response.json();
            alert("Successfully saved template changes");

            return (
                navigate(`/templates/${result.id}`)
            )
        }
        catch (error) {
            alert(error);
        }

    }

    function DeleteSet(targetExID: string, targetSetID: string) {
        const updatedSet = template.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, sets: exercise.sets.filter((set) => set.id != targetSetID)}
            : exercise
        )

        setTemplate({...template, exercises: updatedSet});
    }

    function DeleteExercise(targetExID: string) {
        const updatedExercises = template.exercises.filter((exercise) => exercise.id != targetExID)
        
        setTemplate({...template, exercises: updatedExercises});
    }

    function changeSetValues(exerciseID: string, targetSetID: string, field: "weight" | "reps", value: number) {
        const newSetValue = isNaN(value) ? "" : value;
        const updatedSet = template.exercises.map((exercise) => exercise.id === exerciseID
            ? {...exercise, sets: exercise.sets.map((set) => set.id === targetSetID
                ? {...set, [field]: newSetValue}
                : set )}
            : exercise
        );
        setTemplate({...template, exercises: updatedSet});
    }

    function ChangeExerciseName(targetExID: string, newExerciseName: string) {
        const updatedExercise = template.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, exercise_name: newExerciseName}
            : exercise
        );
        setTemplate({...template, exercises: updatedExercise});
    }

    function changeFormName(newFormName: string) {
        setTemplate({...template, workout_name: newFormName});
    }

    function AddSet(targetExID: string) {
        const newSet = template.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0}]}
            : exercise
        );
        setTemplate({...template, exercises: newSet});
    }

    function AddExercise() {
        const newExercise = [...template.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}];
        setTemplate({...template, exercises: newExercise})
    }

    if (loading)  {
        return <h1>Loading</h1>
    }

    const exercises = template.exercises.map((exercise) => {
        return (
            <div key={exercise.id}>
                <input onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)} type="text" value={exercise.exercise_name}></input>
                <button onClick={() => DeleteExercise(exercise.id)}>X</button>
                {exercise.sets.map((set) => 
                    <div key={set.id} className="container">
                        <label>Set</label>
                        <div key={set.id} className="container">
                            <label>lbs</label>
                            <input onChange={(e) => changeSetValues(exercise.id, set.id, "weight", parseFloat(e.target.value))} type="number" placeholder={`${set.weight}`}/>
                            <label>Reps</label>
                            <input onChange={(e) => changeSetValues(exercise.id, set.id, "reps", parseInt(e.target.value))} type="number" placeholder={`${set.reps}`}/>
                            <button onClick={() => DeleteSet(exercise.id, set.id)}>X</button>
                        </div>
                    </div>
                )}
                <button onClick={() => AddSet(exercise.id)}>Add Set</button>
            </div>
        )
    })

    return (
        <div>
            <input onChange={(e) => changeFormName(e.target.value)} value={template.workout_name}></input>
            <button onClick={handleSave}>Save</button>
            <button onClick={() => navigate("/templates")}>Cancel</button>  
            <div>
                <ol>
                    {exercises}
                </ol>
            </div>
            <button onClick={AddExercise}>Add Exercise</button>
        </div>
    )
}