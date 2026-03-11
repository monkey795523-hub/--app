const App = {
    currentMonth: new Date(),
    selectedDate: new Date(),
    
    init() {
        this.loadPage();
        this.bindEvents();
    },
    
    loadPage() {
        const path = window.location.pathname;
        if (path.includes('record.html')) {
            this.initRecord();
        } else if (path.includes('calendar.html')) {
            this.initCalendar();
        } else if (path.includes('stats.html')) {
            this.initStats();
        } else {
            this.initHome();
        }
    },
    
    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag')) {
                e.target.classList.toggle('selected');
            }
        });
    },
    
    initHome() {
        const today = new Date();
        const dateStr = this.formatDate(today);
        document.getElementById('todayDate').textContent = `${today.getMonth() + 1}/${today.getDate()}`;
        
        // 显示用户名和管理员按鈕
        const nameEl = document.getElementById('headerUserName');
        const adminBtn = document.getElementById('adminBtn');
        if (nameEl && this.displayName) nameEl.textContent = 'Hi, ' + this.displayName;
        if (adminBtn && this.isAdmin) adminBtn.style.display = 'inline-block';
        
        const record = this.getRecord(dateStr);
        if (record) {
            const score = this.calculateScore(record);
            const moodText = score >= 7 ? '开心' : score >= 4 ? '平静' : '低落';
            document.getElementById('todayMood').querySelector('.mood-value').textContent = moodText;
        }
        
        this.updateStats();
    },
    
    updateStats() {
        const records = this.getAllRecords();
        const count = Object.keys(records).length;
        
        if (count > 0) {
            let total = 0;
            let maxScore = 0;
            
            Object.values(records).forEach(record => {
                const score = this.calculateScore(record);
                total += score;
                if (score > maxScore) maxScore = score;
            });
            
            const avg = (total / count).toFixed(1);
            document.getElementById('avgMood').textContent = avg;
            document.getElementById('recordDays').textContent = count;
            document.getElementById('bestDay').textContent = maxScore.toFixed(1);
        }
    },
    
    initRecord() {
        this.recordSaved = false;
        this.formDirty = false;
        this.leaveTarget = null;
        const selectedDate = localStorage.getItem('selectedDate');
        if (selectedDate) {
            this.currentRecordDate = selectedDate;
            localStorage.removeItem('selectedDate');
        } else {
            // 如果页面重载（手机后台销毁），从备份中恢复日期
            const backup = localStorage.getItem('currentRecordDate');
            this.currentRecordDate = backup || this.formatDate(new Date());
        }
        // 始终把当前记录日期备份到 localStorage
        localStorage.setItem('currentRecordDate', this.currentRecordDate);
        
        const dateObj = new Date(this.currentRecordDate);
        document.getElementById('recordDate').textContent = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        
        const existingRecord = this.getRecord(this.currentRecordDate);
        if (existingRecord) {
            this.fillForm(existingRecord);
        }
        
        this.bindSliders();
        this.bindForm();
        this.watchFormChanges();
    },
    
    // 监听表单任意改动，标记 formDirty
    watchFormChanges() {
        const form = document.getElementById('recordForm');
        if (!form) return;
        const handler = () => { this.formDirty = true; };
        form.addEventListener('input', handler);
        form.addEventListener('change', handler);
        // 情绪标签点击单独处理（tag 点击不会触发 input/change）
        document.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', () => { this.formDirty = true; });
        });
    },
    
    bindSliders() {
        const sliders = ['mood', 'energy', 'appetite', 'motivation', 'social', 'physical'];
        sliders.forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    document.getElementById(`${id}Value`).textContent = e.target.value;
                });
            }
        });
    },
    
    bindForm() {
        const form = document.getElementById('recordForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const ok = this.doSave();
            if (ok) {
                setTimeout(() => {
                    window.location.href = 'calendar.html';
                }, 1000);
            }
        });
    },
    
    // 核心保存函数，只负责保存，不负责跳转，返回是否成功
    doSave() {
        try {
            // 从内存或 localStorage 备份中取日期，防止页面重载导致丢失
            const dateStr = this.currentRecordDate || localStorage.getItem('currentRecordDate') || this.formatDate(new Date());
            if (!dateStr) {
                alert('保存失败：日期丢失，请重新进入记录页面');
                return false;
            }
            const now = new Date();
            const symptoms = [];
            document.querySelectorAll('input[name="symptom"]:checked').forEach(cb => {
                symptoms.push(cb.value);
            });
            const emotions = [];
            document.querySelectorAll('.tag[data-type="emotion"].selected').forEach(tag => {
                emotions.push(tag.getAttribute('data-value'));
            });
            const triggers = [];
            document.querySelectorAll('.tag[data-type="trigger"].selected').forEach(tag => {
                triggers.push(tag.getAttribute('data-value'));
            });
            const impactEls = document.querySelectorAll('input[name="impact"]:checked');
            const impact = impactEls.length > 0 ? impactEls[0].value : null;
            const periodEls = document.querySelectorAll('input[name="period"]:checked');
            const period = periodEls.length > 0 ? periodEls[0].value : 'none';
            const record = {
                date: dateStr,
                timestamp: now.getTime(),
                mood: parseFloat(document.getElementById('mood').value),
                moodNote: document.getElementById('moodNote')?.value || '',
                energy: parseFloat(document.getElementById('energy').value),
                energyNote: document.getElementById('energyNote')?.value || '',
                emotions: emotions,
                emotionNote: document.getElementById('emotionNote')?.value || '',
                sleep: {
                    difficulty: parseInt(document.getElementById('sleepDifficulty').value),
                    duration: parseFloat(document.getElementById('sleepDuration').value),
                    earlyWake: document.getElementById('earlyWake').checked,
                    nightmare: document.getElementById('nightmare').checked
                },
                sleepNote: document.getElementById('sleepNote')?.value || '',
                desires: {
                    appetite: parseFloat(document.getElementById('appetite').value),
                    motivation: parseFloat(document.getElementById('motivation').value),
                    social: parseFloat(document.getElementById('social').value),
                    physical: parseFloat(document.getElementById('physical').value)
                },
                desireNote: document.getElementById('desireNote')?.value || '',
                triggers: triggers,
                triggerDesc: document.getElementById('triggerDesc').value,
                impact: impact,
                symptoms: symptoms,
                symptomNote: document.getElementById('symptomNote')?.value || '',
                coping: document.getElementById('coping').value,
                highlight: document.getElementById('highlight').value,
                weight: parseFloat(document.getElementById('weight').value) || null,
                period: period
            };
            this.setRecord(dateStr, record);
            this.currentRecordDate = dateStr;
            this.recordSaved = true;
            localStorage.removeItem('currentRecordDate');
            this.showToast('保存成功！');
            return true;
        } catch (err) {
            alert('保存出错：' + err.message);
            return false;
        }
    },
    
    // 兼容旧调用
    saveRecord() {
        const ok = this.doSave();
        if (ok) {
            setTimeout(() => { window.location.href = 'calendar.html'; }, 1000);
        }
    },
    
    fillForm(record) {
        if (record.mood !== undefined) {
            document.getElementById('mood').value = record.mood;
            document.getElementById('moodValue').textContent = record.mood;
        }
        if (record.moodNote) { const el = document.getElementById('moodNote'); if (el) el.value = record.moodNote; }
        if (record.energy !== undefined) {
            document.getElementById('energy').value = record.energy;
            document.getElementById('energyValue').textContent = record.energy;
        }
        if (record.energyNote) { const el = document.getElementById('energyNote'); if (el) el.value = record.energyNote; }
        if (record.emotions) {
            record.emotions.forEach(e => {
                const tag = document.querySelector(`.tag[data-type="emotion"][data-value="${e}"]`);
                if (tag) tag.classList.add('selected');
            });
        }
        if (record.emotionNote) { const el = document.getElementById('emotionNote'); if (el) el.value = record.emotionNote; }
        if (record.sleep) {
            if (record.sleep.difficulty !== undefined) document.getElementById('sleepDifficulty').value = record.sleep.difficulty;
            if (record.sleep.duration !== undefined) document.getElementById('sleepDuration').value = record.sleep.duration;
            if (record.sleep.earlyWake) document.getElementById('earlyWake').checked = true;
            if (record.sleep.nightmare) document.getElementById('nightmare').checked = true;
        }
        if (record.sleepNote) { const el = document.getElementById('sleepNote'); if (el) el.value = record.sleepNote; }
        if (record.desires) {
            if (record.desires.appetite !== undefined) document.getElementById('appetite').value = record.desires.appetite;
            if (record.desires.motivation !== undefined) document.getElementById('motivation').value = record.desires.motivation;
            if (record.desires.social !== undefined) document.getElementById('social').value = record.desires.social;
            if (record.desires.physical !== undefined) document.getElementById('physical').value = record.desires.physical;
        }
        if (record.desireNote) { const el = document.getElementById('desireNote'); if (el) el.value = record.desireNote; }
        if (record.triggers) {
            record.triggers.forEach(t => {
                const tag = document.querySelector(`.tag[data-value="${t}"]`);
                if (tag) tag.classList.add('selected');
            });
        }
        if (record.triggerDesc) document.getElementById('triggerDesc').value = record.triggerDesc;
        if (record.impact) {
            const impactRadio = document.querySelector(`input[name="impact"][value="${record.impact}"]`);
            if (impactRadio) impactRadio.checked = true;
        }
        if (record.symptoms) {
            record.symptoms.forEach(s => {
                const cb = document.querySelector(`input[name="symptom"][value="${s}"]`);
                if (cb) cb.checked = true;
            });
        }
        if (record.symptomNote) { const el = document.getElementById('symptomNote'); if (el) el.value = record.symptomNote; }
        if (record.coping) document.getElementById('coping').value = record.coping;
        if (record.highlight) document.getElementById('highlight').value = record.highlight;
        if (record.weight) document.getElementById('weight').value = record.weight;
        if (record.period) {
            const periodRadio = document.querySelector(`input[name="period"][value="${record.period}"]`);
            if (periodRadio) periodRadio.checked = true;
        }
        
        ['appetite', 'motivation', 'social', 'physical'].forEach(id => {
            const el = document.getElementById(`${id}Value`);
            if (el && record.desires && record.desires[id] !== undefined) {
                el.textContent = record.desires[id];
            }
        });
    },
    
    initCalendar() {
        this.renderCalendar(this.currentMonth);
        
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar(this.currentMonth);
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar(this.currentMonth);
        });
        
        this.calendarClickTimer = null;
        this.lastClickTime = 0;
    },
    
    renderCalendar(month) {
        const year = month.getFullYear();
        const m = month.getMonth();
        
        document.getElementById('monthTitle').textContent = `${year}年${m + 1}月`;
        
        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        const grid = document.getElementById('daysGrid');
        grid.innerHTML = '';
        
        for (let i = 0; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell empty';
            grid.appendChild(empty);
        }
        
        const records = this.getAllRecords();
        const today = new Date();
        
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            
            const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = records[dateStr];
            
            const numEl = document.createElement('div');
            numEl.className = 'day-number';
            numEl.textContent = day;
            cell.appendChild(numEl);
            
            if (record) {
                cell.classList.add('has-record');
                const score = this.calculateScore(record);
                
                const scoreEl = document.createElement('div');
                scoreEl.className = 'day-score';
                scoreEl.textContent = score.toFixed(0);
                cell.appendChild(scoreEl);
                
                if (score < 4) {
                    cell.classList.add('low');
                } else if (score < 7) {
                    cell.classList.add('calm');
                } else {
                    cell.classList.add('happy');
                }
                
                if (record.period === 'start' || record.period === 'during' || record.period === 'end') {
                    const dot = document.createElement('div');
                    dot.className = 'period-dot';
                    cell.appendChild(dot);
                }
            }
            
            if (day === today.getDate() && m === today.getMonth() && year === today.getFullYear()) {
                cell.classList.add('today');
            }
            
            cell.addEventListener('click', () => {
                document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                
                const now = Date.now();
                const timeDiff = now - this.lastClickTime;
                
                if (timeDiff < 300 && timeDiff > 0) {
                    clearTimeout(this.calendarClickTimer);
                    this.goToRecord(dateStr);
                    this.lastClickTime = 0;
                } else {
                    this.lastClickTime = now;
                    if (record) {
                        clearTimeout(this.calendarClickTimer);
                        this.calendarClickTimer = setTimeout(() => {}, 300);
                    }
                }
            });
            
            grid.appendChild(cell);
        }
    },
    
    showDayDetail(dateStr, record) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">${dateStr}</h3>
                <div class="modal-detail"><label>心情</label><span>${record.mood}/10</span></div>
                <div class="modal-detail"><label>精力</label><span>${record.energy}/10</span></div>
                <div class="modal-detail"><label>睡眠时长</label><span>${record.sleep?.duration || '--'}小时</span></div>
                ${record.highlight ? `<div class="modal-detail"><label>小亮点</label><span>${record.highlight}</span></div>` : ''}
                <button class="modal-close" onclick="this.closest('.modal').remove()">关闭</button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    },
    
    initStats() {
        this.currentChart = 'mood';
        this.currentDays = 7;
        this.renderChart();
        
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentChart = btn.getAttribute('data-chart');
                this.renderChart();
            });
        });
        
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDays = parseInt(btn.getAttribute('data-days'));
                this.renderChart();
            });
        });
    },
    
    renderChart() {
        const canvas = document.getElementById('waveChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const records = this.getDataForChart(this.currentDays);
        const dpr = window.devicePixelRatio || 1;
        
        // 容器可视宽度
        const scroll = document.getElementById('chartScroll');
        const containerW = scroll ? scroll.clientWidth : 320;
        const containerH = scroll ? scroll.clientHeight : 230;
        
        // 每个数据点至少 65px 宽，数据多时自动拓宽可滚动
        const pointSpacing = 65;
        const totalW = records.length > 1 ? Math.max(containerW, records.length * pointSpacing) : containerW;
        
        // 设置 css 尺寸（展示尺寸）
        canvas.style.width  = totalW + 'px';
        canvas.style.height = containerH + 'px';
        // 设置物理像素（高清修复）
        canvas.width  = totalW * dpr;
        canvas.height = containerH * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, totalW, containerH);
        
        if (records.length < 2) {
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('数据不足，请继续记录', totalW / 2, containerH / 2);
            return;
        }
        
        const paddingL = 45;
        const paddingR = 20;
        const paddingT = 30;
        const paddingB = 35;
        const chartWidth  = totalW - paddingL - paddingR;
        const chartHeight = containerH - paddingT - paddingB;
        
        const maxVal = 10;
        const minVal = 0;
        const xStep  = records.length > 1 ? chartWidth / (records.length - 1) : chartWidth;
        
        // 网格线 + Y 轴刻度
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i += 2) {
            const y = paddingT + chartHeight - (i / 10) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(paddingL, y);
            ctx.lineTo(totalW - paddingR, y);
            ctx.stroke();
            ctx.fillStyle = '#aaa';
            ctx.font = `${11 * dpr / dpr}px Arial`;
            ctx.textAlign = 'right';
            ctx.fillText(i.toString(), paddingL - 6, y + 4);
        }
        
        // 渐变填充区域
        const grad = ctx.createLinearGradient(0, paddingT, 0, paddingT + chartHeight);
        grad.addColorStop(0, 'rgba(102,126,234,0.25)');
        grad.addColorStop(1, 'rgba(102,126,234,0)');
        
        ctx.beginPath();
        records.forEach((point, i) => {
            const x = paddingL + i * xStep;
            const y = paddingT + chartHeight - ((point.value - minVal) / (maxVal - minVal)) * chartHeight;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        // 闭合到底部填充
        const lastX = paddingL + (records.length - 1) * xStep;
        ctx.lineTo(lastX, paddingT + chartHeight);
        ctx.lineTo(paddingL, paddingT + chartHeight);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        
        // 折线
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        records.forEach((point, i) => {
            const x = paddingL + i * xStep;
            const y = paddingT + chartHeight - ((point.value - minVal) / (maxVal - minVal)) * chartHeight;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // 数据点 + 标签
        records.forEach((point, i) => {
            const x = paddingL + i * xStep;
            const y = paddingT + chartHeight - ((point.value - minVal) / (maxVal - minVal)) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 数值标签
            ctx.fillStyle = '#667eea';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(point.value % 1 === 0 ? point.value : point.value.toFixed(1), x, y - 12);
            
            // 日期标签
            ctx.fillStyle = '#888';
            ctx.font = '10px Arial';
            ctx.fillText(point.date.slice(5), x, paddingT + chartHeight + 20);
        });
        
        // 统计摘要
        let sum = 0, max = -Infinity, min = Infinity;
        records.forEach(r => {
            sum += r.value;
            if (r.value > max) max = r.value;
            if (r.value < min) min = r.value;
        });
        document.getElementById('avgValue').textContent = (sum / records.length).toFixed(1);
        document.getElementById('maxValue').textContent = max.toFixed(1);
        document.getElementById('minValue').textContent = min.toFixed(1);
    },
    
    getDataForChart(days) {
        const records = this.getAllRecords();
        const now = new Date();
        const data = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = this.formatDate(date);
            
            const record = records[dateStr];
            if (record) {
                let value = 5;
                if (this.currentChart === 'mood') {
                    value = record.mood;
                } else if (this.currentChart === 'energy') {
                    value = record.energy;
                } else if (this.currentChart === 'sleep') {
                    value = record.sleep?.duration || 0;
                } else if (this.currentChart === 'weight') {
                    value = record.weight || 0;
                }
                
                if (value > 0) {
                    data.push({ date: dateStr, value: value });
                }
            }
        }
        
        return data;
    },
    
    calculateScore(record) {
        // 修复：用 !== undefined 判断，允许 0 为有效分数
        const mood = record.mood !== undefined ? record.mood : 5;
        const energy = record.energy !== undefined ? record.energy : 5;
        
        // 睡眠难度得分：0=容易(10), 1=一般(6), 2=困难(2)
        const diffScore = record.sleep?.difficulty !== undefined ?
            [10, 6, 2][record.sleep.difficulty] : 7;
        // 睡眠时长得分：7-8小时最佳，过短或过长减分
        const duration = record.sleep?.duration ?? 7;
        const durScore = duration === 0 ? 0 : Math.max(0, Math.min(10, 10 - Math.abs(duration - 7.5) * 1.2));
        const sleepScore = (diffScore + durScore) / 2;
        
        // 欲望均値：0 为有效分数
        const d = record.desires;
        const desireAvg = d ?
            ((d.appetite ?? 0) + (d.motivation ?? 0) + (d.social ?? 0) + (d.physical ?? 0)) / 4 : 5;
        
        const symptomPenalty = (record.symptoms?.length || 0) * 0.5;
        const impactBonus = record.impact === '炸' ? -2 :
                            record.impact === '沉' ? -1.5 :
                            record.impact === '僵' ? -0.5 : 0;
        
        let score = (mood + energy + sleepScore + desireAvg) / 4 - symptomPenalty + impactBonus;
        return Math.max(0, Math.min(10, score));
    },
    
    // 当前登录用户（由auth回调设置）
    currentUser: null,
    isAdmin: false,
    displayName: '',

    getStorageKey() {
        const uid = this.currentUser ? this.currentUser.uid : 'local';
        return 'moodRecords_' + uid;
    },

    getRecord(dateStr) {
        const records = JSON.parse(localStorage.getItem(this.getStorageKey()) || '{}');
        return records[dateStr];
    },
    
    setRecord(dateStr, record) {
        const records = JSON.parse(localStorage.getItem(this.getStorageKey()) || '{}');
        records[dateStr] = record;
        localStorage.setItem(this.getStorageKey(), JSON.stringify(records));
        // 同步到 Firestore
        if (this.currentUser && typeof db !== 'undefined') {
            db.collection('users').doc(this.currentUser.uid)
              .collection('records').doc(dateStr)
              .set(record)
              .catch(e => console.error('Firestore写入失败:', e));
        }
    },
    
    getAllRecords() {
        return JSON.parse(localStorage.getItem(this.getStorageKey()) || '{}');
    },

    // 从 Firestore 同步所有记录到 localStorage
    async syncFromFirestore() {
        if (!this.currentUser || typeof db === 'undefined') return;
        try {
            const snapshot = await db.collection('users').doc(this.currentUser.uid)
                .collection('records').get();
            const records = {};
            snapshot.forEach(doc => { records[doc.id] = doc.data(); });
            localStorage.setItem(this.getStorageKey(), JSON.stringify(records));
            localStorage.setItem('lastSync_' + this.currentUser.uid, Date.now().toString());
        } catch(e) {
            console.error('Firestore同步失败:', e);
        }
    },

    logout() {
        if (typeof auth !== 'undefined') {
            auth.signOut().then(() => { window.location.href = 'login.html'; });
        }
    },
    
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        toast.classList.add('show');
        setTimeout(() => toast.remove(), 2000);
    },
    
    // 保存并留在当前页（顶部保存按鈕）
    saveAndStay() {
        this.doSave();
    },
    
    // 切换前后日期（offset: -1 上一天 / +1 下一天）
    navigateDate(offset) {
        const base = this.currentRecordDate || this.formatDate(new Date());
        const dateObj = new Date(base + 'T12:00:00');
        dateObj.setDate(dateObj.getDate() + offset);
        const newDate = this.formatDate(dateObj);
        this._pendingNavDate = newDate;
        
        if (this.formDirty && !this.recordSaved) {
            this.leaveTarget = '__dateNav__';
            const modal = document.getElementById('leaveModal');
            if (modal) { modal.style.display = 'flex'; }
            else { this.goToRecord(newDate); }
        } else {
            this.goToRecord(newDate);
        }
    },
    
    goToRecord(dateStr) {
        localStorage.setItem('selectedDate', dateStr);
        window.location.href = 'record.html';
    },
    
    confirmLeave(url) {
        this.leaveTarget = url;
        // 已保存或表单未改动，直接跳转
        if (this.recordSaved || !this.formDirty) {
            window.location.href = url;
            return;
        }
        const modal = document.getElementById('leaveModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            window.location.href = url;
        }
    },
    
    leaveWithSave() {
        const ok = this.doSave();
        const target = this.leaveTarget;
        if (ok) {
            setTimeout(() => {
                if (target === '__dateNav__') {
                    this.goToRecord(this._pendingNavDate);
                } else {
                    window.location.href = target || 'calendar.html';
                }
            }, 1000);
        }
    },
        
    leaveWithoutSave() {
        const target = this.leaveTarget;
        if (target === '__dateNav__') {
            this.goToRecord(this._pendingNavDate);
        } else {
            window.location.href = target || 'calendar.html';
        }
    },
};

// Firebase 身份验证 + 初始化
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
        const path = window.location.pathname;
        const isLoginPage = path.includes('login.html');
        const isAdminPage = path.includes('admin.html');

        if (!user) {
            if (!isLoginPage) window.location.href = 'login.html';
            return;
        }

        // 设置当前用户
        App.currentUser = user;

        // 读取用户信息
        try {
            const profileDoc = await db.collection('userList').doc(user.uid).get();
            if (profileDoc.exists) {
                App.isAdmin = profileDoc.data().isAdmin === true;
                App.displayName = profileDoc.data().displayName || user.email;
            }
        } catch(e) { console.error('读取用户信息失败', e); }

        // 首次登录自动从 Firestore 同步数据
        const lastSync = localStorage.getItem('lastSync_' + user.uid);
        if (!lastSync) {
            await App.syncFromFirestore();
        }

        if (!isLoginPage) {
            App.init();
        }
    });
} else {
    // 如果没有 Firebase，直接初始化（本地调试用）
    App.init();
}

// 修复手机浏览器 bfcache 问题：页面从缓存恢复时重新初始化
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        App.loadPage();
    }
});