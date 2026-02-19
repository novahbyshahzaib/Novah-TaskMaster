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

// --- CALENDAR GENERATOR ---
function generateCalendar() {
    const strip = document.getElementById('calendar-strip');
    strip.innerHTML = '';
    const currentDate = new Date();
    
    for(let i = 0; i < 14; i++) {
        let d = new Date();
        d.setDate(currentDate.getDate() + i);
        
        let dayEl = document.createElement('div');
        dayEl.className = i === 0 ? 'cal-day active' : 'cal-day';
        dayEl.innerHTML = `
            <div class="cal-name">${d.toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase()}</div>
            <div class="cal-date">${d.getDate()}</div>
        `;
        strip.appendChild(dayEl);
    }
}
generateCalendar();

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
        // CRITICAL: We attach the ID here so swiping knows which task to target
        card.setAttribute('data-id', task.id); 
        
        const dateObj = new Date(task.date + 'T' + task.time);
        const displayTime = dateObj.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        let notesHTML = task.notes ? `<div class="task-notes">${task.notes}</div>` : '';

        card.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-time">${task.alarmSet ? '🔔' : ''} ${displayTime}</span>
            </div>
            <p class="task-desc">${task.desc}</p>
            ${notesHTML}
            <div class="task-actions">
                <button class="action-btn" onclick="completeTask('${task.id}')">✔️ DONE</button>
                <button class="action-btn" onclick="deleteTask('${task.id}')">❌ DEL</button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

// --- SWIPE GESTURES ---
let touchstartX = 0;
let touchendX = 0;

listEl.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
});

listEl.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleSwipe(e.target.closest('.task-card'));
});

function handleSwipe(card) {
    if (!card) return;
    const taskId = card.getAttribute('data-id');
    const swipeDistance = touchendX - touchstartX;
    
    if (swipeDistance < -80) { // Swiped Left - Delete
        card.classList.add('swiping-left');
        setTimeout(() => window.deleteTask(taskId), 300);
    } else if (swipeDistance > 80) { // Swiped Right - Complete
        card.classList.add('swiping-right');
        setTimeout(() => window.completeTask(taskId), 300);
    }
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
    const notes = document.getElementById('task-notes').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const priority = document.getElementById('task-priority').value;
    const alarmSet = document.getElementById('task-alarm').checked;

    if (!title || !date || !time) return alert("Title, Date, and Time required!");

    const taskId = 'task_' + Date.now();
    db.tasks.push({ id: taskId, title, desc, notes, date, time, priority, alarmSet });
    saveDB();

    // TRIGGER THE NATIVE SYSTEM CLOCK ALARM
    if (alarmSet && window.AndroidBridge) {
        const [hour, minute] = time.split(':');
        window.AndroidBridge.setAlarm(taskId, title, desc, parseInt(hour, 10), parseInt(minute, 10));
    }

    modal.classList.remove('active');
    
    // Clear form
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-notes').value = '';
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
