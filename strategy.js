const CalculatorConfig = {
    CHALLENGE_COST: 100,
    CHALLENGE_REWARD: 840,
    STAMINA_COST: 20,
    STAMINA_BUY_COST: 20,
    STAMINA_BUY_AMOUNT: 20,
    GAME_REWARD: 2,
    GAME_COST: 2,
    ROUND_TIME_MINUTES: 30,
    MAX_ITERATIONS: 10000,
    MIN_GOLD_FOR_CHALLENGE: 100
};

const OperationType = {
    CHALLENGE: 'challenge',
    BUY_STAMINA: 'buy_stamina',
    EXTRA_GAME: 'extra_game',
    RESET_DAILY: 'reset_daily'
};

class ChallengeCalculator {
    constructor(config = CalculatorConfig) {
        this.config = config;
    }

    calculate(initialGold, targetGold, initialStamina) {
        this.validateInputs(initialGold, targetGold, initialStamina);
        
        let currentGold = initialGold;
        let currentStamina = initialStamina;
        let dailyGameCount = 0;
        let totalMinutes = 0;
        let roundsCompleted = 0;
        let extraGames = 0;
        const operations = [];
        const goldHistory = [{ time: 0, gold: currentGold, stamina: currentStamina }];
        
        let iterations = 0;
        const maxIterations = this.config.MAX_ITERATIONS;

        while (currentGold < targetGold && iterations < maxIterations) {
            iterations++;
            
            if (this.canDoChallenge(currentGold, currentStamina)) {
                const result = this.doChallenge(currentGold, currentStamina, roundsCompleted + 1, totalMinutes);
                currentGold = result.gold;
                currentStamina = result.stamina;
                roundsCompleted++;
                dailyGameCount += 20;
                totalMinutes += this.config.ROUND_TIME_MINUTES;
                operations.push(result.operation);
                goldHistory.push({ time: totalMinutes, gold: currentGold, stamina: currentStamina });
            } else if (this.needsStamina(currentStamina) && this.canBuyStamina(currentGold)) {
                const result = this.buyStamina(currentGold, currentStamina, totalMinutes);
                currentGold = result.gold;
                currentStamina = result.stamina;
                operations.push(result.operation);
            } else if (this.canDoExtraGame(currentGold, dailyGameCount)) {
                const result = this.doExtraGame(currentGold, extraGames + 1, totalMinutes);
                currentGold = result.gold;
                extraGames++;
                dailyGameCount++;
                operations.push(result.operation);
                goldHistory.push({ time: totalMinutes, gold: currentGold, stamina: currentStamina });
            } else if (dailyGameCount >= 20) {
                dailyGameCount = 0;
                if (currentStamina < this.config.STAMINA_COST) {
                    currentStamina = this.config.STAMINA_BUY_AMOUNT;
                    operations.push({
                        type: OperationType.RESET_DAILY,
                        description: '重置每日游戏计数并恢复体力',
                        goldBefore: currentGold,
                        goldAfter: currentGold,
                        staminaBefore: 0,
                        staminaAfter: currentStamina,
                        timeElapsed: totalMinutes
                    });
                }
            } else {
                break;
            }
        }

        if (iterations >= maxIterations) {
            console.warn('达到最大迭代次数，计算可能不完整');
        }

        return {
            totalMinutes,
            roundsCompleted,
            extraGames,
            operations,
            goldHistory,
            initialGold,
            targetGold,
            finalGold: currentGold,
            totalOperations: operations.length
        };
    }

    validateInputs(currentGold, targetGold, stamina) {
        if (!Number.isFinite(currentGold) || currentGold < 0) {
            throw new Error('当前金币必须是非负数');
        }
        if (!Number.isFinite(targetGold) || targetGold <= 0) {
            throw new Error('目标金币必须是正数');
        }
        if (!Number.isFinite(stamina) || stamina < 0) {
            throw new Error('体力必须是非负数');
        }
        if (targetGold <= currentGold) {
            throw new Error('目标金币必须大于当前金币');
        }
    }

    canDoChallenge(gold, stamina) {
        return gold >= this.config.MIN_GOLD_FOR_CHALLENGE && stamina >= this.config.STAMINA_COST;
    }

    needsStamina(stamina) {
        return stamina < this.config.STAMINA_COST;
    }

    canBuyStamina(gold) {
        return gold >= this.config.STAMINA_BUY_COST;
    }

    canDoExtraGame(gold, dailyGameCount) {
        return gold >= this.config.GAME_COST && dailyGameCount < 20;
    }

    doChallenge(gold, stamina, roundNumber, timeElapsed) {
        const goldBefore = gold;
        const staminaBefore = stamina;
        
        const newGold = gold - this.config.CHALLENGE_COST + this.config.CHALLENGE_REWARD;
        const newStamina = stamina - this.config.STAMINA_COST;
        
        return {
            gold: newGold,
            stamina: newStamina,
            operation: {
                type: OperationType.CHALLENGE,
                description: `参加第${roundNumber}轮挑战赛`,
                goldBefore,
                goldAfter: newGold,
                staminaBefore,
                staminaAfter: newStamina,
                timeElapsed,
                netGain: this.config.CHALLENGE_REWARD - this.config.CHALLENGE_COST
            }
        };
    }

    buyStamina(gold, stamina, timeElapsed) {
        const goldBefore = gold;
        const staminaBefore = stamina;
        
        const newGold = gold - this.config.STAMINA_BUY_COST;
        const newStamina = this.config.STAMINA_BUY_AMOUNT;
        
        return {
            gold: newGold,
            stamina: newStamina,
            operation: {
                type: OperationType.BUY_STAMINA,
                description: '购买体力',
                goldBefore,
                goldAfter: newGold,
                staminaBefore,
                staminaAfter: newStamina,
                timeElapsed,
                netGain: -this.config.STAMINA_BUY_COST
            }
        };
    }

    doExtraGame(gold, gameNumber, timeElapsed) {
        const goldBefore = gold;
        
        const newGold = gold - this.config.GAME_COST + this.config.GAME_REWARD;
        
        return {
            gold: newGold,
            operation: {
                type: OperationType.EXTRA_GAME,
                description: `参加额外比赛 #${gameNumber}`,
                goldBefore,
                goldAfter: newGold,
                staminaBefore: 0,
                staminaAfter: 0,
                timeElapsed,
                netGain: 0
            }
        };
    }
}

class InputValidator {
    constructor() {
        this.errors = new Map();
    }

    validate(id, value, rules) {
        const element = document.getElementById(id);
        const errorElement = document.getElementById(`${id}Error`);
        const errors = [];

        if (rules.required && (value === '' || value === null || value === undefined)) {
            errors.push('此字段为必填项');
        }

        const numValue = parseFloat(value);
        
        if (rules.min !== undefined && !isNaN(numValue) && numValue < rules.min) {
            errors.push(`最小值为 ${rules.min}`);
        }

        if (rules.max !== undefined && !isNaN(numValue) && numValue > rules.max) {
            errors.push(`最大值为 ${rules.max}`);
        }

        if (rules.integer && !Number.isInteger(numValue)) {
            errors.push('请输入整数');
        }

        if (rules.positive && numValue <= 0) {
            errors.push('必须大于0');
        }

        if (errors.length > 0) {
            element.classList.add('error');
            element.classList.remove('success');
            errorElement.querySelector('span').textContent = errors[0];
            errorElement.classList.add('show');
            this.errors.set(id, errors);
            return false;
        } else {
            element.classList.remove('error');
            element.classList.add('success');
            errorElement.classList.remove('show');
            this.errors.delete(id);
            return true;
        }
    }

    hasErrors() {
        return this.errors.size > 0;
    }

    clearErrors() {
        this.errors.clear();
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('error', 'success');
        });
        document.querySelectorAll('.error-message').forEach(el => {
            el.classList.remove('show');
        });
    }
}

class ResultRenderer {
    constructor() {
        this.chart = null;
    }

    render(result) {
        const container = document.getElementById('resultsContent');
        
        const html = `
            <div class="fade-in">
                ${this.renderStats(result)}
                ${this.renderChart(result)}
                ${this.renderFilterControls()}
                ${this.renderTable(result)}
            </div>
        `;
        
        container.innerHTML = html;
        
        this.initChart(result);
        this.initFilterControls(result);
    }

    renderStats(result) {
        const hours = Math.floor(result.totalMinutes / 60);
        const minutes = result.totalMinutes % 60;
        const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
        
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${timeStr}</div>
                    <div class="stat-label">预计总时间</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${result.roundsCompleted}</div>
                    <div class="stat-label">挑战赛轮数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${result.extraGames}</div>
                    <div class="stat-label">额外比赛次数</div>
                </div>
            </div>
        `;
    }

    renderChart(result) {
        return `
            <div class="chart-container">
                <canvas id="goldChart"></canvas>
            </div>
        `;
    }

    initChart(result) {
        const ctx = document.getElementById('goldChart');
        if (!ctx) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const labels = result.goldHistory.map(h => `${h.time}分钟`);
        const goldData = result.goldHistory.map(h => h.gold);

        const staminaBuyPoints = [];
        result.operations.forEach((op, index) => {
            if (op.type === OperationType.BUY_STAMINA) {
                const dataIndex = result.goldHistory.findIndex(h => h.time === op.timeElapsed);
                if (dataIndex !== -1) {
                    staminaBuyPoints.push({
                        index: dataIndex,
                        time: op.timeElapsed,
                        gold: op.goldAfter
                    });
                }
            }
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '金币数量',
                        data: goldData,
                        borderColor: '#8B9A8E',
                        backgroundColor: 'rgba(139, 154, 142, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: goldData.map((_, i) => 
                            staminaBuyPoints.some(p => p.index === i) ? 8 : 3
                        ),
                        pointHoverRadius: 8,
                        pointBackgroundColor: goldData.map((_, i) => 
                            staminaBuyPoints.some(p => p.index === i) ? '#A67C5B' : '#8B9A8E'
                        ),
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointStyle: goldData.map((_, i) => 
                            staminaBuyPoints.some(p => p.index === i) ? 'triangle' : 'circle'
                        )
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: '#5A5A5A'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(90, 90, 90, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#D4D0C8',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            afterBody: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const point = staminaBuyPoints.find(p => p.index === dataIndex);
                                if (point) {
                                    return ['📍 此时刻购买了体力'];
                                }
                                return [];
                            }
                        }
                    },
                    annotation: {
                        annotations: staminaBuyPoints.map(point => ({
                            type: 'label',
                            xValue: point.index,
                            yValue: point.gold,
                            content: '⚡',
                            font: {
                                size: 14
                            },
                            color: '#A67C5B',
                            backgroundColor: 'rgba(166, 124, 91, 0.8)',
                            borderRadius: 4,
                            yAdjust: -15
                        }))
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(212, 208, 200, 0.3)'
                        },
                        ticks: {
                            color: '#8A8A8A',
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        position: 'left',
                        grid: {
                            color: 'rgba(212, 208, 200, 0.3)'
                        },
                        ticks: {
                            color: '#8A8A8A'
                        },
                        title: {
                            display: true,
                            text: '金币',
                            color: '#5A5A5A'
                        }
                    }
                }
            }
        });
    }

    renderFilterControls() {
        return `
            <div class="filter-controls">
                <button class="filter-btn active" data-filter="all">全部</button>
                <button class="filter-btn" data-filter="challenge">挑战赛</button>
                <button class="filter-btn" data-filter="buy_stamina">购买体力</button>
                <button class="filter-btn" data-filter="extra_game">额外比赛</button>
            </div>
        `;
    }

    initFilterControls(result) {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterTable(result, btn.dataset.filter);
            });
        });
    }

    filterTable(result, filterType) {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const type = row.dataset.type;
            if (filterType === 'all' || type === filterType) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    renderTable(result) {
        const operations = result.operations;
        
        if (operations.length === 0) {
            return `
                <div class="empty-state">
                    <p>无需任何操作，当前金币已达到目标</p>
                </div>
            `;
        }

        const rows = operations.map((op, index) => {
            const badgeClass = this.getBadgeClass(op.type);
            return `
                <tr data-type="${op.type}" class="slide-in" style="animation-delay: ${index * 0.02}s">
                    <td><span class="operation-badge ${badgeClass}">${op.description}</span></td>
                    <td>${op.goldBefore.toLocaleString()}</td>
                    <td>${op.goldAfter.toLocaleString()}</td>
                    <td>${op.staminaBefore}</td>
                    <td>${op.staminaAfter}</td>
                    <td>${op.timeElapsed}分钟</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>操作</th>
                            <th>操作前金币</th>
                            <th>操作后金币</th>
                            <th>操作前体力</th>
                            <th>操作后体力</th>
                            <th>已用时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }

    getBadgeClass(type) {
        const classes = {
            [OperationType.CHALLENGE]: 'badge-challenge',
            [OperationType.BUY_STAMINA]: 'badge-stamina',
            [OperationType.EXTRA_GAME]: 'badge-game',
            [OperationType.RESET_DAILY]: 'badge-reset'
        };
        return classes[type] || 'badge-challenge';
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('resultsContent');
        if (loading) loading.classList.add('show');
        if (content) content.style.opacity = '0.5';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('resultsContent');
        if (loading) loading.classList.remove('show');
        if (content) content.style.opacity = '1';
    }

    showError(message) {
        const container = document.getElementById('resultsContent');
        container.innerHTML = `
            <div class="empty-state fade-in">
                <svg viewBox="0 0 24 24" fill="currentColor" style="color: var(--color-error)">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p style="color: var(--color-error)">${message}</p>
            </div>
        `;
    }
}

class App {
    constructor() {
        this.calculator = new ChallengeCalculator();
        this.validator = new InputValidator();
        this.renderer = new ResultRenderer();
        this.targetMode = 'target';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupInputValidation();
        this.setupTargetToggle();
    }

    bindEvents() {
        const form = document.getElementById('calculatorForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCalculate();
        });

        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateInput(input);
                if (input.id === 'increaseGold' || input.id === 'currentGold') {
                    this.updateCalculatedTarget();
                }
            });

            input.addEventListener('blur', () => {
                this.validateInput(input);
            });
        });
    }

    setupInputValidation() {
        this.validationRules = {
            currentGold: { required: true, min: 0, max: 999999, integer: true },
            targetGold: { required: true, min: 1, max: 999999, integer: true, positive: true },
            increaseGold: { required: true, min: 1, max: 999999, integer: true, positive: true },
            stamina: { required: true, min: 0, max: 999, integer: true }
        };
    }

    setupTargetToggle() {
        const toggleTargetGold = document.getElementById('toggleTargetGold');
        const toggleIncreaseGold = document.getElementById('toggleIncreaseGold');
        const targetGoldGroup = document.getElementById('targetGoldGroup');
        const increaseGoldGroup = document.getElementById('increaseGoldGroup');

        toggleTargetGold.addEventListener('click', () => {
            this.targetMode = 'target';
            toggleTargetGold.classList.add('active');
            toggleIncreaseGold.classList.remove('active');
            targetGoldGroup.style.display = 'block';
            increaseGoldGroup.style.display = 'none';
            document.getElementById('calculatedTarget').style.display = 'none';
        });

        toggleIncreaseGold.addEventListener('click', () => {
            this.targetMode = 'increase';
            toggleIncreaseGold.classList.add('active');
            toggleTargetGold.classList.remove('active');
            targetGoldGroup.style.display = 'none';
            increaseGoldGroup.style.display = 'block';
            this.updateCalculatedTarget();
        });
    }

    updateCalculatedTarget() {
        if (this.targetMode !== 'increase') return;

        const currentGold = parseInt(document.getElementById('currentGold').value, 10) || 0;
        const increaseGold = parseInt(document.getElementById('increaseGold').value, 10) || 0;
        const actualTargetGold = currentGold + increaseGold;

        const calculatedTarget = document.getElementById('calculatedTarget');
        const actualTargetGoldElement = document.getElementById('actualTargetGold');
        
        calculatedTarget.style.display = 'block';
        actualTargetGoldElement.textContent = actualTargetGold.toLocaleString();
    }

    validateInput(input) {
        const id = input.id;
        
        if (this.targetMode === 'target' && id === 'increaseGold') {
            return true;
        }
        if (this.targetMode === 'increase' && id === 'targetGold') {
            return true;
        }

        const rules = this.validationRules[id];
        if (rules) {
            return this.validator.validate(id, input.value, rules);
        }
        return true;
    }

    validateCrossField() {
        const currentGold = parseFloat(document.getElementById('currentGold').value);
        
        if (this.targetMode === 'target') {
            const targetGold = parseFloat(document.getElementById('targetGold').value);
            if (!isNaN(currentGold) && !isNaN(targetGold) && targetGold <= currentGold) {
                this.validator.validate('targetGold', document.getElementById('targetGold').value, {
                    custom: () => '目标金币必须大于当前金币'
                });
                return false;
            }
        }
        return true;
    }

    async handleCalculate() {
        this.validator.clearErrors();

        const inputs = document.querySelectorAll('.form-input');
        let isValid = true;
        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            return;
        }

        if (!this.validateCrossField()) {
            this.renderer.showError('目标金币必须大于当前金币');
            return;
        }

        const currentGold = parseInt(document.getElementById('currentGold').value, 10);
        let targetGold;
        
        if (this.targetMode === 'target') {
            targetGold = parseInt(document.getElementById('targetGold').value, 10);
        } else {
            const increaseGold = parseInt(document.getElementById('increaseGold').value, 10);
            targetGold = currentGold + increaseGold;
        }

        const stamina = parseInt(document.getElementById('stamina').value, 10);

        this.renderer.showLoading();
        this.updateProgress(0, targetGold);

        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const result = this.calculator.calculate(currentGold, targetGold, stamina);
            this.renderer.render(result);
            this.updateProgress(currentGold, targetGold);
            this.showProgressBar(currentGold, targetGold);
        } catch (error) {
            this.renderer.showError(error.message);
        } finally {
            this.renderer.hideLoading();
        }
    }

    updateProgress(current, target) {
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const progressCurrent = document.getElementById('progressCurrent');
        const progressTarget = document.getElementById('progressTarget');

        if (progressBar && progressFill && progressCurrent && progressTarget) {
            const percentage = Math.min((current / target) * 100, 100);
            progressFill.style.width = `${percentage}%`;
            progressCurrent.textContent = current.toLocaleString();
            progressTarget.textContent = target.toLocaleString();
        }
    }

    showProgressBar(current, target) {
        const progressBar = document.getElementById('progressBar');
        const progressLabel = document.getElementById('progressLabel');
        
        if (progressBar && progressLabel) {
            progressBar.style.display = 'block';
            progressLabel.style.display = 'flex';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});