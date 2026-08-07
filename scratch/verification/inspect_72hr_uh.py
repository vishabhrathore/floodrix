import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["72hr SPS  "]
    
    print("=== 72hr SPS rows 50 to 80, columns A to J ===")
    for r in range(50, 81):
        row_vals = [ws.cell(r, c).value for c in range(1, 11)]
        if any(v is not None for v in row_vals):
            print(f"Row {r:02d}: {row_vals}")

if __name__ == "__main__":
    main()
