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
        let dateStr = null;
        
        const selectedDate = localStorage.getItem('selectedDate');
        if (selectedDate) {
            dateStr = selectedDate;
            localStorage.removeItem('selectedDate');
        } else {
            const today = new Date();
            dateStr = this.formatDate(today);
        }
        
        const dateObj = new Date(dateStr);
        document.getElementById('recordDate').textContent = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        
        const existingRecord = this.getRecord(dateStr);
        if (existingRecord) {
            this.fillForm(existingRecord);
        }
        
        this.bindSliders();
        this.bindForm(dateStr);
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
    
    bindForm(dateStr) {
        const form = document.getElementById('recordForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecord(dateStr);
        });
    },
    
    saveRecord(dateStr) {
        const symptoms = [];
        document.querySelectorAll('input[name="symptom"]:checked').forEach(cb => {
            symptoms.push(cb.value);
        });
        
        const triggers = [];
        document.querySelectorAll('.tag.selected').forEach(tag => {
            triggers.push(tag.getAttribute('data-value'));
        });
        
        const impactEls = document.querySelectorAll('input[name="impact"]:checked');
        const impact = impactEls.length > 0 ? impactEls[0].value : null;
        
        const periodEls = document.querySelectorAll('input[name="period"]:checked');
        const period = periodEls.length > 0 ? periodEls[0].value : 'none';
        
        const record = {
            date: dateStr,
            timestamp: today.getTime(),
            mood: parseInt(document.getElementById('mood').value),
            energy: parseInt(document.getElementById('energy').value),
            sleep: {
                difficulty: parseInt(document.getElementById('sleepDifficulty').value),
                duration: parseFloat(document.getElementById('sleepDuration').value),
                earlyWake: document.getElementById('earlyWake').checked,
                nightmare: document.getElementById('nightmare').checked
            },
            desires: {
                appetite: parseInt(document.getElementById('appetite').value),
                motivation: parseInt(document.getElementById('motivation').value),
                social: parseInt(document.getElementById('social').value),
                physical: parseInt(document.getElementById('physical').value)
            },
            triggers: triggers,
            triggerDesc: document.getElementById('triggerDesc').value,
            impact: impact,
            symptoms: symptoms,
            coping: document.getElementById('coping').value,
            highlight: document.getElementById('highlight').value,
            weight: parseFloat(document.getElementById('weight').value) || null,
            period: period
        };
        
        this.setRecord(dateStr, record);
        this.showToast('保存成功！');
        
        setTimeout(() => {
            localStorage.removeItem('selectedDate');
            window.location.href = 'index.html';
        }, 1000);
    },
    
    fillForm(record) {
        if (record.mood) document.getElementById('mood').value = record.mood;
        if (record.energy) document.getElementById('energy').value = record.energy;
        if (record.sleep) {
            if (record.sleep.difficulty !== undefined) document.getElementById('sleepDifficulty').value = record.sleep.difficulty;
            if (record.sleep.duration !== undefined) document.getElementById('sleepDuration').value = record.sleep.duration;
            if (record.sleep.earlyWake) document.getElementById('earlyWake').checked = true;
            if (record.sleep.nightmare) document.getElementById('nightmare').checked = true;
        }
        if (record.desires) {
            if (record.desires.appetite !== undefined) document.getElementById('appetite').value = record.desires.appetite;
            if (record.desires.motivation !== undefined) document.getElementById('motivation').value = record.desires.motivation;
            if (record.desires.social !== undefined) document.getElementById('social').value = record.desires.social;
            if (record.desires.physical !== undefined) document.getElementById('physical').value = record.desires.physical;
        }
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
        if (record.coping) document.getElementById('coping').value = record.coping;
        if (record.highlight) document.getElementById('highlight').value = record.highlight;
        if (record.weight) document.getElementById('weight').value = record.weight;
        if (record.period) {
            const periodRadio = document.querySelector(`input[name="period"][value="${record.period}"]`);
            if (periodRadio) periodRadio.checked = true;
        }
        
        document.getElementById('moodValue').textContent = record.mood || 5;
        document.getElementById('energyValue').textContent = record.energy || 5;
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
                
                let clickTimer = null;
                cell.addEventListener('click', () => {
                    clickTimer = setTimeout(() => {
                        this.showDayDetail(dateStr, record);
                    }, 250);
                });
                
                cell.addEventListener('dblclick', () => {
                    clearTimeout(clickTimer);
                    this.goToRecord(dateStr);
                });
            }
            
            if (day === today.getDate() && m === today.getMonth() && year === today.getFullYear()) {
                cell.style.border = '3px solid #667eea';
            }
            
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
        this.currentDays = 30;
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
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (records.length < 2) {
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('数据不足，请继续记录', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        
        const maxValue = 10;
        const minValue = 0;
        
        const xStep = chartWidth / (records.length - 1);
        
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        records.forEach((point, index) => {
            const x = padding + index * xStep;
            const y = padding + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        records.forEach((point, index) => {
            const x = padding + index * xStep;
            const y = padding + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#667eea';
            ctx.fill();
            
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(point.date.slice(5), x, y - 15);
        });
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i += 2) {
            const y = padding + chartHeight - (i / 10) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
            
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(i.toString(), padding - 5, y + 3);
        }
        
        let sum = 0;
        let max = -Infinity;
        let min = Infinity;
        records.forEach(r => {
            sum += r.value;
            if (r.value > max) max = r.value;
            if (r.value < min) min = r.value;
        });
        
        const avg = sum / records.length;
        document.getElementById('avgValue').textContent = avg.toFixed(1);
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
        const mood = record.mood || 5;
        const energy = record.energy || 5;
        const sleepScore = 10 - (record.sleep?.difficulty || 0) * 2;
        const desireAvg = record.desires ? 
            (record.desires.appetite + record.desires.motivation + record.desires.social + record.desires.physical) / 4 : 5;
        
        const symptomPenalty = (record.symptoms?.length || 0) * 0.5;
        const impactBonus = record.impact ? (record.impact === '炸' ? -2 : record.impact === '沉' ? -1 : 0) : 0;
        
        let score = (mood + energy + sleepScore + desireAvg) / 4 - symptomPenalty + impactBonus;
        score = Math.max(0, Math.min(10, score));
        
        return score;
    },
    
    getRecord(dateStr) {
        const records = JSON.parse(localStorage.getItem('moodRecords') || '{}');
        return records[dateStr];
    },
    
    setRecord(dateStr, record) {
        const records = JSON.parse(localStorage.getItem('moodRecords') || '{}');
        records[dateStr] = record;
        localStorage.setItem('moodRecords', JSON.stringify(records));
    },
    
    getAllRecords() {
        return JSON.parse(localStorage.getItem('moodRecords') || '{}');
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
    
    goToRecord(dateStr) {
        localStorage.setItem('selectedDate', dateStr);
        window.location.href = 'record.html';
    }
};

App.init();