import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=False)
    ws = wb["72hr SPS  "]
    
    print("=== Search for references to Column O or loss in sheet 72hr SPS ===")
    for r in range(1, 150):
        for c in range(1, 100):
            val = ws.cell(r, c).value
            if val and isinstance(val, str) and ("O35" in val or "O$35" in val or "$O$35" in val or "O36" in val):
                print(f"Cell {openpyxl.utils.get_column_letter(c)}{r}: {val}")

if __name__ == "__main__":
    main()
