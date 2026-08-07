import openpyxl

def inspect_sheet(wb, name):
    print(f"\n=== Sheet {name} ===")
    sheet = wb[name]
    for row in range(1, 50):
        row_vals = [sheet.cell(row, col).value for col in range(1, 15)]
        if any(v is not None for v in row_vals):
            print(f"Row {row:02d}: {row_vals}")

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    inspect_sheet(wb, "Sheet3")
    inspect_sheet(wb, "PMP 12hr Bell depth")

if __name__ == "__main__":
    main()
