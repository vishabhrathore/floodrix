import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    print("SUH!Y11 value:", wb["SUH"]["Y11"].value)
    
    wb_form = openpyxl.load_workbook(path, data_only=False)
    print("SUH!Y11 formula:", wb_form["SUH"]["Y11"].value)

if __name__ == "__main__":
    main()
