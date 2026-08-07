import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    sheet = wb["48hr SPS "]
    
    print("=== 48hr SPS cells ===")
    # Print rows 1 to 55, columns A to X
    for row in range(1, 56):
        row_vals = [sheet.cell(row, col).value for col in range(1, 25)]
        if any(v is not None for v in row_vals):
            print(f"Row {row:02d}: {row_vals}")

if __name__ == "__main__":
    main()
