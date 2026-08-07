import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["24hr SPS"]
    
    print("=== 24hr SPS ARF table (rows 30 to 40, cols M to O) ===")
    for r in range(30, 41):
        row_vals = [ws.cell(r, c).value for c in range(13, 16)]
        if any(v is not None for v in row_vals):
            print(f"Row {r:02d}: {row_vals}")

if __name__ == "__main__":
    main()
