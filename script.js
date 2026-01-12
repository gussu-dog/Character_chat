const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTyping() {
    const chatWindow = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing';
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return typingDiv;
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    if (!scene || !scene.options) return;

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
                    typing.remove();
                    const dice = Math.random() * 100;
                    const nextId = (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) ? scene.chanceNext : opt.next;
                    if (storyData[nextId]) {
                        addMessage(storyData[nextId].text, 'bot');
                        showOptions(nextId);
                    }
                }, 1000);
            }, 300);
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
            if(cols[0]) {
                const id = cols[0];
                const scene = { text: cols[1], options: [], triggerOpt: cols[12], chanceNext: cols[13], chanceRate: parseFloat(cols[14]) || 0 };
                for (let i = 2; i <= 10; i += 2) { if (cols[i]) scene.options.push({ index: (i / 2).toString(), label: cols[i], next: cols[i+1] }); }
                storyData[id] = scene;
            }
        });
        if (storyData["1"]) { addMessage(storyData["1"].text, 'bot'); showOptions("1"); }
    } catch (e) { console.error("Error:", e); }
}

loadStory();
