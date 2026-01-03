import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";
import "./sets.css";

interface Workout {
    id: string,
    workout_name: string,
    date: Date
}

export default function WorkoutsHistory() {

    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const navigate = useNavigate();
    
    const access_token = localStorage.getItem("access_token");
    const url = "http://127.0.0.1:8000/workouts";

    const [modal, setModal] = useState(false);
    const [modalText, setModalText] = useState("");
    const [workoutID, setWorkoutID] = useState("");

    useEffect(() => {
        const fetchWorkouts = async () => {
            if (!access_token){
                alert("Access token needed");
                return;
            }
            try {
                const response = await fetch(url, {headers: {"Authorization": `Bearer ${access_token}`}});
                if (!response.ok) {
                    throw new Error(`Response status:${response.status}`);
                }
                
                const result = await response.json();
                setWorkouts(result);
            }
            catch(error) {
                alert(error);
            }
        };
        fetchWorkouts();
    }, []);

    async function handleDelete(targetID: string) {
        const url = `http://127.0.0.1:8000/workouts/${targetID}`;
        const requestOptions = {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            }
        }

        try {
            const response = await fetch(url, requestOptions);
    
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            alert("Successfully deleted workout");
            const updatedWorkouts = workouts.filter((workout) => workout.id != targetID);
            setWorkouts(updatedWorkouts);
        }
        catch (error) {
            alert(error);
        }
        finally {
            setModal(!modal);
        }
    }

    const toggleModal = (workout_name: string, workout_id: string, ) => {
        setWorkoutID(workout_id);
        setModalText(workout_name)
        setModal(!modal);
    }

    function getWorkoutDate(workoutDate: Date) {
        const dt = new Date(workoutDate)

        const month = dt.toLocaleString("default", {month: "short"});
        const day = dt.getDate();
        const year = dt.getFullYear();

        return `${month} ${day}, ${year}`; 
    }

    if (workouts.length == 0){
        return (
            <div>
                <h1>No past workouts</h1>
                <button onClick={() => navigate("/create-workout")}>Create Workout</button>
            </div>
        )
    }

    return (
        <div>
            <h1>Past workouts</h1>
            <ul>
                {workouts.map(workout => (
                    <div key={workout.id}>
                        <li>
                            <Link to={`/workouts/${workout.id}`}>
                                {workout.workout_name}   
                            </Link>
                            <label>
                                {getWorkoutDate(workout.date)}    
                            </label>
                            <button onClick={() => toggleModal(workout.workout_name, workout.id)}>X</button>
                        </li> 
                    </div>
                ))}
            </ul>
            <button onClick={() => navigate("/create-workout/",)}>Start Workout</button>
            <button onClick={() => navigate("/create-template/")}>Create Template</button>
            <button onClick={() => navigate("/templates/")}>Templates</button>
            <button onClick={() => navigate("/analytics")}>Analytics</button>
            {modal && (
                <div className="modal">
                    <div onClick={() => setModal(!modal)} className="overlay">
                        <div className="modal-content">
                            <h3>
                                Delete '{modalText}' workout?
                            </h3>
                            <p>
                                Are you sure you want to delete this workout? It'll be gone forever.
                            </p>
                            <div>
                                <button onClick={() => setModal(!modal)}>Cancel</button>
                                <button onClick={() => handleDelete(workoutID)}>Delete</button> 
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}