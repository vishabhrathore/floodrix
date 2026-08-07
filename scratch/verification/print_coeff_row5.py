import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    sheet = wb["SUH"]
    
    print("=== SUH sheet coefficients ===")
    for row in range(3, 22):
        row_vals = [sheet.cell(row, col).value for col in range(1, 16)]
        if any(row_vals):
            print(f"Row {row:02d}: {row_vals}")

if __name__ == "__main__":
    main()
