from fastapi import APIRouter

router = APIRouter()

# Пример данных (потом заменим на реальную таблицу Менделеева)
ELEMENTS = [
    {"Z": 1, "symbol": "H", "name": "Hydrogen"},
    {"Z": 2, "symbol": "He", "name": "Helium"},
]

@router.get("/")
def get_all_elements():
    return ELEMENTS

@router.get("/{Z}")
def get_element(Z: int):
    for el in ELEMENTS:
        if el["Z"] == Z:
            return el
    return {"error": "Element not found"}