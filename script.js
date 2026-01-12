const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};
let historyData = [];

// 확률 가챠를 계산하는 새로운 함수
function getGachaResult(chanceString) {
    // 예: "101:20, 102:30, 103:50" -> ["101:20", "102:30", "103:50"]
    const pools = chanceString.split(',').map(p => p.trim());
    const dice = Math.random() * 100;
    let cumulativeProbability = 0;

    for (let pool of pools) {
        const [nextId, probability] = pool.split(':');
        cumulativeProbability += parseFloat(probability);
        
        if (dice <= cumulativeProbability) {
            return nextId; // 당첨된 ID 반환
        }
    }
    return null; // 확률 합이 100이 아니거나 오류 시
}

function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    
    let cleanText = text.replace(/\\n/g, '<br>');
    msgDiv.innerHTML = cleanText;
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTyping() {
    const chatWindow = document.getElementById('typing-indicator') ? document.getElementById('typing-indicator') : null;
    if (chatWindow) return chatWindow;

    const chatWin = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWin.appendChild(typingDiv);
    chatWin.scrollTop = chatWin.scrollHeight;
    return typingDiv;
}

async function playScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    const typing = showTyping();
    setTimeout(() => {
        if(typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(scene.text, 'bot');
        showOptions(sceneId);
    }, 1000);
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    
    // 선택지가 하나도 없으면 자동 다음 단계로 (D열의 ID 사용)
    if (!scene || !scene.options || scene.options.length === 0) {
        if (scene.autoNext) {
            setTimeout(() => playScene(scene.autoNext), 800);
        }
        return;
    }

    scene.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt.label;
        button.className = 'option-btn';
        button.onclick = () => {
    addMessage(opt.label, 'me');
    optionsElement.innerHTML = '';
            
            setTimeout(() => {
        const typing = showTyping();
        setTimeout(() => {
            if(typing.parentNode) typing.parentNode.removeChild(typing);
            
            let nextId;
            // 만약 현재 선택지가 확률 이벤트를 트리거한다면 (triggerOpt와 일치)
            if (scene.triggerOpt === opt.index && scene.chanceNext) {
                // 가챠 로직 실행
                const gachaId = getGachaResult(scene.chanceNext);
                nextId = gachaId ? gachaId : opt.next;
            } else {
                nextId = opt.next;
            }

            if (storyData[nextId]) playScene(nextId);
        }, 1000);
    }, 500);
};
        };
        optionsElement.appendChild(button);
    });
}

async function loadStory() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== "");
        
        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            const id = parseInt(cols[0]);
            
            if (!isNaN(id)) {
                const scene = { 
                    text: cols[1], 
                    options: [], 
                    autoNext: cols[3],    // D열: 자동 이동할 ID
                    triggerOpt: cols[12], 
                    chanceNext: cols[13], 
                    chanceRate: parseFloat(cols[14]) || 0
                };
                
                // ★ 수정된 부분: 선택지는 E열(인덱스 4)부터 가져옵니다 ★
                // E(4)-F(5), G(6)-H(7), I(8)-J(9) 순서
                for (let i = 4; i <= 9; i += 2) { 
                    if (cols[i]) {
                        scene.options.push({ 
                            index: ((i-2) / 2).toString(), 
                            label: cols[i], 
                            next: cols[i+1] 
                        }); 
                    }
                }

                if (id < 0) {
                    // C열(인덱스 2)이 me면 내가 보낸 것
                    historyData.push({ id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot' });
                } else {
                    storyData[id.toString()] = scene;
                }
            }
        });

        historyData.sort((a, b) => a.id - b.id);
        historyData.forEach(h => addMessage(h.text, h.sender));

        if (storyData["1"]) { playScene("1"); }
    } catch (e) { console.error("Error:", e); }
}


loadStory();

