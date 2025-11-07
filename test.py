from pprint import pprint 

n = [
    {
        "workout_name": "Lower",
        "date": "2025-10-30T12:03:36.331Z",
        "exercises": [
            {
                "exercise_name": "Hip Thrust",
                "sets": [
                    {
                        "weight": 85,
                        "reps": 8
                    },
                    {
                        "weight": 95,
                        "reps": 5
                    }
                ]
            },
            {
                "exercise_name": "Lateral Cable Raise",
                "sets": [
                    {
                        "weight": 15,
                        "reps": 8
                    },
                    {
                        "weight": 15,
                        "reps": 8
                    },
                    {
                        "weight": 15,
                        "reps": 5
                    }
                ]
            }
        ]
    },
    {
        "workout_name": "Upper",
        "date": "2025-10-31T12:03:36.331Z",
        "exercises": [
            {
                "exercise_name": "Incline Bench Press",
                "sets": [
                    {
                        "weight": 85,
                        "reps": 8
                    },
                    {
                        "weight": 95,
                        "reps": 8
                    }
                ]
            },
            {
                "exercise_name": "Chest Fly",
                "sets": [
                    {
                        "weight": 120,
                        "reps": 8
                    },
                    {
                        "weight": 125,
                        "reps": 8
                    },
                    {
                        "weight": 135,
                        "reps": 5
                    }
                ]
            }
        ]
    },
    {
        "workout_name": "Lower",
        "date": "2025-11-01T12:03:36.331Z",
        "exercises": [
            {
                "exercise_name": "Hip Thrust",
                "sets": [
                    {
                        "weight": 95,
                        "reps": 8
                    },
                    {
                        "weight": 105,
                        "reps": 5
                    }
                ]
            },
            {
                "exercise_name": "Lateral Cable Raise",
                "sets": [
                    {
                        "weight": 15,
                        "reps": 8
                    },
                    {
                        "weight": 15,
                        "reps": 8
                    },
                    {
                        "weight": 15,
                        "reps": 5
                    }
                ]
            }
        ]
    },
]

user_workouts = []

for wk in n:
    j = {}
    j["workout_name"], j["date"] = wk["workout_name"], wk["date"]
    # pprint(j)
    # break
    for ex in wk:
        j["exercises"] = wk["exercises"]

    user_workouts.append(j)

pprint(n)
print("\n\n\nORDERED WORKOUTS")
pprint(user_workouts)
