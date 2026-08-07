import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=False)
    ws = wb["24hr SPS"]
    
    print("=== 24hr SPS L16:M27 formulas (rows 15 to 28) ===")
    for row in range(15, 29):
        row_vals = {openpyxl.utils.get_column_letter(col): ws.cell(row, col).value for col in range(11, 14)}
        print(f"Row {row:02d}: {row_vals}")

if __name__ == "__main__":
    main()
