import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=False)
    ws = wb["24hr SPS"]
    
    print("=== 24hr SPS H15:H28 formulas ===")
    for row in range(15, 29):
        print(f"Row {row:02d}: {ws.cell(row, 8).value}")

if __name__ == "__main__":
    main()
