// Database connection
let db = JSON.parse(localStorage.getItem('novah_tasks')) || { tasks: [], completedCount: 0 };

// UI Elements
const listEl = document.getElementById('task-list');
const emptyEl = document.getElementById('empty-state');
const statDone = document.getElementById('stat-done');
const modal = document.getElementById('modal-add');

// Date init
const today = new Date().toISOString().split('T')[0];
document.getElementById('task-date').value = today;

function saveDB() {
    localStorage.setItem('novah_tasks', JSON.stringify(db));
    renderTasks();
}

function getPriorityClass(p) {
    if (p === 'high') return 'bg-red';
    if (p === 'low') return 'bg-green';
    return 'bg-yellow'; // Medium
}

function renderTasks() {
    statDone.innerText = db.completedCount;
    
    // Clear list but keep empty state hidden for now
    listEl.innerHTML = '';
    
    if (db.tasks.length === 0) {
        listEl.appendChild(emptyEl);
        emptyEl.style.display = 'block';
        return;
    }
    
    emptyEl.style.display = 'none';

    db.tasks.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    db.tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${getPriorityClass(task.priority)}`;
        
        // Format Date for display
        const dateObj = new Date(task.date + 'T' + task.time);
        const displayTime = dateObj.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        card.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-time">${task.alarmSet ? '🔔' : ''} ${displayTime}</span>
            </div>
            <p class="task-desc">${task.desc}</p>
            <div class="task-actions">
                <button class="action-btn" onclick="completeTask('${task.id}')">✔️ DONE</button>
                <button class="action-btn" onclick="deleteTask('${task.id}')">❌ DEL</button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

// Actions
window.completeTask = function(id) {
    db.tasks = db.tasks.filter(t => t.id !== id);
    db.completedCount++;
    saveDB();
};

window.deleteTask = function(id) {
    db.tasks = db.tasks.filter(t => t.id !== id);
    saveDB();
};

// Add New Task Logic
document.getElementById('btn-save-task').addEventListener('click', () => {
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const priority = document.getElementById('task-priority').value;
    const alarmSet = document.getElementById('task-alarm').checked;

    if (!title || !date || !time) {
        alert("Title, Date, and Time are required!");
        return;
    }

    const taskId = 'task_' + Date.now();

    // 1. Save to our web database
    db.tasks.push({ id: taskId, title, desc, date, time, priority, alarmSet });
    saveDB();

    // 2. THE MAGIC BRIDGE - Send to Android System
    if (alarmSet && window.AndroidBridge) {
        const exactTime = new Date(`${date}T${time}`).getTime();
        window.AndroidBridge.setAlarm(taskId, title, desc, exactTime);
    }

    modal.classList.remove('active');
    
    // Clear form
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
});

// Modal Toggles
document.getElementById('btn-add-task').addEventListener('click', () => modal.classList.add('active'));
document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));

// Battery Authorization Bridge
document.getElementById('btn-battery').addEventListener('click', () => {
    if (window.AndroidBridge) {
        window.AndroidBridge.askBatteryOptimization();
    } else {
        alert("This feature only works on the compiled Android APK!");
    }
});

// Init
renderTasks();
