import React, { useState, useEffect, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { updateTask, type Task } from './tasksSlice';

interface RootState {
    tasks: {
        todos: Task[];
    };
}

const UpdateTask: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const numericId = Number(id);

    const task = useSelector((state: RootState) =>
        state.tasks.todos.find(t => t.id === numericId)
    );

    const [title, setTitle] = useState<string>('');
    const [desc, setDesc] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [img, setImg] = useState<string | null | ArrayBuffer>(null);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDesc(task.desc);
            setDate(task.date);
            setImg(task.img);
            setIsCompleted(task.isCompleted);
        }
    }, [task]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImg(reader.result);
            reader.readAsDataURL(file);
        }
    };

    if (!task) return <h2>Task not found</h2>;

    const submit = () => {
        if (!title || !desc || !date) {
            alert('Please fill all required fields');
            return;
        }
        dispatch(updateTask({ id: numericId, title, desc, date, img, isCompleted }));
        alert('Task updated successfully');
        navigate("/tasks");
    };

    return (
        <div>
            <h2>Update Task</h2>
            <form>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {img && typeof img === 'string' && <img src={img} style={{ width: "100px" }} />}
                <label>
                    Completed:
                    <input type="checkbox" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} />
                </label>
                <button type="button" onClick={submit}>Update Task</button>
            </form>
        </div>
    );
};

export default UpdateTask;