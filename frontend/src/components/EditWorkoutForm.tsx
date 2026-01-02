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

interface Workout {
    workout_name: string,
    date: string,
    exercises: Exercise[]
}

interface WorkoutProps {
    isTemplate: boolean
}

export default function EditWorkoutForm({isTemplate}: WorkoutProps) {
    const [workoutForm, setWorkoutForm] = useState<Workout>({
        workout_name: "",
        date: "",
        exercises: []
    });
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    const access_token = localStorage.getItem("access_token");
    const headers = {"Authorization": `Bearer ${access_token}`}

    const formID = useParams();

    const url = `http://127.0.0.1:8000/`;

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                let response;
                if (isTemplate) {
                    console.log(url);
                    response = await fetch(`${url}templates/${formID.id}`, {headers: headers});
                }

                else {
                    response = await fetch(`${url}workouts/${formID.id}`, {headers: headers})
                }

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                setWorkoutForm(result);
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
        console.log(workoutForm.workout_name, workoutForm.date);
        const dataToSend = {
            workout_name: workoutForm.workout_name,
            date: workoutForm.date,
            exercises: workoutForm.exercises.map((exercise) => ({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets.map((set) => ({
                    weight: set.weight,
                    reps: set.reps
                }))
            }))
        }

        try {
            let response;
            if (isTemplate) {
                const {date, ...templateUpdateData} = dataToSend
                response = await fetch(`${url}templates/${formID.id}`, getRequestOptions(templateUpdateData));
            }

            else {
                response = await fetch(`${url}workouts/${formID.id}`, getRequestOptions(dataToSend));
            }

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const result = await response.json();
            console.log(result);
            if (isTemplate) {
                alert("Successfully saved template changes");

                return (
                    navigate(`/templates/${result.id}`)
                )
            }
            else {
                alert("Successfully saved workout changes");

                return (
                    navigate(`/workouts/${result.id}`)
                )
            }
        }
        catch (error) {
            alert(error);
        }
    }

    function getRequestOptions(data: object) {
        const requestOptions = {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        }
        return requestOptions
    }

    function DeleteSet(targetExID: string, targetSetID: string) {
        const updatedSet = workoutForm.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, sets: exercise.sets.filter((set) => set.id != targetSetID)}
            : exercise
        )

        setWorkoutForm({...workoutForm, exercises: updatedSet});
    }

    function DeleteExercise(targetExID: string) {
        const updatedExercises = workoutForm.exercises.filter((exercise) => exercise.id != targetExID)
        
        setWorkoutForm({...workoutForm, exercises: updatedExercises});
    }

    function changeSetValues(exerciseID: string, targetSetID: string, field: "weight" | "reps", value: number) {
        const newSetValue = isNaN(value) ? "" : value;
        const updatedSet = workoutForm.exercises.map((exercise) => exercise.id === exerciseID
            ? {...exercise, sets: exercise.sets.map((set) => set.id === targetSetID
                ? {...set, [field]: newSetValue}
                : set )}
            : exercise
        );
        setWorkoutForm({...workoutForm, exercises: updatedSet});
    }

    function ChangeExerciseName(targetExID: string, newExerciseName: string) {
        const updatedExercise = workoutForm.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, exercise_name: newExerciseName}
            : exercise
        );
        setWorkoutForm({...workoutForm, exercises: updatedExercise});
    }

    function ChangeFormDate(newDate: string) {
        setWorkoutForm({...workoutForm, date: newDate})
    }

    function ChangeFormName(newFormName: string) {
        setWorkoutForm({...workoutForm, workout_name: newFormName});
    }

    function AddSet(targetExID: string) {
        const newSet = workoutForm.exercises.map((exercise) => exercise.id === targetExID
            ? {...exercise, sets: [...exercise.sets, {id: crypto.randomUUID(), weight: 0.0, reps: 0}]}
            : exercise
        );
        setWorkoutForm({...workoutForm, exercises: newSet});
    }

    function AddExercise() {
        const newExercise = [...workoutForm.exercises, {id: crypto.randomUUID(), exercise_name: "", sets: []}];
        setWorkoutForm({...workoutForm, exercises: newExercise})
    }

    if (loading)  {
        return <h1>Loading</h1>
    }

    const exercises = workoutForm.exercises.map((exercise) => {
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
            <input type="text" onChange={(e) => ChangeFormName(e.target.value)} value={workoutForm.workout_name}></input>
            {!isTemplate && 
            <div>
                <label>
                    Date:
                </label>
                <input type="date" onChange={(e) => ChangeFormDate(e.target.value)} value={workoutForm.date.substring(0,10)}/>
            </div>
            }
            <button onClick={handleSave}>Save</button>
            {!isTemplate &&
                <button onClick={() => navigate("/workouts")}>Cancel</button>  
            }
            {isTemplate &&
                <button onClick={() => navigate("/templates")}>Cancel</button>  
            }
            <div>
                <ol>
                    {exercises}
                </ol>
            </div>
            <button onClick={AddExercise}>Add Exercise</button>
        </div>
    )
}