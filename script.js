// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];

// 캐릭터별 세이브 키 생성 함수
function getSaveKey(charName) {
    return `game_save_${charName}`;
}

async function loadCharacterList() {
    const spinner = document.getElementById('loading-spinner');
    const listDiv = document.getElementById('character-list');

    try {
        const response = await fetch(appsScriptUrl);
        const characters = await response.json();
        
        listDiv.innerHTML = '';

        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'character-item';
            
            // 프로필 사진 추가
            const imgHtml = char.photo 
                ? `<img src="${char.photo}" class="profile-img">` 
                : `<div class="profile-placeholder"></div>`;
            
            item.innerHTML = `
                <div class="profile-group">
                    ${imgHtml}
                    <span>${char.name}</span>
                </div>
                <span class="arrow">〉</span>
            `;
            
            item.onclick = () => startChat(char.name, char.gid);
            listDiv.appendChild(item);
        });

        // 로딩 숨기고 목록 표시
        spinner.style.display = 'none';
        listDiv.style.display = 'block';

    } catch (e) {
        spinner.innerHTML = "<p>목록을 불러오지 못했습니다.</p>";
        console.error(e);
    }
}

// 1. 메시지 추가 시 저장 로직 추가
function addMessage(text, sender, charName, isLoadingSave = false) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // 세이브 데이터를 불러오는 중이 아닐 때만 저장
    if (!isLoadingSave && charName) {
        saveCurrentProgress(charName, text, sender);
    }
}

// 2. 현재 진행 상황을 로컬 저장소에 저장
function saveCurrentProgress(charName, text, sender) {
    let saveData = JSON.parse(localStorage.getItem(getSaveKey(charName))) || { messages: [], lastSceneId: "1" };
    saveData.messages.push({ text, sender });
    localStorage.setItem(getSaveKey(charName), JSON.stringify(saveData));
}

// 3. 마지막 장면 ID 저장 함수 (장면 전환 시 호출)
function saveLastScene(charName, sceneId) {
    let saveData = JSON.parse(localStorage.getItem(getSaveKey(charName))) || { messages: [], lastSceneId: "1" };
    saveData.lastSceneId = sceneId;
    localStorage.setItem(getSaveKey(charName), JSON.stringify(saveData));
}

// 4. 대화 시작 시 세이브 데이터 확인 및 로드
function startChat(name, gid) {
    document.getElementById('header-name').innerText = name;
    document.getElementById('list-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    
    // 화면 비우기
    document.getElementById('chat-window').innerHTML = '';
    document.getElementById('options').innerHTML = '';
    
    // 1. 시트 데이터를 먼저 불러온 뒤
    loadStory(`${baseSheetUrl}${gid}`).then(() => {
        // 2. 해당 캐릭터의 세이브 데이터 확인
        const saved = localStorage.getItem(getSaveKey(name));
        if (saved) {
            const parsed = JSON.parse(saved);
            // 과거 메시지 복구 (저장 안 함 옵션 true)
            parsed.messages.forEach(m => addMessage(m.text, m.sender, name, true));
            // 마지막 장면부터 이어서 시작
            playScene(parsed.lastSceneId, name);
        } else {
            // 세이브 없으면 1번부터 시작
            if (storyData["1"]) playScene("1", name);
        }
    });
}

// 5. playScene 수정 (현재 캐릭터 이름을 인자로 전달)
async function playScene(sceneId, charName) {
    const scene = storyData[sceneId];
    if (!scene) return;

    saveLastScene(charName, sceneId); // 현재 장면 ID 저장

    const typing = showTyping();
    setTimeout(() => {
        if(typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(scene.text, 'bot', charName);
        showOptions(sceneId, charName);
    }, 1000);
}

// 시트 데이터 로드
async function loadStory(fullUrl) {
    try {
        const response = await fetch(fullUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== "");
        
        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            const id = parseInt(cols[0]);
            
            if (!isNaN(id)) {
                const scene = { 
                    text: cols[1], 
                    options: [], 
                    autoNext: cols[3],
                    triggerOpt: cols[12], 
                    chanceNext: cols[13]
                };
                for (let i = 4; i <= 9; i += 2) { 
                    if (cols[i]) {
                        scene.options.push({ index: ((i-4) / 2 + 1).toString(), label: cols[i], next: cols[i+1] }); 
                    }
                }
                if (id < 0) {
                    historyData.push({ id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot' });
                } else {
                    storyData[id.toString()] = scene;
                }
            }
        });

        historyData.sort((a, b) => a.id - b.id);
        historyData.forEach(h => addMessage(h.text, h.sender));
        if (storyData["1"]) playScene("1");
    } catch (e) { console.error("데이터 로드 실패:", e); }
}

// 타이핑 중...
function showTyping() {
    const chatWin = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWin.appendChild(typingDiv);
    chatWin.scrollTop = chatWin.scrollHeight;
    return typingDiv;
}

// 장면 실행
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

// 옵션 표시
function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    
    if (!scene || !scene.options || scene.options.length === 0) {
        if (scene.autoNext) setTimeout(() => playScene(scene.autoNext), 800);
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
                    let nextId = opt.next;
                    if (scene.triggerOpt === opt.index && scene.chanceNext) {
                        nextId = getGachaResult(scene.chanceNext, opt.next);
                    }
                    if (storyData[nextId]) playScene(nextId);
                }, 1000);
            }, 500);
        };
        optionsElement.appendChild(button);
    });
}

// 확률 계산
function getGachaResult(chanceString, defaultNext) {
    if (!chanceString || !chanceString.includes(':')) return defaultNext;
    const pools = chanceString.split(',').map(p => p.trim());
    const dice = Math.random() * 100;
    let cumulativeProbability = 0;
    for (let pool of pools) {
        const [id, prob] = pool.split(':');
        cumulativeProbability += parseFloat(prob);
        if (dice <= cumulativeProbability) return id.trim();
    }
    return defaultNext;
}

// 뒤로가기 버튼
document.getElementById('back-btn').onclick = () => {
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('list-page').style.display = 'block';
};

// 시작 시 목록 로드
window.onload = loadCharacterList;




