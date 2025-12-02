from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from logic.wavepacket import simulate_wavepacket
import os

app = FastAPI()

# 1. Настройка прав доступа (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. --- НАДЕЖНЫЙ ПОИСК ПАПКИ FRONTEND ---
# Это тот самый блок, который найдет папку, где бы она ни была
current_dir = os.path.dirname(os.path.abspath(__file__))

# Вариант А: frontend на уровень выше (стандартная структура)
path_option_1 = os.path.join(os.path.dirname(current_dir), "frontend")
# Вариант Б: frontend рядом с main.py (бывает при копировании)
path_option_2 = os.path.join(current_dir, "frontend")

# Проверяем, какой путь настоящий
if os.path.exists(path_option_1):
    frontend_path = path_option_1
elif os.path.exists(path_option_2):
    frontend_path = path_option_2
else:
    # Если всё плохо - пишем в логи (Render Events)
    print(f"CRITICAL ERROR: Frontend folder not found!")
    print(f"Search paths tried: {path_option_1}, {path_option_2}")
    frontend_path = None

print(f"DEBUG: Using frontend path: {frontend_path}")


# 3. --- ПОДКЛЮЧЕНИЕ СТАТИКИ ---
# (Вот сюда вставляется ваш первый кусок кода)
if frontend_path and os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")


# 4. --- API ENDPOINT (Симуляция) ---
@app.get("/api/simulate")
def run_simulation(energy: float = 50.0, width: float = 2.0):
    try:
        image_data = simulate_wavepacket(energy, width)
        return {"image": image_data}
    except Exception as e:
        return {"error": str(e)}


# 5. --- ГЛАВНАЯ СТРАНИЦА ---
# (Вот сюда вставляется ваш второй кусок кода)
@app.get("/")
async def read_root():
    if not frontend_path:
        return {"error": "Frontend path not configured correctly on server"}
    
    index_file = os.path.join(frontend_path, "index.html")
    
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    # Если файла нет, возвращаем ошибку с подсказкой
    return {
        "error": "File index.html not found", 
        "looking_in": frontend_path,
        "content_of_folder": os.listdir(frontend_path) if os.path.exists(frontend_path) else "Folder does not exist"
    }