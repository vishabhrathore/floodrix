import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["24hr SPS"]
    
    print("=== 24hr SPS B53:B65 values ===")
    for r in range(53, 66):
        print(f"Row {r}: B={ws.cell(r, 2).value}")

if __name__ == "__main__":
    main()
