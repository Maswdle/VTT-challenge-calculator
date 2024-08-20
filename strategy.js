// strategy.js
function strategy(currentGold, targetGold, stamina, detailed) {
    const goldNeeded = targetGold - currentGold;
    const roundsNeeded = Math.max(Math.floor(goldNeeded / 800), 0) + (goldNeeded % 800 > 0 ? 1 : 0);
    let extraGames = 0;
    let roundsCompleted = 0;
    let dailyGameCount = 0;
    let totalMinutes = 0;
    const operations = [];

    while (currentGold < targetGold) {
        if (stamina >= 20 && currentGold >= 100) {
            currentGold -= 100;
            stamina -= 20;
            currentGold += 840; // 800 gold + 20 games * 2 gold/game
            roundsCompleted++;
            operations.push({
                operation: `参加第${roundsCompleted}轮挑战赛`,
                goldBefore: currentGold - 740,
                goldAfter: currentGold,
                staminaBefore: stamina + 20,
                staminaAfter: stamina,
                timeElapsed: totalMinutes
            });
            dailyGameCount += 20;
            totalMinutes += 30;
        } else if (stamina < 20 && currentGold >= 20) {
            currentGold -= 20;
            stamina = 20;
            operations.push({
                operation: "购买体力",
                goldBefore: currentGold + 20,
                goldAfter: currentGold,
                staminaBefore: stamina,
                staminaAfter: stamina,
                timeElapsed: totalMinutes
            });
        } else {
            if (dailyGameCount < 20 && currentGold >= 2) {
                currentGold -= 2;
                currentGold += 2;
                dailyGameCount++;
                extraGames++;
                operations.push({
                    operation: `参加额外的第${extraGames}次比赛`,
                    goldBefore: currentGold - 2,
                    goldAfter: currentGold,
                    staminaBefore: stamina,
                    staminaAfter: stamina,
                    timeElapsed: totalMinutes
                });
            } else {
                if (stamina < 20) {
                    stamina = 20;
                    operations.push({
                        operation: "重置体力",
                        goldBefore: currentGold,
                        goldAfter: currentGold,
                        staminaBefore: stamina,
                        staminaAfter: stamina,
                        timeElapsed: totalMinutes
                    });
                }
                dailyGameCount = 0;
            }
        }

        if (currentGold < 100 && stamina === 20) {
            continue;
        }
    }

    return {
        totalMinutes,
        roundsCompleted,
        extraGames,
        operations
    };
}

// Function to convert the operations into an HTML table
function createTable(data) {
    let tableHtml = '<table border="1">';
    tableHtml += '<tr><th>操作</th><th>操作前金币</th><th>操作后金币</th><th>操作前体力</th><th>操作后体力</th><th>已用时间（分钟）</th></tr>';
    data.forEach(operation => {
        tableHtml += `<tr>`;
        tableHtml += `<td>${operation.operation}</td>`;
        tableHtml += `<td>${operation.goldBefore}</td>`;
        tableHtml += `<td>${operation.goldAfter}</td>`;
        tableHtml += `<td>${operation.staminaBefore}</td>`;
        tableHtml += `<td>${operation.staminaAfter}</td>`;
        tableHtml += `<td>${operation.timeElapsed}</td>`;
        tableHtml += `</tr>`;
    });
    tableHtml += '</table>';
    return tableHtml;
}

// Function to handle the calculation button click
function calculate() {
    const currentGold = parseInt(document.getElementById('currentGold').value, 10);
    const targetGold = parseInt(document.getElementById('targetGold').value, 10);
    const stamina = parseInt(document.getElementById('stamina').value, 10);

    // Check for invalid input
    if (isNaN(currentGold) || isNaN(targetGold) || isNaN(stamina) || targetGold <= currentGold) {
        document.getElementById('error').innerText = '输入无效，请确保所有输入均为数字且目标金币大于当前金币。';
        document.getElementById('results').innerHTML = '';
        return;
    }

    const result = strategy(currentGold, targetGold, stamina, true);
    document.getElementById('error').innerText = ''; // Clear any previous error message
    document.getElementById('results').innerHTML = createTable(result.operations);
}

// Initialize the page with default values
calculate();
