from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.templating import Jinja2Templates
import pandas as pd
import tensorflow as tf
import numpy as np

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

champions_df = pd.read_csv('static/data/champions.csv', sep=';')
tier_df = pd.read_csv('static/data/tier.csv', sep=',')
division_df = pd.read_csv('static/data/division.csv', sep=',')
championsWithBanRow_df = pd.read_csv('static/data/championsWithBanRow.csv', sep=';')
model = tf.keras.models.load_model('static/data/model_v1.keras')

dummy_championId = pd.get_dummies(champions_df['championId'], prefix='championId')
dummy_championBanId = pd.get_dummies(championsWithBanRow_df['championId'], prefix='championBan')
dummy_Position = pd.get_dummies(["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY", ], prefix='POSITION')


class Match(BaseModel):
    team_champs_1: list[str]
    team_champs_2: list[str]
    position_champs_1: list[str]
    position_champs_2: list[str]
    bans_champs_1: list[str]
    bans_champs_2: list[str]
    tier: str
    division: str


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/predict")
async def predict(match: Match):
    predict = transform_data_for_model(match)

    return {"data": predict}


def transform_data_for_model(match: Match):
    level_champ_1 = [13130, 13130, 13130, 13130, 13130]
    level_champ_2 = [13130, 13130, 13130, 13130, 13130]
    team_champs_1_id = []
    team_champs_2_id = []
    bans_champs_1_id = []
    bans_champs_2_id = []

    for champ in match.team_champs_1:
        team_champs_1_id.append(champions_df[champions_df['championName'] == champ]['championId'].values[0])
    for champ in match.team_champs_2:
        team_champs_2_id.append(champions_df[champions_df['championName'] == champ]['championId'].values[0])
    for champ in match.bans_champs_1:
        bans_champs_1_id.append(champions_df[champions_df['championName'] == champ]['championId'].values[0])
    for champ in match.bans_champs_2:
        bans_champs_2_id.append(champions_df[champions_df['championName'] == champ]['championId'].values[0])

    team_1_champs_dummies = []
    team_2_champs_dummies = []
    team_1_ban_champs_dummies = []
    team_2_ban_champs_dummies = []
    team_1_position_dummies = []
    team_2_position_dummies = []

    for i in team_champs_1_id:
        team_1_champs_dummies.append(dummy_championId[f'championId_{i}'].values)
    for i in team_champs_2_id:
        team_2_champs_dummies.append(dummy_championId[f'championId_{i}'].values)
    for i in bans_champs_1_id:
        team_1_ban_champs_dummies.append(dummy_championBanId[f'championBan_{i}'].values)
    for i in bans_champs_2_id:
        team_2_ban_champs_dummies.append(dummy_championBanId[f'championBan_{i}'].values)
    for i in match.position_champs_1:
        team_1_position_dummies.append(dummy_Position[f'POSITION_{i.upper()}'].values)
    for i in match.position_champs_2:
        team_2_position_dummies.append(dummy_Position[f'POSITION_{i.upper()}'].values)

    match_champs_id = team_1_champs_dummies + team_2_champs_dummies
    match_bans_id = team_1_ban_champs_dummies + team_2_ban_champs_dummies
    match_position = team_1_position_dummies + team_2_position_dummies
    match_level = level_champ_1 + level_champ_2

    matrix_match = []

    for i in range(10):
        if i < 5:
            participant = [0] + [match_level[i]] + match_position[i].tolist() + match_bans_id[i].tolist() + \
                          match_champs_id[i].tolist()
        else:
            participant = [1] + [match_level[i]] + match_position[i].tolist() + match_bans_id[i].tolist() + \
                          match_champs_id[i].tolist()
        matrix_match.append(participant)
    matrix_match = np.array(matrix_match).astype('float64')
    mean_match = [0.5630336268061888,
                  30.651859945507905,
                  1.8296806819216518,
                  0.9891786262108382,
                  0.9197747473261751,
                  5.987301520595631,
                  0.6015353042942293,
                  30.376948022385186,
                  1.9444292688393463,
                  0.9677670147717006,
                  0.798680422769011,
                  5.906782094653751]
    mean_match = np.array(mean_match).astype('float64')

    matrix_match = np.expand_dims(matrix_match, axis=0)
    mean_match = np.expand_dims(mean_match, axis=0)
    predictions = model.predict([mean_match, matrix_match])
    print(predictions[0][0])
    return str(predictions[0][0])
