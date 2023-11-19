let bannedChampionsLeft = [];
let roleChampionsLeft = [];
let roleChampionsRight = [];
let bannedChampionsRight = [];
let selectedChampionsLeft = [];
let selectedChampionsRight = [];
let moment = 0;
let team = 0;

let currentRole = ''

function selectRole(role, teamSelected) {

    if (teamSelected === team && moment === 1) {
        currentRole = role
        let card = document.getElementById(`${role}-team-${teamSelected + 1}`)
        card.classList.add('selected')
    }
}

function leerCSV(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la solicitud de red al leer el archivo CSV');
                }
                return response.text();
            })
            .then(data => resolve(procesarCSV(data)))
            .catch(error => {
                console.error('Error al leer el archivo CSV:', error);
                reject(error);
            });
    });
}

function procesarCSV(data) {
    const lineas = data.split('\r\n').filter(linea => linea.trim() !== '');
    lineas.shift();
    return lineas.map(linea => linea.split(';'));
}

function toggleBanChampion(championName) {
    if (moment === 0) {
        if (team === 0) {
            if (bannedChampionsLeft.length < 5 && !bannedChampionsLeft.includes(championName)) {
                bannedChampionsLeft.push(championName);
                updateBannedChampionsUI('banned-champions-left', bannedChampionsLeft);
                const containerSelection = document.getElementById(championName + '-selection');
                containerSelection.classList.add('banned')
            }
            if (bannedChampionsLeft.length === 5) {
                team = 1;
            }
        } else {
            if (bannedChampionsRight.length < 5 && !bannedChampionsRight.includes(championName) && !bannedChampionsLeft.includes(championName)) {
                bannedChampionsRight.push(championName);
                updateBannedChampionsUI('banned-champions-right', bannedChampionsRight);
                const containerSelection = document.getElementById(championName + '-selection');
                containerSelection.classList.add('banned')
            }
        }
        if (bannedChampionsLeft.length === 5 && bannedChampionsRight.length === 5) {
            moment = 1;
            team = 0;
        }
    }
}


function updateBannedChampionsUI(containerId, champions) {
    const container = document.getElementById(containerId);

    container.innerHTML = '';

    champions.forEach(championName => {
        const bannedChampion = document.createElement('div');
        bannedChampion.classList.add('banned-champion');

        const img = document.createElement('img');
        img.src = `/static/images/champions/${championName}.jpg`;
        img.alt = `${championName} Champion`;
        img.classList.add('champion-image');

        const name = document.createElement('p');
        name.innerHTML = championName;

        bannedChampion.appendChild(img);
        bannedChampion.appendChild(name);
        container.appendChild(bannedChampion);
    });
}

function toggleSelectChampion(championName) {
    if (moment === 1) {
        if (team === 0) {
            if (selectedChampionsLeft.length < 5 && !selectedChampionsLeft.includes(championName) && !bannedChampionsLeft.includes(championName) && !bannedChampionsRight.includes(championName)) {

                updateSelectedChampionsUI(championName);
            }
            if (selectedChampionsLeft.length === 5) {
                team = 1;
            }
        } else {
            if (selectedChampionsRight.length < 5 && !selectedChampionsRight.includes(championName) && !bannedChampionsLeft.includes(championName) && !bannedChampionsRight.includes(championName)) {

                updateSelectedChampionsUI(championName);

            }
        }
        if(selectedChampionsLeft.length === 5 && selectedChampionsRight.length === 5){
            moment = 2;
        }
    }
}

function updateSelectedChampionsUI(champion) {
    if(currentRole !== ''){
        const card = document.getElementById(`${currentRole}-team-${team + 1}`)
        const containerSelection = document.getElementById(champion + '-selection');
        card.innerHTML=''
        const img = document.createElement('img');
        const name = document.createElement('p');
        const role = document.createElement('p');
        role.innerHTML = currentRole;
        img.src = `/static/images/champions/${champion}.jpg`;
        img.alt = `${champion} Champion`;
        img.classList.add('champion-image');
        img.classList.add('selected-champion');
        name.innerHTML = champion + ' ' + currentRole;

        card.appendChild(img);
        card.appendChild(name);
        if(team === 0){
            containerSelection.classList.add('team-1-selected')
            selectedChampionsLeft.push(champion);
            roleChampionsLeft.push(currentRole);
        }else{
            containerSelection.classList.add('team-2-selected')
            selectedChampionsRight.push(champion);
            roleChampionsRight.push(currentRole);
        }
        currentRole = ''
    }
}


document.addEventListener('DOMContentLoaded', function () {
    leerCSV('/static/data/champions.csv')
        .then(names_images => {
            const images_main = document.getElementById('champions');
            names_images.forEach(champion => {
                const img = document.createElement('img');
                const name = document.createElement('p');
                const container = document.createElement('div');

                name.innerHTML = champion[1];

                img.src = `/static/images/champions/${champion[1]}.jpg`;
                img.alt = `${champion[1]} Champion`;

                img.classList.add('champion-image');

                container.classList.add('champion-container');
                container.id = champion[1] + '-selection';

                container.addEventListener('click', function () {
                    if (moment === 0) {
                        toggleBanChampion(champion[1]);
                    } else if (moment === 1) {

                        toggleSelectChampion(champion[1]);

                    }
                    if(moment===2){
                        fetch('/predict', {
                            method: 'POST',
                            body: JSON.stringify({
                                'team_champs_1': selectedChampionsLeft,
                                'team_champs_2': selectedChampionsRight,
                                'position_champs_1': roleChampionsLeft,
                                'position_champs_2': roleChampionsRight,
                                'bans_champs_1': bannedChampionsLeft,
                                'bans_champs_2': bannedChampionsRight,
                                'tier': selectedTier,
                                'division': selectedRank
                            }),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }).then(response => response.json()).then(data => {
                            data = data['data']

                            const predictShow = document.getElementById('predict');

                            predictShow.innerHTML = `<div> El resultado de la prediccion es</div> <p>${data}</p> <div>con una probabilidad de</div> <p>${data}</p><div>de ganar</div>`;

                            predictShow.style.display = 'block';
                        })
                    }

                });

                container.appendChild(img);
                container.appendChild(name);
                images_main.appendChild(container);
            });
        })
        .catch(error => console.error('Error al procesar los datos del CSV:', error));
});


let selectedRank = "GOLD"
let selectedTier = "IV";
let selectedGameVersion  = "1.20"
function selectDivision() {
    const dropdown = document.getElementById("rank-dropdown");
    selectedRank = dropdown.value;
}

function selectTier() {
    const dropdown = document.getElementById("tier-dropdown");
    selectedTier = dropdown.value;
}
function selectGameVersion() {
    const dropdown = document.getElementById("gameVersion-dropdown");
    selectedGameVersion = dropdown.value;
}
