// 수정한 CSV 주소입니다
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

async function loadStory() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        
        // CSV 파싱 (줄바꿈으로 나누기)
        const lines = data.split("\n").slice(1); 
        lines.forEach(line => {
            // 쉼표로 열을 나누되, 텍스트 안에 쉼표가 있을 경우를 대비한 정규식입니다
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            if(cols[0]) {
                const id = cols[0].trim().replace(/"/g, "");
                const sceneText = cols[1] ? cols[1].trim().replace(/"/g, "") : "";
                
                let options = [];
                // 선택지 열(2번 열부터 2개씩 짝지어서) 탐색
                for (let i = 2; i < cols.length; i += 2) {
                    const optText = cols[i] ? cols[i].trim().replace(/"/g, "") : "";
                    const nextId = cols[i+1] ? cols[i+1].trim().replace(/"/g, "") : null;
                    
                    if (optText && optText !== "") {
                        options.push({ text: optText, nextId: nextId });
                    }
                }

                storyData[id] = { text: sceneText, options: options };
            }
        });
        showScene("1"); 
    } catch (error) {
        console.error("로딩 에러:", error);
    }
}

function showScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) {
        console.error(sceneId + "번 장면을 찾을 수 없습니다.");
        return;
    }

    document.getElementById('text').innerText = scene.text;
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';

    scene.options.forEach(option => {
        const button = document.createElement('button');
        button.innerText = option.text;
        button.className = 'option-btn';
        button.onclick = () => showScene(option.nextId);
        optionsElement.appendChild(button);
    });
}

loadStory();