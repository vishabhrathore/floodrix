import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    sheet = wb["SUH"]
    
    print("=== SUH sheet cells (cols 15 to 30, rows 30 to 100) ===")
    for row in range(30, 100):
        row_vals = {openpyxl.utils.get_column_letter(col): sheet.cell(row, col).value for col in range(15, 31)}
        non_empty = {k: v for k, v in row_vals.items() if v is not None}
        if non_empty:
            print(f"Row {row:02d}: {non_empty}")

if __name__ == "__main__":
    main()
