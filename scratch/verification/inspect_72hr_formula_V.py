import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=False)
    ws = wb["72hr SPS  "]
    
    print("=== 72hr SPS V36:V47 formulas ===")
    for r in range(36, 48):
        print(f"Row {r:02d}: V={ws.cell(r, 22).value}")

if __name__ == "__main__":
    main()
