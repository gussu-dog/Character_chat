const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

async function loadStory() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== ""); 

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            if(cols[0]) {
                storyData[cols[0]] = {
                    text: cols[1],
                    opt1: cols[2],
                    next1: cols[3],
                    // G열(6)은 돌발 이벤트 ID, H열(7)은 확률 숫자
                    chanceNext: cols[6], 
                    chanceRate: parseFloat(cols[7]) || 0 
                };
            }
        }
        showScene("1");
    } catch (e) { console.error("데이터 로딩 실패:", e); }
}

function showScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    document.getElementById('text').innerText = scene.text;
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';

    if (scene.opt1) {
        const btn = document.createElement('button');
        btn.innerText = scene.opt1;
        btn.className = 'option-btn';
        btn.onclick = () => {
            // 0~100 사이의 주사위를 굴립니다.
            const dice = Math.random() * 100;
            
            // 주사위 값이 시트에 적힌 확률(예: 30)보다 작으면 늑대 출현!
            if (scene.chanceNext && dice < scene.chanceRate) {
                showScene(scene.chanceNext);
            } else {
                showScene(scene.next1);
            }
        };
        optionsElement.appendChild(btn);
    }
}

loadStory();
