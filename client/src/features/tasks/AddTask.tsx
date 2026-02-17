import React, { useState, type ChangeEvent } from 'react';
import { useDispatch } from 'react-redux';
import { addTask } from './tasksSlice';
import { useNavigate } from 'react-router-dom';

const AddTask: React.FC = () => {
    const dispatch = useDispatch(); const navigate = useNavigate();

    const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [date, setDate] = useState(''); const [img, setImg] = useState<any>(null); const [isCompleted, setIsCompleted] = useState(false);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setImg(reader.result); }; reader.readAsDataURL(file); } };

    const submit = () => { if (!title || !desc || !date) return alert('Fill all fields'); dispatch(addTask({ title, desc, date, img, isCompleted } as any)); navigate("/tasks"); };

    return (

        <div> <h2>Add Task</h2> <input placeholder="Title" onChange={(e) => setTitle(e.target.value)} />


            <input placeholder="Desc" onChange={(e) => setDesc(e.target.value)} />


            <input type="date" onChange={(e) => setDate(e.target.value)} />


            <input type="file" onChange={handleImageChange} />


            <button onClick={submit}>Add Task</button> </div>);
};

export default AddTask;