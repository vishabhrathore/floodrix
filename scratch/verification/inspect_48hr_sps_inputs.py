import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["48hr SPS "]
    
    print("=== 48hr SPS rows 1 to 15 ===")
    for r in range(1, 16):
        row_vals = [ws.cell(r, c).value for c in range(1, 10)]
        if any(v is not None for v in row_vals):
            print(f"Row {r:02d}: {row_vals}")

if __name__ == "__main__":
    main()
