import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=False)
    ws = wb["72hr SPS  "]
    
    print("=== 72hr SPS bell depth formulas ===")
    for r in range(8, 14):
        print(f"Row {r:02d}: {ws.cell(r, 9).value}")

if __name__ == "__main__":
    main()
