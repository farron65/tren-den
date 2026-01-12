import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";

import "./history.css";

interface Workout {
    id: string,
    workout_name: string,
    date: Date
}

export default function WorkoutsHistory() {

    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
        <div className="page app">
            <header className="header">
            <h1>WORKOUT LOG</h1>
            
            <div className="icon-row">
                <span className="icon bench" />
                <span className="icon squat" />
                <span className="icon deadlift" />
                <span className="icon dumbbell" />
            </div>

            </header>

            <section className="history">
            {workouts.map((workout) => (
                <div key={workout.id} className="workout-card">
                <Link
                    to={`/workouts/${workout.id}`}
                    className="workout-main"
                >
                    <span className="workout-name">
                    {workout.workout_name}
                    </span>
                    <span className="workout-date">
                    {getWorkoutDate(workout.date)}
                    </span>
                </Link>

                <button
                    className="more-btn"
                    onClick={() =>
                    setOpenMenuId(
                        openMenuId === workout.id ? null : workout.id
                    )
                    }
                >
                    ⋮
                </button>

                {openMenuId === workout.id && (
                    <button
                    className="delete-btn"
                    onClick={() =>
                        toggleModal(workout.workout_name, workout.id)
                    }
                    >
                    DELETE
                    </button>
                )}
                </div>
            ))}
            </section>

            {modal && (
            <div className="modal">
                <div className="overlay" onClick={() => setModal(false)}>
                    <div
                        className="modal-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>DELETE WORKOUT '{modalText}' ?</h3>
                        <p>This action is permanent.</p>

                        <div className="modal-actions">
                        <button onClick={() => setModal(false)}>
                            CANCEL
                        </button>
                        <button
                            className="danger"
                            onClick={() => handleDelete(workoutID)}
                        >
                            DELETE
                        </button>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}