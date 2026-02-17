import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { type Task } from './tasksSlice';

// הגדרת RootState כאן כדי למנוע שגיאות ייבוא אדומות
interface RootState {
    tasks: {
        todos: Task[];
    };
}

const TasksList: React.FC = () => {
    const list = useSelector((state: RootState) => state.tasks.todos);
    const navigate = useNavigate();

    const [titleSearch, setTitleSearch] = useState<string>("");
    const [dateSearch, setDateSearch] = useState<string>("");
    const [completedFilter, setCompletedFilter] = useState<string>("all");

    // סינון הרשימה
    const filteredList = list.filter(task => {
        const titleMatch = task.title.toLowerCase().includes(titleSearch.toLowerCase());
        const dateMatch = dateSearch === "" || task.date === dateSearch;
        const completedMatch =
            completedFilter === "all" ||
            (completedFilter === "completed" && task.isCompleted) ||
            (completedFilter === "notCompleted" && !task.isCompleted);

        return titleMatch && dateMatch && completedMatch;
    });

    return (
        <div style={{ padding: "20px" }}>
            <h2>Tasks List</h2>

            {/* כפתור הוספה בראש הדף */}
            <button 
                onClick={() => navigate("/add-task")} 
                style={{ 
                    backgroundColor: "#4CAF50", 
                    color: "white", 
                    padding: "10px 20px", 
                    marginBottom: "20px",
                    cursor: "pointer",
                    border: "none",
                    borderRadius: "5px"
                }}
            >
                + Add New Task
            </button>

            {/* פילטרים וחיפוש */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <input type="text" placeholder="חיפוש לפי כותרת" value={titleSearch} onChange={(e) => setTitleSearch(e.target.value)} />
                <input type="date" value={dateSearch} onChange={(e) => setDateSearch(e.target.value)} />
                <select value={completedFilter} onChange={(e) => setCompletedFilter(e.target.value)}>
                    <option value="all">הכול</option>
                    <option value="completed">הושלמו</option>
                    <option value="notCompleted">לא הושלמו</option>
                </select>
            </div>

            <hr />

            {/* הצגת המשימות */}
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {filteredList.map((task) => (
                    <div key={task.id} style={{ border: "1px solid black", padding: "15px", borderRadius: "8px" }}>
                        <h3>{task.title}</h3>
                        <p>{task.desc}</p>
                        <p><strong>Date:</strong> {task.date}</p>
                        
                        {/* הצגת תמונה עם בדיקת סוג (Type Check) כדי למנוע קווקווים ב-SRC */}
                        {task.img && typeof task.img === 'string' && (
                            <div style={{ margin: "10px 0" }}>
                                <img 
                                    src={task.img} 
                                    alt={task.title} 
                                    style={{ maxWidth: "150px", borderRadius: "4px" }} 
                                />
                            </div>
                        )}
                        
                        <p><strong>Status:</strong> {task.isCompleted ? "Completed" : "Not completed"}</p>
                        
                        {/* תיקון נתיב העריכה ל-edit-task כפי שמוגדר בראוטר */}
                        <button 
                            onClick={() => navigate(`/edit-task/${task.id}`)}
                            style={{ marginTop: "10px", cursor: "pointer" }}
                        >
                            Edit Task ✏️
                        </button>
                    </div>
                ))}

                {filteredList.length === 0 && <p>No tasks found.</p>}
            </div>
        </div>
    );
};

export default TasksList;