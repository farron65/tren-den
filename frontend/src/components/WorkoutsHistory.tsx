import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";

import { authenticatedFetch } from "../api/apiClient";

import "./workouthistory.css";

interface PaginatedWorkouts {
    workouts: Workout[],
    total: number,
    skip: number,
    limit: number,
    has_more: boolean
}

interface Workout {
    id: string,
    workout_name: string,
    date: Date
}

export default function WorkoutsHistory() {

    const [paginatedWorkouts, setPaginatedWorkouts] = useState<PaginatedWorkouts>({
        workouts: [],
        total: 0,
        skip: 0,
        limit: 10,
        has_more: true
    });
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const navigate = useNavigate();

    const [modal, setModal] = useState(false);
    const [modalText, setModalText] = useState("");
    const [workoutID, setWorkoutID] = useState("");

    const toggleModal = (workout_name: string, workout_id: string, ) => {
        setWorkoutID(workout_id);
        setModalText(workout_name)
        setModal(!modal);
    }

    useEffect(() => {
        const fetchWorkouts = async () => {
            try {
                const response = await authenticatedFetch("/workouts", "GET");
                
                if (!response.ok) {
                    return;
                }

                const result = await response.json();
                setPaginatedWorkouts(result);
            }
            catch(error) {
                console.error("Request failed:", error);
                throw error;
            }
        };
        fetchWorkouts();
    }, []);

    async function handleDelete(targetID: string) {

        try {
            const response = await authenticatedFetch(`/workouts/${targetID}`, "DELETE");

            if (!response.ok) return;

            alert("Successfully deleted workout");
            const updatedWorkouts = paginatedWorkouts.workouts.filter((workout) => workout.id != targetID);
            setPaginatedWorkouts({...paginatedWorkouts, workouts: updatedWorkouts});
        }
        catch (error) {
            alert(error);
        }
        finally {
            setModal(!modal);
        }
    }

    async function loadMoreWorkouts(){
        if (!paginatedWorkouts.has_more) {
            return;
        }
        const response = await authenticatedFetch(`/workouts?skip=${paginatedWorkouts.workouts.length}&limit=${paginatedWorkouts.limit}`, "GET");
        if (!response.ok) {
            return;
        }

        const result = await response.json();
        setPaginatedWorkouts({...paginatedWorkouts, has_more: result.has_more, workouts: [...paginatedWorkouts.workouts, ...result.workouts]});
    }


    function getWorkoutDate(workoutDate: Date) {
        const dt = new Date(workoutDate)

        const month = dt.toLocaleString("default", {month: "short"});
        const day = dt.getDate();
        const year = dt.getFullYear();

        return `${month} ${day}, ${year}`; 
    }

    if (paginatedWorkouts.workouts.length == 0){
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
            {paginatedWorkouts.workouts.map((workout) => (
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
            {paginatedWorkouts.has_more && <button className="load-more-btn" onClick={loadMoreWorkouts}>LOAD MORE</button>}
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