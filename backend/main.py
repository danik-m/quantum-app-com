from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from logic.wavepacket import simulate_wavepacket
import os

app = FastAPI()

# Настройка прав доступа (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Эндпоинт для симуляции
@app.get("/api/simulate")
def run_simulation(energy: float = 50.0, width: float = 2.0):
    image_data = simulate_wavepacket(energy, width)
    return {"image": image_data}

# Подключаем статику (frontend)
# Ищем папку frontend на уровень выше
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    print(f"ОШИБКА: Папка frontend не найдена по пути: {frontend_path}")