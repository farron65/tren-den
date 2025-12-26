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

export default function LogWorkout() {
    const [template, setTemplate] = useState<Template>({
        workout_name: "",
        exercises: []
    });
    const [loading, setLoading] = useState(true);
    const [originalTemplate, setOriginalTemplate] = useState<Template>({
        workout_name: "",
        exercises: []
    });
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
                setOriginalTemplate(result);
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

    function getRequestOptions(method: string, dataToSend: {}) {
        const requestOptions = {
            method: method,
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dataToSend),
        }
        return requestOptions;
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        const dataToSend = {
            workout_name: template.workout_name,
            date: getDate("post"),
            exercises: template.exercises.map((exercise) => ({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight,
                    reps: set.reps
                }))
            }))
        }

        const requestOptions = getRequestOptions("POST", dataToSend);
        try {
            const saveWorkout = await fetch("http://127.0.0.1:8000/workouts/", requestOptions);

            if (!saveWorkout.ok) {
                throw new Error(`Response status: ${saveWorkout.status}`);
            }
            alert("You are a beast 💪🏆");

            const { date, ...templateUpdate } = dataToSend;

            const response = await fetch(url, getRequestOptions("PUT", templateUpdate));

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            navigate("/workouts");

        }
        catch (error) {
            alert(error);
        }

    }

    function getDate(dateType: string) {
        const today = new Date();
        const month = today.toLocaleString("default", {month: "short"});
        const day = today.getDate();
        const year = today.getFullYear();

        return  dateType === "view" ? `${month} ${day}, ${year}` : `${year}-${today.getMonth()+1}-${day}`; 
    }

    function showPreviousSet(targetExID: string, targetSetID: string) {
        const originalExercise = originalTemplate.exercises.find(ex => ex.id === targetExID)
        
        if (!originalExercise) {
            return <label> - </label>
        }
        const previousOriginalSet = originalExercise.sets.find(set => set.id === targetSetID);

        if (!previousOriginalSet || (previousOriginalSet.weight === 0 && previousOriginalSet.reps === 0)) {
            return <label> - </label>
        }
        return <label>{previousOriginalSet.weight} lbs x {previousOriginalSet.reps}</label>
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
        const newSetValue = isNaN(value) ? 0 : value;
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
    else if (!template.workout_name) {
        return <h1>Template doesn't exist</h1>
    }

    const exercises = template.exercises.map((exercise) => {
        return (
            <div key={exercise.id}>
                <input onChange={(e) => ChangeExerciseName(exercise.id, e.target.value)} type="text" value={exercise.exercise_name}></input>
                <button onClick={() => DeleteExercise(exercise.id)}>X</button>
                <div className="container-row">
                    <label>Set</label>
                    <label>Previous</label>
                </div>
                {exercise.sets.map((set, index) => {
                    const previousSet = index > 0 ? exercise.sets[index-1] : null;
                    const previousWeight = previousSet ? previousSet.weight : 0;
                    const previousReps = previousSet ? previousSet.reps : 0;
                    return (
                        <div key={set.id} className="container">
                            <div className="container-row">
                                {showPreviousSet(exercise.id, set.id)}
                            </div>
                            <div key={set.id} className="container">
                                <label>lbs</label>
                                <input onChange={(e) => changeSetValues(exercise.id, set.id, "weight", parseFloat(e.target.value))} type="number" value={set.weight === 0 && set.reps === 0 ? "" : set.weight} placeholder={`${previousWeight}`}/>
                                <label>Reps</label>
                                <input onChange={(e) => changeSetValues(exercise.id, set.id, "reps", parseInt(e.target.value))} type="number" value={set.reps === 0 ? "" : set.reps} placeholder={`${previousReps}`}/>
                                <button onClick={() => DeleteSet(exercise.id, set.id)}>X</button>
                            </div>
                        </div>
                    )
                })}
                <button onClick={() => AddSet(exercise.id)}>Add Set</button>
            </div>
        )
    })

    return (
        <div>
            <h1>{template.workout_name}</h1>
            <h3>
                {getDate("view")}
            </h3>
            <button onClick={handleSave}>Finish</button>
            <div>
                <ol>
                    {exercises}
                </ol>
            </div>
            <button onClick={AddExercise}>Add Exercise</button>
        </div>
    )
}