// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCn9ynoMkceF_4oucSsuyJk2MR63rXoL78",
  authDomain: "school-schedule-8806e.firebaseapp.com",
  databaseURL: "https://school-schedule-8806e-default-rtdb.firebaseio.com",
  projectId: "school-schedule-8806e",
  storageBucket: "school-schedule-8806e.firebasestorage.app",
  messagingSenderId: "520405731274",
  appId: "1:520405731274:web:1c7f98a459bdce3dbab133"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tasksRef = db.ref("tasks");

let rawTasks = [];
let selectedTeachers = ["全員"];

document.addEventListener("DOMContentLoaded", () => {
  // リアルタイムでデータベースを監視
  tasksRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      rawTasks = [];
    } else {
      rawTasks = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    
    // 昨日の日付以前の古いデータを自動クリーンアップ（削除）
    cleanOldTasks(rawTasks);

    renderAllTasks();
  });
});

// 今日の日付文字列を取得 (YYYY-MM-DD)
function getTodayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 翌日になったら自動削除する処理
function cleanOldTasks(tasks) {
  const todayStr = getTodayString();
  tasks.forEach(task => {
    // 予定の日付が今日より前（昨日以前）の場合、データベースから消去
    if (task.date < todayStr) {
      db.ref("tasks/" + task.id).remove();
    }
  });
}

// 先生ボタンの選択（複数選択対応）
function selectTeacher(name) {
  if (name === '全員') {
    selectedTeachers = ['全員'];
  } else {
    const allIndex = selectedTeachers.indexOf('全員');
    if (allIndex !== -1) selectedTeachers.splice(allIndex, 1);

    const index = selectedTeachers.indexOf(name);
    if (index !== -1) {
      selectedTeachers.splice(index, 1);
    } else {
      selectedTeachers.push(name);
    }

    if (selectedTeachers.length === 0) {
      selectedTeachers = ['全員'];
    }
  }
  updateTabStyles();
  renderAllTasks();
}

function updateTabStyles() {
  const buttons = document.querySelectorAll('.teacher-btn');
  buttons.forEach(btn => {
    const name = btn.innerText.replace('✓ ', '').trim();
    if (selectedTeachers.includes(name)) {
      btn.classList.add('active');
      btn.innerText = (name !== '全員' ? '✓ ' : '') + name;
    } else {
      btn.classList.remove('active');
      btn.innerText = name;
    }
  });
}

// 描画メイン処理
function renderAllTasks() {
  const upcomingList = document.getElementById("upcomingTaskList");
  const pastList = document.getElementById("pastTaskList");
  
  upcomingList.innerHTML = "";
  pastList.innerHTML = "";

  const now = new Date();
  const todayStr = getTodayString();

  // フィルター
  let filtered = rawTasks;
  if (!selectedTeachers.includes("全員")) {
    filtered = rawTasks.filter(t => selectedTeachers.includes(t.teacher));
  }

  // 「これからの予定」と「本日の終了した予定」を判定・分離
  const upcomingTasks = [];
  const pastTasks = [];

  filtered.forEach(task => {
    // 当日のみ対象（昨日以前はクリーンアップ処理で消えるため）
    if (task.date === todayStr) {
      // 終了時間（または開始時間）を過ぎているか判定
      let targetTimeStr = task.endTime || task.startTime || task.time;
      
      if (targetTimeStr) {
        const [hours, minutes] = targetTimeStr.split(':').map(Number);
        const taskTimeDate = new Date();
        taskTimeDate.setHours(hours, minutes, 0, 0);

        if (now > taskTimeDate) {
          pastTasks.push(task); // 今日の過ぎた予定
        } else {
          upcomingTasks.push(task); // 今日のこれからの予定
        }
      } else {
        upcomingTasks.push(task); // 時間指定がない場合は「これからの予定」へ
      }
    } else if (task.date > todayStr) {
      upcomingTasks.push(task); // 明日以降の未来の予定
    }
  });

  // ソート（近い順）
  upcomingTasks.sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.startTime || '00:00'));
    const dateB = new Date(b.date + ' ' + (b.startTime || '00:00'));
    return dateA - dateB;
  });

  pastTasks.sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.startTime || '00:00'));
    const dateB = new Date(b.date + ' ' + (b.startTime || '00:00'));
    return dateB - dateA;
  });

  // 描画
  if (upcomingTasks.length === 0) {
    upcomingList.innerHTML = '<div class="empty-msg">これからの予定はありません。</div>';
  } else {
    upcomingTasks.forEach(task => renderTaskItem(task, upcomingList, false));
  }

  if (pastTasks.length === 0) {
    pastList.innerHTML = '<div class="empty-msg">本日終了した予定はありません。</div>';
  } else {
    pastTasks.forEach(task => renderTaskItem(task, pastList, true));
  }
}

// 単体アイテム描画
function renderTaskItem(task, targetElement, isPast) {
  const li = document.createElement("li");
  li.className = `type-${task.type} ${isPast ? 'past-task' : ''}`;

  let timeDisplay = '';
  const start = task.startTime || task.time || '';
  const end = task.endTime || '';

  if (start && end) {
    timeDisplay = ` ${start} 〜 ${end}`;
  } else if (start) {
    timeDisplay = ` ${start}〜`;
  } else if (end) {
    timeDisplay = ` 〜${end}`;
  }

  li.innerHTML = `
    <div class="task-details">
      <div class="task-header">
        <span class="teacher-badge">${escapeHtml(task.teacher)}</span>
        <span class="type-badge">${escapeHtml(task.type)}</span>
        <span class="task-title">${escapeHtml(task.text)}</span>
      </div>
      <div class="task-meta">
        <span>📅 ${escapeHtml(task.date)}${timeDisplay}</span>
        ${isPast ? '<span class="past-badge">終了</span>' : ''}
      </div>
    </div>
  `;

  targetElement.appendChild(li);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}
