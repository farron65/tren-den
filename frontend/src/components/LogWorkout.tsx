import { useRef, useEffect, useState } from "react";
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
    // Current workout being edited by the user
    const [template, setTemplate] = useState<Template>({
        workout_name: "",
        exercises: []
    });
    const [loading, setLoading] = useState(true);

    // Previous workout data used only to render the "Previous" column.
    // showPreviousSet uses this
    // Updating it triggers a rerender
    const [originalTemplate, setOriginalTemplate] = useState<Exercise[]>([]);

    // reference that always holds the LATEST previous-workout data
    // used inside the debounced getPreviousSets to avoid STALE closures.
    // Must be manually kept in sync with originalTemplate
    const templateRef = useRef<Exercise[]>([]);

    // Snapshot of the original workout structure on the first page load
    // Never changes after initialization
    // hasTemplateChanged uses this
    const originalTemplateRef = useRef<Exercise[]>([]);
    
    const [modal, setModal] = useState(false);
    const [modalText, setModalText] = useState("");

    const toggleModal = () => {
        setModal(!modal);
    }

    const debounce = <T extends unknown[]> (
        callback: (...args: T) => void,
        delay: number,
    ) => {
        let timeoutTimer: ReturnType<typeof setTimeout>;

        return (...args: T) => {
            clearTimeout(timeoutTimer);

            timeoutTimer = setTimeout(() => {
                callback(...args);
            }, delay)
        }
    };
    
    // Debounced function created ONCE on mount
    // Because of Js closures, it would use stale values
    // Using templateRef.current ensures we always read the latest data.
    const debouncedRequest = useRef(debounce(getPreviousSets, 1000));
    
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

                setTemplate(result); // editable workout
                setOriginalTemplate(result.previous_workout_data); // UI "Previous" column
                templateRef.current = result.previous_workout_data; // keep ref in sync
                originalTemplateRef.current = result.previous_workout_data; // immutable snapshot
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

    async function handleSave(method: string) {

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

            if (method === "Save") {
                const exercises = dataToSend.exercises;
    
                const response = await fetch(url, getRequestOptions("PATCH", exercises));
    
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                alert("Successfully saved workout, without changing the workout template");
            }

            else if (method === "Update") {
                const { date, ...updatedWorkout} = dataToSend;
                const response = await fetch(url, getRequestOptions("PUT", updatedWorkout));
    
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                alert("Successfully saved workout, and updated the workout template");
            }

            navigate("/workouts");

        }
        catch (error) {
            alert(error);
        }
    }

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

    function getDate(dateType: string) {
        const today = new Date();
        const month = today.toLocaleString("default", {month: "short"});
        const day = today.getDate();
        const year = today.getFullYear();

        return  dateType === "view" ? `${month} ${day}, ${year}` : `${year}-${today.getMonth()+1}-${day} ${today.toLocaleTimeString("it-IT")}`; 
    }

    function showPreviousSet(targetExName: string, setIndex: number) {

        const originalExercise = originalTemplate.find(exercise => exercise.exercise_name.toLowerCase() === targetExName.toLowerCase());
        
        if (!originalExercise) {
            return <label> - </label>
        }
        const previousOriginalSet = originalExercise.sets.at(setIndex);
        if (!previousOriginalSet || (previousOriginalSet.weight === 0 && previousOriginalSet.reps === 0)) {
            return <label> - </label>
        }
        return <label>{previousOriginalSet.weight} lbs x {previousOriginalSet.reps}</label>
    }

    // Uses REF because this function is called by a debounced callback
    // Avoids stale closures by reading from templateRef.current
    async function getPreviousSets(targetExName: string) {

        const headers = {"Authorization": `Bearer ${access_token}`}
        const url = `http://127.0.0.1:8000/exercises/${targetExName}`;
        try {
            const response = await fetch(url, {headers: headers});

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`)
            }
            

            const previousSetData = await response.json();
            if (previousSetData) {
                const updatedOriginalTemplate = [...templateRef.current, previousSetData]
                setOriginalTemplate(updatedOriginalTemplate); // update UI
                templateRef.current = updatedOriginalTemplate; // update ref for the next debounce call
            }
        }
        catch (error) {
            alert(error);
        }
    }

    function hasTemplateChanged(template: Exercise[], templateRef: Exercise[]) {
        let message = "";
        let exAdded = 0;
        let exRemoved = 0;
        let setsAdded = 0;
        let setsRemoved = 0;

        template.forEach((exercise) => {
            const refExercise = templateRef.find((refEx) => refEx.exercise_name === exercise.exercise_name);
            if (!refExercise) {
                exAdded += 1;
                setsAdded += exercise.sets.length;
            }
            else {
                if (refExercise.sets.length > exercise.sets.length) {
                    setsRemoved += refExercise.sets.length - exercise.sets.length;
                }
                else if (refExercise.sets.length < exercise.sets.length) {
                    setsAdded += exercise.sets.length - refExercise.sets.length

                }
            }
        })

        templateRef.forEach((exercise) => {
            const templateExercise = template.find((templateEx) => templateEx.exercise_name === exercise.exercise_name);
            if (!templateExercise) {
                exRemoved += 1;
                setsRemoved += exercise.sets.length;
            }
        })

        message += exAdded === 1 ? `Adds ${exAdded} exercises. `: exAdded > 1 ? `Adds ${exAdded} exercises. ` : ""; 
        message += exRemoved === 1 ? `Removes ${exRemoved} exercises. `: exRemoved > 1 ? `Removes ${exRemoved} exercises. ` : "";  
        message += setsAdded === 1 ? `Adds ${setsAdded} set. `: setsAdded > 1 ? `Adds ${setsAdded} sets. ` : "";
        message += setsRemoved === 1 ? `Removes ${setsRemoved} set. `: setsRemoved > 1 ? `Removes ${setsRemoved} sets. ` : "";
        
        if (message) {
            setModalText(message);
            toggleModal();
        }

        else {
            handleSave("Save");
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
        debouncedRequest.current(newExerciseName);
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
                                {showPreviousSet(exercise.exercise_name, index)}
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
            <button onClick={() => hasTemplateChanged(template.exercises, originalTemplateRef.current)}>Finish</button>
            <div>
                <ol>
                    {exercises}
                </ol>
            </div>
            <button onClick={AddExercise}>Add Exercise</button>

            {modal && (
                <div className="modal">
                    <div onClick={toggleModal} className="overlay">
                        <div className="modal-content">
                            <p>
                                You've made changes from original template. Would you like to update it?
                                {modalText}
                            </p>
                            <div>
                                <button onClick={() => handleSave("Save")}>Save Workout Only</button>
                            </div>
                            <div>
                                <button onClick={() => handleSave("Update")}>Save Workout and Update Template</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}