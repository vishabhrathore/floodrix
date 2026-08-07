import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    
    print("=== 48hr Best Order ===")
    print("G49:", wb["48hr SPS "]["G49"].value)
    print("G50:", wb["48hr SPS "]["G50"].value)
    print("G51:", wb["48hr SPS "]["G51"].value)
    
    print("\n=== 72hr Best Order ===")
    print("G49:", wb["72hr SPS  "]["G49"].value)
    print("G50:", wb["72hr SPS  "]["G50"].value)
    print("G51:", wb["72hr SPS  "]["G51"].value)

if __name__ == "__main__":
    main()
