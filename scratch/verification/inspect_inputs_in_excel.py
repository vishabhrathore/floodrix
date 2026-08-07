import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["24hr SPS"]
    print("=== 24hr SPS rows 1 to 30 ===")
    for r in range(1, 31):
        row_vals = [ws.cell(r, c).value for c in range(1, 10)]
        if any(v is not None for v in row_vals):
            print(f"Row {r:02d}: {row_vals}")

if __name__ == "__main__":
    main()
