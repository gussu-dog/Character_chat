const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

async function loadStory() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== ""); 

        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            if(cols[0]) {
                const id = cols[0];
                const scene = {
                    text: cols[1],
                    options: [],
                    triggerOpt: cols[12], 
                    chanceNext: cols[13], 
                    chanceRate: parseFloat(cols[14]) || 0 
                };
                for (let i = 2; i <= 10; i += 2) {
                    if (cols[i]) {
                        scene.options.push({ index: (i / 2).toString(), label: cols[i], next: cols[i+1] });
                    }
                }
                storyData[id] = scene;
            }
        });

        // --- 여기서부터가 수정된 부분입니다 ---
        const chatWindow = document.getElementById('chat-window');
        chatWindow.innerHTML = ''; // "메시지를 불러오는 중..." 문구를 삭제합니다.

        // 첫 번째 장면(ID: 1)의 메시지를 띄웁니다.
        if (storyData["1"]) {
            addMessage(storyData["1"].text, 'bot');
            showOptions("1");
        }
        // --------------------------------------

    } catch (e) { 
        console.error("데이터 로딩 실패:", e);
        document.getElementById('chat-window').innerText = "데이터를 가져오지 못했습니다.";
    }
}

// 메시지를 채팅창에 추가하는 함수
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    
    // sender가 'me'면 노란색(오른쪽), 'bot'이면 회색(왼쪽)
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;
    
    chatWindow.appendChild(msgDiv);
    
    // 새 메시지가 오면 자동으로 스크롤을 아래로 이동
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';

    scene.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt.label;
        button.className = 'option-btn';
        button.onclick = () => {
            // 1. 내가 누른 버튼의 글자를 내 메시지로 추가
            addMessage(opt.label, 'me');
            
            // 2. 버튼들 비우기 (중복 클릭 방지)
            optionsElement.innerHTML = '';

            // 3. 약간의 시간차(0.5초)를 두고 상대방 답장 출력
            setTimeout(() => {
                const dice = Math.random() * 100;
                if (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) {
                    addMessage(storyData[scene.chanceNext].text, 'bot');
                    showOptions(scene.chanceNext);
                } else {
                    addMessage(storyData[opt.next].text, 'bot');
                    showOptions(opt.next);
                }
            }, 600);
        };
        optionsElement.appendChild(button);
    });
}

loadStory();

