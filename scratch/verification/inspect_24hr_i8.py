import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    print("24hr SPS I8 value:", wb["24hr SPS"]["I8"].value)
    
    wb_form = openpyxl.load_workbook(path, data_only=False)
    print("24hr SPS I8 formula:", wb_form["24hr SPS"]["I8"].value)

if __name__ == "__main__":
    main()
