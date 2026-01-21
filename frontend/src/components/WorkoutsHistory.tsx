import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";

import { authenticatedFetch } from "../api/apiClient";

import "./workouthistory.css";

interface Workout {
    id: string,
    workout_name: string,
    date: Date
}

export default function WorkoutsHistory() {

    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const navigate = useNavigate();

    const [modal, setModal] = useState(false);
    const [modalText, setModalText] = useState("");
    const [workoutID, setWorkoutID] = useState("");

    useEffect(() => {
        const fetchWorkouts = async () => {
            try {
                const response = await authenticatedFetch("/workouts", "GET");
                
                if (!response.ok) {
                    return;
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

        try {
            const response = await authenticatedFetch(`/workouts/${targetID}`, "DELETE");

            if (!response.ok) return;

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
            <div className="page app empty-state">
                <header className="header">
                    <h1>WORKOUT LOGs</h1>
                    
                    <div className="icon-row muted">
                        <span className="icon bench" />
                        <span className="icon squat" />
                        <span className="icon deadlift" />
                        <span className="icon dumbbell" />
                    </div>
                </header>
                <div className="empty-card">
                    <p className="empty-title">No workouts yet</p>
                    <p className="empty-subtitle">
                        Start your first workout to begin tracking progress.
                    </p>
                    
                    <button className="start-btn" onClick={() => navigate("/create-workout")}>START WORKOUT</button>
                </div>
            </div>
        )
    }

    return (
        <div className="page app">
            <header className="header">
            <h1>WORKOUT LOGs</h1>
            
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