// script.js 내용 전체 교체
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

async function loadStory() {
    const response = await fetch(sheetUrl);
    const data = await response.text();
    const lines = data.split("\n").filter(l => l.trim() !== ""); // 빈 줄 제거

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
        if(cols[0]) {
            storyData[cols[0]] = {
                text: cols[1],
                opt1: cols[2],
                next1: cols[3],
                chanceNext: cols[6], // 99
                chanceRate: parseFloat(cols[7]) || 0 // 30
            };
        }
    }
    showScene("1");
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
            // 테스트를 위해 확률을 100%로 강제 고정해봅니다.
            // 만약 여기서 99번으로 간다면, 로직은 성공이고 그동안 캐시 문제였던 것입니다.
            if (scene.chanceNext) {
                console.log("확률 이벤트로 이동 시도:", scene.chanceNext);
                showScene(scene.chanceNext);
            } else {
                showScene(scene.next1);
            }
        };
        optionsElement.appendChild(btn);
    }
}
loadStory();
